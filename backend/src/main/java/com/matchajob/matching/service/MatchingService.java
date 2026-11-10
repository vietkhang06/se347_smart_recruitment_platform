
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

    private static final Logger log =
            LoggerFactory.getLogger(MatchingService.class);

    private final CvVersionRepository cvVersionRepository;
    private final MatchResultRepository matchResultRepository;
    private final AiWorkerClient aiWorkerClient;
    private final ObjectMapper objectMapper;
    private final MatchingResultMapper matchingResultMapper;
    private final ApplicationRepository applicationRepository;
    private final ApplicationCvSnapshotRepository applicationCvSnapshotRepository;
    private final JobRepository jobRepository;
    private final ProcessingJobRepository processingJobRepository;
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
            MatchingPersistenceService persistence
    ) {
        this.cvVersionRepository = cvVersionRepository;
        this.matchResultRepository = matchResultRepository;
        this.aiWorkerClient = aiWorkerClient;
        this.objectMapper = objectMapper;
        this.matchingResultMapper = matchingResultMapper;
        this.applicationRepository = applicationRepository;
        this.applicationCvSnapshotRepository = applicationCvSnapshotRepository;
        this.jobRepository = jobRepository;
        this.processingJobRepository = processingJobRepository;
        this.persistence = persistence;
    }

    public MatchResult evaluateApplicationMatch(UUID applicationId, String leaseToken) {
        return evaluateApplicationMatch(applicationId);
    }

    /**
     * Synchronous compatibility entry point used by
     * POST /v1/applications/{id}/match.
     *
     * The persistence service atomically claims a lease before
     * delegating to the same execution path used by the background scheduler.
     */
    public MatchResult evaluateApplicationMatch(UUID applicationId) {

        if (applicationId == null) {
            throw new IllegalArgumentException("Application ID is required.");
        }

        Optional<ProcessingJob> claim = persistence.claim(applicationId);

        if (claim.isEmpty()) {
            return matchResultRepository.findByApplicationId(applicationId)
                    .orElseThrow(() -> new MatchingException(
                            org.springframework.http.HttpStatus.CONFLICT,
                            "MATCHING_STATE_CONFLICT",
                            "Matching could not be claimed. Reload the matching status.",
                            true,
                            null
                    ));
        }

        return evaluateApplicationMatch(claim.get());
    }

    /**
     * Executes a job that has already been claimed by the queue scheduler.
     *
     * This method deliberately does not call persistence.claim() again.
     */
    public MatchResult evaluateApplicationMatch(ProcessingJob lease) {

        validateClaimedLease(lease);

        UUID applicationId = lease.getEntityId();

        try {
            Optional<MatchResult> existing =
                    matchResultRepository.findByApplicationId(applicationId);

            if (existing.isPresent()) {
                // A result may have been committed before a worker crashed.
                // Complete the currently-owned lease idempotently instead of
                // asking the AI Worker again.
                return persistence.complete(lease, existing.get());
            }

            ApplicationEntity application = applicationRepository
                    .findById(applicationId)
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Application not found: " + applicationId
                            )
                    );

            ApplicationCvSnapshot snapshot =
                    applicationCvSnapshotRepository
                            .findWithCvVersionByApplicationId(applicationId)
                            .orElseThrow(() -> new MatchNotReadyException(
                                    "CV snapshot for this application is not available yet."
                            ));

            CvVersion cv = snapshot.getCvVersion();

            if (cv == null
                    || cv.getRawText() == null
                    || cv.getRawText().isBlank()) {

                throw new MatchNotReadyException(
                        "CV extraction is not complete. Retry matching after the CV has been processed."
                );
            }

            Job job = jobRepository
                    .findByIdAndDeletedAtIsNull(application.getJobId())
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Job not found: " + application.getJobId()
                            )
                    );

            String jobRequirements = joinNonBlank(
                    job.getRequirements(),
                    job.getSummaryRequired(),
                    job.getSummaryPreferred()
            );

            String jobDescription = joinNonBlank(
                    job.getDescription(),
                    job.getSummaryIndustry()
            );

            List<String> candidateSkills =
                    extractCandidateSkills(cv.getParsedData());

            MatchScoreRequest request = MatchScoreRequest.builder()
                    .jobId(job.getId().toString())
                    .jobTitle(job.getTitle())
                    .jobRequirements(jobRequirements)
                    .jobDescription(jobDescription)
                    .cvText(cv.getRawText())
                    .candidateSkills(candidateSkills)
                    .build();

            MatchScoreResponse score =
                    aiWorkerClient.calculateMatchScore(request);

            validateScoreResponse(score);

            return persistence.complete(
                    lease,
                    buildResult(
                            applicationId,
                            job.getId(),
                            cv.getId(),
                            score
                    )
            );

        } catch (RuntimeException exception) {

            boolean retryable =
                    isRetryableMatchingError(exception)
                            && hasAttemptsRemaining(lease);

            // One owner, one state transition:
            // MatchingService persists failure once.
            // The scheduler must never call markJobFailed for this same lease.
            persistence.fail(
                    lease,
                    safeProcessingError(exception),
                    retryable
            );

            if (exception instanceof MatchingException matching) {

                if (matching.isRetryable() != retryable) {
                    throw new MatchingException(
                            matching.getStatus(),
                            matching.getCode(),
                            matching.getMessage(),
                            retryable,
                            retryable ? matching.getRetryAfter() : null
                    );
                }

                throw matching;
            }

            if (exception instanceof ResourceAccessException
                    || exception instanceof HttpStatusCodeException) {

                throw new MatchingException(
                        org.springframework.http.HttpStatus.BAD_GATEWAY,
                        retryable
                                ? "MATCHING_WORKER_UNAVAILABLE"
                                : "MATCHING_WORKER_REJECTED",
                        "Matching Worker could not complete this request. Reload status before retrying.",
                        retryable,
                        null
                );
            }

            if (exception instanceof org.springframework.web.client.RestClientException) {

                throw new MatchingException(
                        org.springframework.http.HttpStatus.BAD_GATEWAY,
                        "MATCHING_WORKER_SCHEMA_ERROR",
                        "Matching Worker response could not be decoded using the agreed contract.",
                        false,
                        null
                );
            }

            if (exception instanceof IllegalStateException) {

                throw new MatchingException(
                        org.springframework.http.HttpStatus.BAD_GATEWAY,
                        "MATCHING_WORKER_SCHEMA_ERROR",
                        "Matching Worker response does not match the agreed contract.",
                        false,
                        null
                );
            }

            throw exception;
        }
    }

    /**
     * Validates that the supplied ProcessingJob represents a currently-owned
     * APPLICATION_MATCHING lease.
     */
    private void validateClaimedLease(ProcessingJob lease) {

        if (lease == null
                || lease.getId() == null
                || lease.getEntityId() == null
                || !"APPLICATION_MATCHING".equals(lease.getJobType())
                || !"application".equals(lease.getEntityType())
                || !"PROCESSING".equals(lease.getStatus())
                || lease.getLeaseToken() == null
                || lease.getLeaseToken().isBlank()
                || lease.getLeaseExpiresAt() == null
                || !lease.getLeaseExpiresAt().isAfter(Instant.now())) {

            throw new MatchingException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "MATCHING_LEASE_INVALID",
                    "A valid claimed matching job lease is required.",
                    false,
                    null
            );
        }
    }

    /**
     * Retrieves the latest APPLICATION_MATCHING job for an application.
     */
    private Optional<ProcessingJob> findMatchingProcessingJob(
            UUID applicationId
    ) {
        return processingJobRepository
                .findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                        "APPLICATION_MATCHING",
                        "application",
                        applicationId
                );
    }

    /**
     * Converts internal exceptions into safe messages for processing records.
     */
    private String safeProcessingError(RuntimeException exception) {

        if (exception instanceof MatchNotReadyException matchingNotReady) {
            return matchingNotReady.getMessage();
        }

        if (exception instanceof MatchingException matching) {
            return matching.getMessage();
        }

        if (exception instanceof ResourceAccessException) {
            return "AI Worker connection failed.";
        }

        if (exception instanceof HttpStatusCodeException statusException) {
            return "AI Worker returned HTTP "
                    + statusException.getStatusCode().value() + ".";
        }

        return "Matching evaluation failed ("
                + exception.getClass().getSimpleName() + ").";
    }

    /**
     * Determines whether a matching error can be retried.
     */
    private boolean isRetryableMatchingError(RuntimeException exception) {

        if (exception instanceof MatchingException matching) {
            return matching.isRetryable();
        }

        if (exception instanceof ResourceAccessException) {
            return true;
        }

        return exception instanceof HttpStatusCodeException statusException
                && (statusException.getStatusCode().is5xxServerError()
                || statusException.getStatusCode().value() == 429);
    }

    /**
     * Checks whether the current processing job has remaining attempts.
     */
    private boolean hasAttemptsRemaining(ProcessingJob lease) {

        return lease.getAttemptCount() != null
                && lease.getMaxAttempts() != null
                && lease.getAttemptCount() < lease.getMaxAttempts();
    }

    /**
     * Returns a result when complete, otherwise a stable processing-state DTO.
     */
    public MatchingResultResponse getMatchResultStatus(UUID applicationId) {

        ApplicationEntity application = applicationRepository
                .findById(applicationId)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Application not found: " + applicationId
                        )
                );

        Optional<MatchResult> result =
                matchResultRepository.findByApplicationId(applicationId);

        if (result.isPresent()) {
            return matchingResultMapper.fromEntity(result.get());
        }

        Optional<ProcessingJob> processingJob =
                findMatchingProcessingJob(applicationId);

        // An abandoned synchronous attempt becomes retryable after its lease expires.
        boolean expired = processingJob.filter(j ->
                "PROCESSING".equals(j.getStatus())
                        && j.getLeaseExpiresAt() != null
                        && !j.getLeaseExpiresAt().isAfter(Instant.now())
        ).isPresent();

        String processingStatus = processingJob
                .map(ProcessingJob::getStatus)
                .filter(statusValue -> statusValue != null)
                .orElse("NOT_STARTED");

        String status = switch (
                (expired ? "PENDING" : processingStatus).toUpperCase(Locale.ROOT)
        ) {
            case "PENDING" -> "PENDING";
            case "PROCESSING" -> "PROCESSING";
            case "FAILED" -> "FAILED";
            case "COMPLETED" -> "FAILED";
            default -> "NOT_STARTED";
        };

        boolean attemptsLeft = processingJob
                .map(j -> j.getAttemptCount() < j.getMaxAttempts())
                .orElse(true);

        if (expired && !attemptsLeft) {
            status = "FAILED";
        }

        String message = switch (status) {
            case "PENDING" ->
                    "Matching has been queued and is waiting to be processed.";

            case "PROCESSING" ->
                    "Matching is currently being processed.";

            case "FAILED" ->
                    "Matching has no saved result. Check processing status and retry when available.";

            default ->
                    "No matching result is available for this application yet.";
        };

        UUID cvVersionId = applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId)
                .map(snapshot ->
                        snapshot.getCvVersion() == null
                                ? null
                                : snapshot.getCvVersion().getId()
                )
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
                .processingJobId(
                        processingJob.map(ProcessingJob::getId).orElse(null)
                )
                .evaluatedAt(null)
                .retryable(
                        ("NOT_STARTED".equals(status) || "PENDING".equals(status))
                                && attemptsLeft
                )
                .retryAfter(
                        "PENDING".equals(status)
                                ? processingJob.map(ProcessingJob::getRetryAfter).orElse(null)
                                : null
                )
                .attemptCount(
                        processingJob.map(ProcessingJob::getAttemptCount).orElse(null)
                )
                .maxAttempts(
                        processingJob.map(ProcessingJob::getMaxAttempts).orElse(null)
                )
                .message(message)
                .build();
    }

    public MatchingResultResponse toResponse(MatchResult result) {
        return matchingResultMapper.fromEntity(result);
    }

    /**
     * Joins non-empty text sections into a single string.
     */
    private String joinNonBlank(String... parts) {

        List<String> values = new ArrayList<>();

        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                values.add(part.trim());
            }
        }

        return String.join("\n\n", values);
    }

    /**
     * Extracts candidate skills from parsed CV JSON.
     */
    private List<String> extractCandidateSkills(String parsedData) {

        if (parsedData == null || parsedData.isBlank()) {
            return List.of();
        }

        try {
            var root = objectMapper.readTree(parsedData);
            var skillNode = root.path("skills");

            if (skillNode.isArray()) {

                List<String> skills = new ArrayList<>();

                skillNode.forEach(item -> {

                    String value = item.isTextual()
                            ? item.asText()
                            : item.path("name").asText("");

                    if (!value.isBlank()) {
                        skills.add(value.trim());
                    }
                });

                return skills.stream().distinct().toList();
            }

        } catch (Exception ex) {

            log.warn(
                    "Could not parse extracted CV skills; matching will use CV text only."
            );
        }

        return List.of();
    }

    /**
     * Exception raised when CV data is not ready for matching.
     */
    public static class MatchNotReadyException extends MatchingException {

        public MatchNotReadyException(String message) {
            super(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "MATCHING_NOT_READY",
                    message,
                    true,
                    null
            );
        }
    }

    /**
     * Legacy matching entry point retained for compatibility.
     */
    public MatchResult evaluateMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription
    ) {

        Optional<MatchResult> existing =
                matchResultRepository.findByApplicationId(applicationId);

        if (existing.isPresent()) {

            log.info(
                    "Match result already exists for application: {}",
                    applicationId
            );

            return existing.get();
        }

        CvVersion cv = cvVersionRepository.findById(cvVersionId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "CvVersion not found: " + cvVersionId
                        )
                );

        String cvText = cv.getRawText();

        List<String> skills = new ArrayList<>();

        if (cv.getParsedData() != null) {

            try {
                var jsonNode = objectMapper.readTree(cv.getParsedData());

                if (jsonNode.has("skills") && jsonNode.get("skills").isArray()) {

                    for (var item : jsonNode.get("skills")) {
                        skills.add(item.asText());
                    }
                }

            } catch (Exception ignored) {
                // Legacy compatibility path:
                // use CV raw text if parsed skills are unavailable.
            }
        }

        return evaluateMatch(
                applicationId,
                jobId,
                cvVersionId,
                jobTitle,
                jobRequirements,
                jobDescription,
                cvText,
                skills
        );
    }

    /**
     * Executes the legacy matching flow using prepared CV and Job data.
     */
    private MatchResult evaluateMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription,
            String cvText,
            List<String> skills
    ) {

        if (jobId == null) {
            throw new IllegalArgumentException(
                    "Job ID is required for matching."
            );
        }

        if (cvText == null || cvText.isBlank()) {
            throw new MatchNotReadyException(
                    "CV text is not ready for matching."
            );
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
        MatchScoreResponse scoreResponse =
                aiWorkerClient.calculateMatchScore(request);

        validateScoreResponse(scoreResponse);

        return saveMatchResultTransaction(
                applicationId,
                jobId,
                cvVersionId,
                scoreResponse
        );
    }

    @Transactional
    public MatchResult saveMatchResultTransaction(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            MatchScoreResponse scoreResponse
    ) {

        validateScoreResponse(scoreResponse);

        MatchResult result = matchResultRepository
                .findByApplicationId(applicationId)
                .orElseGet(() -> MatchResult.builder()
                        .applicationId(applicationId)
                        .createdAt(
                                Instant.now().truncatedTo(
                                        java.time.temporal.ChronoUnit.MICROS
                                )
                        )
                        .build()
                );

        result.setJobId(
                java.util.Objects.requireNonNull(
                        jobId,
                        "Job ID is required for matching"
                )
        );

        result.setCvVersionId(cvVersionId);

        result.setOverallScore(
                scoreResponse.getOverallScore().shortValue()
        );

        result.setSkillsScore(
                scoreResponse.getSkillsScore() == null
                        ? null
                        : scoreResponse.getSkillsScore().shortValue()
        );

        result.setExperienceScore(
                scoreResponse.getExperienceScore() == null
                        ? null
                        : scoreResponse.getExperienceScore().shortValue()
        );

        result.setBreakdown(
                matchingResultMapper.serializeBreakdown(scoreResponse)
        );

        result.setRationale(scoreResponse.getRationale());

        return matchResultRepository.save(result);
    }

    /**
     * Builds a new MatchResult from a validated AI Worker response.
     */
    private MatchResult buildResult(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            MatchScoreResponse scoreResponse
    ) {

        return MatchResult.builder()
                .applicationId(applicationId)
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .overallScore(
                        scoreResponse.getOverallScore().shortValue()
                )
                .skillsScore(
                        scoreResponse.getSkillsScore() == null
                                ? null
                                : scoreResponse.getSkillsScore().shortValue()
                )
                .experienceScore(
                        scoreResponse.getExperienceScore() == null
                                ? null
                                : scoreResponse.getExperienceScore().shortValue()
                )
                .breakdown(
                        matchingResultMapper.serializeBreakdown(scoreResponse)
                )
                .rationale(scoreResponse.getRationale())
                .createdAt(
                        Instant.now().truncatedTo(
                                java.time.temporal.ChronoUnit.MICROS
                        )
                )
                .build();
    }

    /**
     * Validates AI Worker score values against the agreed score range.
     */
    private void validateScoreResponse(MatchScoreResponse response) {

        if (response == null
                || response.getOverallScore() == null
                || response.getOverallScore() < 0
                || response.getOverallScore() > 100) {

            throw new IllegalStateException(
                    "AI Worker returned an invalid overall matching score."
            );
        }

        if (response.getSkillsScore() != null
                && (response.getSkillsScore() < 0
                || response.getSkillsScore() > 100)) {

            throw new IllegalStateException(
                    "AI Worker returned an invalid skills score."
            );
        }

        if (response.getExperienceScore() != null
                && (response.getExperienceScore() < 0
                || response.getExperienceScore() > 100)) {

            throw new IllegalStateException(
                    "AI Worker returned an invalid experience score."
            );
        }
    }

    public Optional<MatchResult> getMatchResult(UUID applicationId) {
        return matchResultRepository.findByApplicationId(applicationId);
    }
}
