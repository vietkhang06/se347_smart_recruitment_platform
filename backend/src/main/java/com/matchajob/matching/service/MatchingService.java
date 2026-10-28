package com.matchajob.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.matching.dto.MatchingResultResponse;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.matching.repository.EmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.NoSuchElementException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MatchingService {

    private static final Logger log = LoggerFactory.getLogger(MatchingService.class);

    private final CvVersionRepository cvVersionRepository;
    private final MatchResultRepository matchResultRepository;
    private final AiWorkerClient aiWorkerClient;
    private final ObjectMapper objectMapper;
    private final MatchingResultMapper matchingResultMapper;
    private final ApplicationRepository applicationRepository;
    private final ApplicationCvSnapshotRepository applicationCvSnapshotRepository;
    private final JobRepository jobRepository;
    private final ProcessingJobRepository processingJobRepository;
    private final ProcessingJobService processingJobService;
    private final EmbeddingRepository embeddingRepository;
    private final JobEmbeddingService jobEmbeddingService;

    public MatchingService(
            CvVersionRepository cvVersionRepository,
            MatchResultRepository matchResultRepository,
            AiWorkerClient aiWorkerClient,
            ObjectMapper objectMapper,
            MatchingResultMapper matchingResultMapper,
            ApplicationRepository applicationRepository,
            ApplicationCvSnapshotRepository applicationCvSnapshotRepository,
            JobRepository jobRepository,
            ProcessingJobRepository processingJobRepository,
            ProcessingJobService processingJobService) {
        this(cvVersionRepository, matchResultRepository, aiWorkerClient, objectMapper, matchingResultMapper,
                applicationRepository, applicationCvSnapshotRepository, jobRepository, processingJobRepository,
                processingJobService, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MatchingService(
            CvVersionRepository cvVersionRepository,
            MatchResultRepository matchResultRepository,
            AiWorkerClient aiWorkerClient,
            ObjectMapper objectMapper,
            MatchingResultMapper matchingResultMapper,
            ApplicationRepository applicationRepository,
            ApplicationCvSnapshotRepository applicationCvSnapshotRepository,
            JobRepository jobRepository,
            ProcessingJobRepository processingJobRepository,
            ProcessingJobService processingJobService,
            EmbeddingRepository embeddingRepository,
            JobEmbeddingService jobEmbeddingService) {
        this.cvVersionRepository = cvVersionRepository;
        this.matchResultRepository = matchResultRepository;
        this.aiWorkerClient = aiWorkerClient;
        this.objectMapper = objectMapper;
        this.matchingResultMapper = matchingResultMapper;
        this.applicationRepository = applicationRepository;
        this.applicationCvSnapshotRepository = applicationCvSnapshotRepository;
        this.jobRepository = jobRepository;
        this.processingJobRepository = processingJobRepository;
        this.processingJobService = processingJobService;
        this.embeddingRepository = embeddingRepository;
        this.jobEmbeddingService = jobEmbeddingService;
    }

    /**
     * Evaluates the matching result from persisted application, CV snapshot and job data.
     * Client-supplied job title/requirements/CV IDs are deliberately not trusted as source data.
     */
    public MatchResult evaluateApplicationMatch(UUID applicationId) {
        return evaluateApplicationMatch(applicationId, null);
    }

    /**
     * Overload supporting background schedulers holding an active lease token.
     */
    public MatchResult evaluateApplicationMatch(UUID applicationId, String leaseToken) {
        Optional<ProcessingJob> processingJob = findMatchingProcessingJob(applicationId);
        MatchResult existing = matchResultRepository.findByApplicationId(applicationId).orElse(null);
        if (existing != null) {
            // Reconcile a stale processing row if a result was saved before a previous interruption.
            processingJob.filter(processingRecord -> !"COMPLETED".equalsIgnoreCase(processingRecord.getStatus()))
                    .ifPresent(processingRecord -> processingJobService.markJobCompleted(processingRecord.getId()));
            return existing;
        }

        if (processingJob.isPresent()) {
            ProcessingJob currentJob = processingJob.get();
            String currentStatus = currentJob.getStatus() == null ? "" : currentJob.getStatus().toUpperCase(Locale.ROOT);
            if ("COMPLETED".equals(currentStatus)) {
                throw new IllegalStateException("Matching job is completed but has no saved result.");
            }
            if ("PROCESSING".equals(currentStatus)) {
                if (leaseToken == null || !leaseToken.equals(currentJob.getLeaseToken())) {
                    throw new MatchNotReadyException("Matching is already being processed for this application.");
                }
            }
            if ("PENDING".equals(currentStatus) || "FAILED".equals(currentStatus)) {
                if (currentJob.getAttemptCount() != null && currentJob.getMaxAttempts() != null
                        && currentJob.getAttemptCount() >= currentJob.getMaxAttempts()) {
                    throw new MatchNotReadyException("The matching retry limit has been reached.");
                }
                if (currentJob.getRetryAfter() != null && currentJob.getRetryAfter().isAfter(Instant.now())) {
                    throw new MatchNotReadyException("Matching retry is waiting for its configured backoff period.");
                }
            } else if (!"PROCESSING".equals(currentStatus)) {
                throw new IllegalStateException("Matching job has an unsupported processing state.");
            }
        }

        ApplicationEntity application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found: " + applicationId));
        ApplicationCvSnapshot snapshot = applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId)
                .orElseThrow(() -> new MatchNotReadyException(
                        "CV snapshot for this application is not available yet."));
        CvVersion cv = snapshot.getCvVersion();
        if (cv == null || cv.getRawText() == null || cv.getRawText().isBlank()) {
            throw new MatchNotReadyException(
                    "CV extraction is not complete. Retry matching after the CV has been processed.");
        }

        Job job = jobRepository.findByIdAndDeletedAtIsNull(application.getJobId())
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + application.getJobId()));

        String jobRequirements = joinNonBlank(
                job.getRequirements(), job.getSummaryRequired(), job.getSummaryPreferred());
        String jobDescription = joinNonBlank(job.getDescription(), job.getSummaryIndustry());
        List<String> candidateSkills = extractCandidateSkills(cv.getParsedData());

        // When not already leased by a background worker, transition the ProcessingJob to PROCESSING
        if (leaseToken == null) {
            processingJob.ifPresent(processingRecord -> processingJobService.startJob(processingRecord.getId()));
        }
        try {
            MatchResult result = evaluateMatch(
                    application.getId(),
                    job.getId(),
                    cv.getId(),
                    job.getTitle(),
                    jobRequirements,
                    jobDescription,
                    cv.getRawText(),
                    candidateSkills);
            processingJob.ifPresent(processingRecord -> processingJobService.markJobCompleted(processingRecord.getId()));
            return result;
        } catch (RuntimeException exception) {
            processingJob.ifPresent(processingRecord -> processingJobService.markJobFailed(
                    processingRecord.getId(), safeProcessingError(exception), isRetryableMatchingError(exception)));
            throw exception;
        }
    }

    private Optional<ProcessingJob> findMatchingProcessingJob(UUID applicationId) {
        return processingJobRepository.findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "APPLICATION_MATCHING", "application", applicationId);
    }

    private String safeProcessingError(RuntimeException exception) {
        if (exception instanceof ResourceAccessException) return "AI Worker connection failed.";
        if (exception instanceof HttpStatusCodeException statusException) {
            return "AI Worker returned HTTP " + statusException.getStatusCode().value() + ".";
        }
        return "Matching evaluation failed (" + exception.getClass().getSimpleName() + ").";
    }

    private boolean isRetryableMatchingError(RuntimeException exception) {
        if (exception instanceof ResourceAccessException) return true;
        return exception instanceof HttpStatusCodeException statusException
                && statusException.getStatusCode().is5xxServerError();
    }

    /** Returns a result when complete, otherwise a stable processing-state DTO. */
    public MatchingResultResponse getMatchResultStatus(UUID applicationId) {
        ApplicationEntity application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found: " + applicationId));

        Optional<MatchResult> result = matchResultRepository.findByApplicationId(applicationId);
        if (result.isPresent()) {
            return matchingResultMapper.fromEntity(result.get());
        }

        Optional<ProcessingJob> processingJob = findMatchingProcessingJob(applicationId);
        String processingStatus = processingJob.map(ProcessingJob::getStatus)
                .filter(statusValue -> statusValue != null)
                .orElse("NOT_STARTED");
        String status = switch (processingStatus.toUpperCase(Locale.ROOT)) {
            case "PENDING" -> "PENDING";
            case "PROCESSING" -> "PROCESSING";
            case "FAILED" -> "FAILED";
            case "COMPLETED" -> "FAILED"; // A completed job without a result is inconsistent; surface a safe error state.
            default -> "NOT_STARTED";
        };
        String message = switch (status) {
            case "PENDING" -> "Matching has been queued and is waiting to be processed.";
            case "PROCESSING" -> "Matching is currently being processed.";
            case "FAILED" -> "Matching has no saved result. Check processing status and retry when available.";
            default -> "No matching result is available for this application yet.";
        };

        UUID cvVersionId = applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId)
                .map(snapshot -> snapshot.getCvVersion() == null ? null : snapshot.getCvVersion().getId())
                .orElse(null);
        return MatchingResultResponse.builder()
                .applicationId(application.getId())
                .jobId(application.getJobId())
                .cvVersionId(cvVersionId)
                .status(status)
                .overallScore(null)
                .skillsScore(null)
                .experienceScore(null)
                .criteriaScores(Map.of())
                .matchedSkills(List.of())
                .missingSkills(List.of())
                .breakdown(Map.of())
                .explanation(null)
                .processingJobId(processingJob.map(ProcessingJob::getId).orElse(null))
                .evaluatedAt(null)
                .message(message)
                .build();
    }

    public MatchingResultResponse toResponse(MatchResult result) {
        return matchingResultMapper.fromEntity(result);
    }

    private String joinNonBlank(String... parts) {
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            if (part != null && !part.isBlank()) values.add(part.trim());
        }
        return String.join("\n\n", values);
    }

    private List<String> extractCandidateSkills(String parsedData) {
        if (parsedData == null || parsedData.isBlank()) return List.of();
        try {
            var root = objectMapper.readTree(parsedData);
            var skillNode = root.path("skills");
            if (skillNode.isArray()) {
                List<String> skills = new ArrayList<>();
                skillNode.forEach(item -> {
                    String value = item.isTextual() ? item.asText() : item.path("name").asText("");
                    if (!value.isBlank()) skills.add(value.trim());
                });
                return skills.stream().distinct().toList();
            }
        } catch (Exception ex) {
            log.warn("Could not parse extracted CV skills; matching will use CV text only.");
        }
        return List.of();
    }

    public static class MatchNotReadyException extends RuntimeException {
        public MatchNotReadyException(String message) { super(message); }
    }

    public MatchResult evaluateMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription) {

        Optional<MatchResult> existing = matchResultRepository.findByApplicationId(applicationId);
        if (existing.isPresent()) {
            log.info("Match result already exists for application: {}", applicationId);
            return existing.get();
        }

        CvVersion cv = cvVersionRepository.findById(cvVersionId)
                .orElseThrow(() -> new IllegalArgumentException("CvVersion not found: " + cvVersionId));

        String cvText = cv.getRawText();
        java.util.List<String> skills = new java.util.ArrayList<>();
        if (cv.getParsedData() != null) {
            try {
                var jsonNode = objectMapper.readTree(cv.getParsedData());
                if (jsonNode.has("skills") && jsonNode.get("skills").isArray()) {
                    for (var item : jsonNode.get("skills")) {
                        skills.add(item.asText());
                    }
                }
            } catch (Exception ignored) {
            }
        }

        return evaluateMatch(applicationId, jobId, cvVersionId, jobTitle, jobRequirements,
                jobDescription, cvText, skills);
    }

    private MatchResult evaluateMatch(
            UUID applicationId, UUID jobId, UUID cvVersionId, String jobTitle,
            String jobRequirements, String jobDescription, String cvText, List<String> skills) {
        if (jobId == null) {
            throw new IllegalArgumentException("Job ID is required for matching.");
        }
        if (cvText == null || cvText.isBlank()) {
            throw new MatchNotReadyException("CV text is not ready for matching.");
        }
        MatchScoreRequest request = MatchScoreRequest.builder()
                .jobId(jobId.toString())
                .jobTitle(jobTitle)
                .jobDescription(jobDescription)
                .jobRequirements(jobRequirements)
                .cvText(cvText)
                .candidateSkills(skills)
                .build();

        // Never hold a database transaction while calling the AI Worker.
        MatchScoreResponse scoreResponse = aiWorkerClient.calculateMatchScore(request);
        validateScoreResponse(scoreResponse);

        // Integrate semantic vector similarity with rule-based score
        scoreResponse = integrateSemanticSimilarity(jobId, cvVersionId, scoreResponse);
        validateScoreResponse(scoreResponse);

        return saveMatchResultTransaction(applicationId, jobId, cvVersionId, scoreResponse);
    }

    public MatchScoreResponse integrateSemanticSimilarity(UUID jobId, UUID cvVersionId, MatchScoreResponse baseResponse) {
        if (baseResponse == null) {
            return null;
        }
        if (embeddingRepository == null) {
            return baseResponse;
        }

        Optional<Double> distanceOpt = Optional.empty();
        try {
            // Ensure JD embedding exists if possible
            if (jobEmbeddingService != null && !embeddingRepository.hasEmbedding("job", jobId)) {
                jobRepository.findById(jobId).ifPresent(jobEmbeddingService::generateAndSaveJobEmbedding);
            }
            distanceOpt = embeddingRepository.calculateCosineDistance("cv_version", cvVersionId, "job", jobId);
        } catch (Exception ex) {
            log.warn("Vector cosine distance query failed for cv {} and job {}: {}", cvVersionId, jobId, ex.getMessage());
        }

        Map<String, Object> breakdown = new java.util.LinkedHashMap<>();
        if (baseResponse.getBreakdown() != null) {
            breakdown.putAll(baseResponse.getBreakdown());
        }

        if (distanceOpt.isEmpty()) {
            // FALLBACK POLICY:
            // When vector embedding is unavailable, fall back cleanly to rule-based score.
            // Do not invent a misleading 0 or arbitrary number.
            breakdown.put("scoring_mode", "rule_based_fallback");
            breakdown.put("semantic_similarity", null);
            breakdown.put("semantic_score", null);
            breakdown.put("rule_score", baseResponse.getOverallScore());

            return MatchScoreResponse.builder()
                    .overallScore(baseResponse.getOverallScore())
                    .skillsScore(baseResponse.getSkillsScore())
                    .experienceScore(baseResponse.getExperienceScore())
                    .breakdown(breakdown)
                    .rationale(baseResponse.getRationale())
                    .build();
        }

        double distance = distanceOpt.get();
        double semanticScore = EmbeddingRepository.normalizeCosineDistance(distance);

        // Implementation default weights: 60% rule-based score, 40% semantic similarity
        double ruleWeight = 0.60;
        double semanticWeight = 0.40;

        int ruleScore = baseResponse.getOverallScore();
        int hybridOverallScore = (int) Math.round((ruleWeight * ruleScore) + (semanticWeight * semanticScore));
        hybridOverallScore = Math.max(0, Math.min(100, hybridOverallScore));

        breakdown.put("scoring_mode", "hybrid");
        breakdown.put("rule_score", ruleScore);
        breakdown.put("rule_weight", ruleWeight);
        breakdown.put("semantic_score", (int) Math.round(semanticScore));
        breakdown.put("semantic_weight", semanticWeight);
        breakdown.put("semantic_similarity", Math.round(semanticScore * 10.0) / 10.0);
        breakdown.put("cosine_distance", Math.round(distance * 10000.0) / 10000.0);

        String rationale = baseResponse.getRationale();
        String semanticNote = String.format(Locale.ROOT,
                " (Hybrid: rule %d%% [%d%% wt], semantic %d%% [%d%% wt] -> overall %d%%)",
                ruleScore, (int)(ruleWeight * 100), (int) Math.round(semanticScore), (int)(semanticWeight * 100), hybridOverallScore);
        String updatedRationale = (rationale != null && !rationale.isBlank()) ? (rationale + semanticNote) : semanticNote.trim();

        return MatchScoreResponse.builder()
                .overallScore(hybridOverallScore)
                .skillsScore(baseResponse.getSkillsScore())
                .experienceScore(baseResponse.getExperienceScore())
                .breakdown(breakdown)
                .rationale(updatedRationale)
                .build();
    }

    @Transactional
    public MatchResult saveMatchResultTransaction(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            MatchScoreResponse scoreResponse) {

        validateScoreResponse(scoreResponse);
        String breakdownJson = matchingResultMapper.serializeBreakdown(scoreResponse);

        MatchResult result = MatchResult.builder()
                .applicationId(applicationId)
                .jobId(java.util.Objects.requireNonNull(jobId, "Job ID is required for matching"))
                .cvVersionId(cvVersionId)
                .overallScore(scoreResponse.getOverallScore().shortValue())
                .skillsScore(scoreResponse.getSkillsScore() != null ? scoreResponse.getSkillsScore().shortValue() : null)
                .experienceScore(scoreResponse.getExperienceScore() != null ? scoreResponse.getExperienceScore().shortValue() : null)
                .breakdown(breakdownJson)
                .rationale(scoreResponse.getRationale())
                .createdAt(Instant.now())
                .build();

        return matchResultRepository.save(result);
    }

    private void validateScoreResponse(MatchScoreResponse response) {
        if (response == null || response.getOverallScore() == null
                || response.getOverallScore() < 0 || response.getOverallScore() > 100) {
            throw new IllegalStateException("AI Worker returned an invalid overall matching score.");
        }
        if (response.getSkillsScore() != null
                && (response.getSkillsScore() < 0 || response.getSkillsScore() > 100)) {
            throw new IllegalStateException("AI Worker returned an invalid skills score.");
        }
        if (response.getExperienceScore() != null
                && (response.getExperienceScore() < 0 || response.getExperienceScore() > 100)) {
            throw new IllegalStateException("AI Worker returned an invalid experience score.");
        }
    }

    public Optional<MatchResult> getMatchResult(UUID applicationId) {
        return matchResultRepository.findByApplicationId(applicationId);
    }
}
