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
    private final MatchingPersistenceService persistence;

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
            MatchingPersistenceService persistence) {
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
        this.persistence = persistence;
    }

    /**
     * Evaluates the matching result from persisted application, CV snapshot and job data.
     * Client-supplied job title/requirements/CV IDs are deliberately not trusted as source data.
     */
    public MatchResult evaluateApplicationMatch(UUID applicationId) {
        Optional<ProcessingJob> processingJob = findMatchingProcessingJob(applicationId);
        MatchResult existing = matchResultRepository.findByApplicationId(applicationId).orElse(null);
        if (existing != null) {
            // Reconcile a stale processing row if a result was saved before a previous interruption.
            processingJob.filter(processingRecord -> !"COMPLETED".equalsIgnoreCase(processingRecord.getStatus()))
                    .ifPresent(processingRecord -> processingJobService.markJobCompleted(processingRecord.getId()));
            return existing;
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

        Optional<ProcessingJob> claim = persistence.claim(applicationId);
        if (claim.isEmpty()) return matchResultRepository.findByApplicationId(applicationId).orElseThrow();
        try {
            MatchScoreRequest request = MatchScoreRequest.builder().jobId(job.getId().toString()).jobTitle(job.getTitle())
                    .jobRequirements(jobRequirements).jobDescription(jobDescription).cvText(cv.getRawText())
                    .candidateSkills(candidateSkills).build();
            MatchScoreResponse score = aiWorkerClient.calculateMatchScore(request);
            validateScoreResponse(score);
            return persistence.complete(claim.get(), buildResult(applicationId, job.getId(), cv.getId(), score));
        } catch (RuntimeException exception) {
            boolean retryable = isRetryableMatchingError(exception);
            persistence.fail(claim.get(), safeProcessingError(exception), retryable);
            if (exception instanceof MatchingException matching) throw matching;
            if (exception instanceof ResourceAccessException || exception instanceof HttpStatusCodeException)
                throw new MatchingException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                        retryable ? "MATCHING_WORKER_UNAVAILABLE" : "MATCHING_WORKER_REJECTED",
                        "Matching Worker could not complete this request. Reload status before retrying.", retryable, null);
            if (exception instanceof org.springframework.web.client.RestClientException)
                throw new MatchingException(org.springframework.http.HttpStatus.BAD_GATEWAY, "MATCHING_WORKER_SCHEMA_ERROR",
                        "Matching Worker response could not be decoded using the agreed contract.", false, null);
            if (exception instanceof IllegalStateException)
                throw new MatchingException(org.springframework.http.HttpStatus.BAD_GATEWAY, "MATCHING_WORKER_SCHEMA_ERROR",
                        "Matching Worker response does not match the agreed contract.", false, null);
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
                && (statusException.getStatusCode().is5xxServerError() || statusException.getStatusCode().value() == 429);
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
        // An abandoned synchronous attempt becomes retryable after its lease expires.
        boolean expired = processingJob.filter(j -> "PROCESSING".equals(j.getStatus()) && j.getLeaseExpiresAt() != null
                && !j.getLeaseExpiresAt().isAfter(Instant.now())).isPresent();
        String processingStatus = processingJob.map(ProcessingJob::getStatus)
                .filter(statusValue -> statusValue != null)
                .orElse("NOT_STARTED");
        String status = switch ((expired ? "PENDING" : processingStatus).toUpperCase(Locale.ROOT)) {
            case "PENDING" -> "PENDING";
            case "PROCESSING" -> "PROCESSING";
            case "FAILED" -> "FAILED";
            case "COMPLETED" -> "FAILED"; // A completed job without a result is inconsistent; surface a safe error state.
            default -> "NOT_STARTED";
        };
        boolean attemptsLeft = processingJob.map(j -> j.getAttemptCount() < j.getMaxAttempts()).orElse(true);
        if (expired && !attemptsLeft) status = "FAILED";
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
                .retryable(("NOT_STARTED".equals(status) || "PENDING".equals(status)) && attemptsLeft)
                .retryAfter("PENDING".equals(status) ? processingJob.map(ProcessingJob::getRetryAfter).orElse(null) : null)
                .attemptCount(processingJob.map(ProcessingJob::getAttemptCount).orElse(null))
                .maxAttempts(processingJob.map(ProcessingJob::getMaxAttempts).orElse(null))
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

    public static class MatchNotReadyException extends MatchingException {
        public MatchNotReadyException(String message) {
            super(org.springframework.http.HttpStatus.CONFLICT, "MATCHING_NOT_READY", message, true, null);
        }
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
        return saveMatchResultTransaction(applicationId, jobId, cvVersionId, scoreResponse);
    }

    @Transactional
    public MatchResult saveMatchResultTransaction(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            MatchScoreResponse scoreResponse) {

        validateScoreResponse(scoreResponse);
        return matchResultRepository.save(buildResult(applicationId, jobId, cvVersionId, scoreResponse));
    }

    private MatchResult buildResult(UUID applicationId, UUID jobId, UUID cvVersionId, MatchScoreResponse scoreResponse) {
        return MatchResult.builder().applicationId(applicationId).jobId(jobId).cvVersionId(cvVersionId)
                .overallScore(scoreResponse.getOverallScore().shortValue())
                .skillsScore(scoreResponse.getSkillsScore() == null ? null : scoreResponse.getSkillsScore().shortValue())
                .experienceScore(scoreResponse.getExperienceScore() == null ? null : scoreResponse.getExperienceScore().shortValue())
                .breakdown(matchingResultMapper.serializeBreakdown(scoreResponse)).rationale(scoreResponse.getRationale())
                .createdAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS)).build();
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
