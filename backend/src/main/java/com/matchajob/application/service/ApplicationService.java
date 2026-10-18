package com.matchajob.application.service;

import com.matchajob.application.dto.*;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.model.ApplicationStage;
import com.matchajob.application.model.ApplicationStatusHistory;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matchajob.security.ResourceOwnershipService;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Core business service for the application workflow.
 * Handles: submission, stage transitions, history tracking, and candidate ranking.
 */
@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final CvVersionRepository cvVersionRepository;
    private final ApplicationCvSnapshotRepository snapshotRepository;
    private final MatchResultRepository matchResultRepository;
    private final ProcessingJobService processingJobService;
    private final ApplicationStateMachine stateMachine;
    private final JdbcClient jdbcClient;
    private final ResourceOwnershipService resourceOwnershipService;

    @org.springframework.beans.factory.annotation.Autowired
    public ApplicationService(
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            CvVersionRepository cvVersionRepository,
            ApplicationCvSnapshotRepository snapshotRepository,
            MatchResultRepository matchResultRepository,
            ProcessingJobService processingJobService,
            ApplicationStateMachine stateMachine,
            JdbcClient jdbcClient,
            ResourceOwnershipService resourceOwnershipService) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.cvVersionRepository = cvVersionRepository;
        this.snapshotRepository = snapshotRepository;
        this.matchResultRepository = matchResultRepository;
        this.processingJobService = processingJobService;
        this.stateMachine = stateMachine;
        this.jdbcClient = jdbcClient;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    public ApplicationService(
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            CvVersionRepository cvVersionRepository,
            ApplicationCvSnapshotRepository snapshotRepository,
            MatchResultRepository matchResultRepository,
            ProcessingJobService processingJobService,
            ApplicationStateMachine stateMachine,
            JdbcClient jdbcClient) {
        this(applicationRepository, historyRepository, cvVersionRepository, snapshotRepository,
             matchResultRepository, processingJobService, stateMachine, jdbcClient, null);
    }

    // =========================================================================
    // 1. Submit Application (Candidate applies for a job)
    // =========================================================================

    /**
     * Process a job application submission from a candidate.
     *
     * @param candidateId  the candidate's profile ID
     * @param userId       the authenticated user ID (for history tracking)
     * @param request      the application request containing jobId, cvVersionId, coverLetter
     * @return ApplicationResponse with the created application details
     */
    @Transactional
    public ApplicationResponse applyForJob(UUID candidateId, UUID userId, ApplicationApplyRequest request) {
        UUID jobId = request.getJobId();
        UUID cvVersionId = request.getCvVersionId();

        // 1. Validate job exists, is active, and deadline has not passed
        validateJobIsOpen(jobId);

        // 2. Anti-duplicate: check if candidate already applied to this job
        if (applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)) {
            throw new DuplicateApplicationException(
                    "You have already applied for this job. Duplicate application is not allowed.");
        }

        // 3. Validate CV version exists and belongs to this candidate
        CvVersion cvVersion = cvVersionRepository.findById(cvVersionId)
                .orElseThrow(() -> new IllegalArgumentException("CV version not found: " + cvVersionId));
        if (!cvVersion.getCandidateId().equals(candidateId)) {
            throw new AccessDeniedException("CV version does not belong to this candidate.");
        }

        // 4. Create the application record
        Instant now = Instant.now();
        ApplicationEntity application = ApplicationEntity.builder()
                .candidateId(candidateId)
                .jobId(jobId)
                .coverLetter(request.getCoverLetter())
                .cvSnapshotUrl(cvVersion.getFilePath())
                .stage(ApplicationStage.NEW.getDbValue())
                .appliedAt(now)
                .updatedAt(now)
                .build();

        ApplicationEntity savedApp = applicationRepository.save(application);
        log.info("Application created: {} (candidate={}, job={})", savedApp.getId(), candidateId, jobId);

        // 5. Create immutable CV snapshot linking application to the CV version
        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(savedApp.getId())
                .cvVersion(cvVersion)
                .createdAt(now)
                .build();
        snapshotRepository.save(snapshot);

        // 6. Record initial status history entry
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
                .applicationId(savedApp.getId())
                .fromStage(null)
                .toStage(ApplicationStage.NEW.getDbValue())
                .changedBy(userId)
                .reason("Application submitted")
                .createdAt(now)
                .build();
        historyRepository.save(history);

        // 7. Queue AI matching processing job with idempotency
        String idempotencyKey = "app_match_" + savedApp.getId();
        ProcessingJob processingJob = processingJobService.createJob(
                "APPLICATION_MATCHING", "application", savedApp.getId(), idempotencyKey);

        return ApplicationResponse.builder()
                .applicationId(savedApp.getId())
                .candidateId(candidateId)
                .jobId(jobId)
                .stage(savedApp.getStage())
                .appliedAt(savedApp.getAppliedAt())
                .processingJobId(processingJob.getId())
                .message("Application submitted successfully. AI matching has been queued.")
                .build();
    }

    // =========================================================================
    // 2. Update Application Stage (HR transitions the pipeline stage)
    // =========================================================================

    /**
     * Update the stage of an application, validating state machine rules.
     *
     * @param applicationId the application to update
     * @param userId        the HR user performing the transition
     * @param request       the stage update request
     * @return StageUpdateResponse with previous and current stage
     */
    @Transactional
    public StageUpdateResponse updateStage(UUID applicationId, UUID userId, ApplicationStageUpdateRequest request) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkEmployerApplicationOwnership(userId, applicationId);
        }

        ApplicationEntity application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        ApplicationStage currentStage = application.getStageEnum();
        ApplicationStage targetStage = ApplicationStage.fromDbValue(request.getToStage());

        // Validate the transition via state machine
        stateMachine.validateTransition(currentStage, targetStage);

        Instant now = Instant.now();
        String previousStageValue = application.getStage();

        // Update the application
        application.setStageEnum(targetStage);
        application.setUpdatedAt(now);

        // If rejecting, store the reason
        if (targetStage == ApplicationStage.REJECTED && request.getReason() != null) {
            application.setRejectReason(request.getReason());
        }

        applicationRepository.save(application);

        // Record history entry
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
                .applicationId(applicationId)
                .fromStage(previousStageValue)
                .toStage(targetStage.getDbValue())
                .changedBy(userId)
                .reason(request.getReason())
                .createdAt(now)
                .build();
        historyRepository.save(history);

        log.info("Application {} stage updated: {} -> {} (by user {})",
                applicationId, previousStageValue, targetStage.getDbValue(), userId);

        return StageUpdateResponse.builder()
                .applicationId(applicationId)
                .previousStage(previousStageValue)
                .currentStage(targetStage.getDbValue())
                .updatedAt(now)
                .build();
    }

    // =========================================================================
    // 3. Get Application Status History
    // =========================================================================

    /**
     * Retrieve the full status transition history for an application.
     */
    public List<ApplicationHistoryResponse> getApplicationHistory(UUID applicationId, UUID userId) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkApplicationAccess(userId, applicationId);
        }

        // Verify application exists
        if (!applicationRepository.existsById(applicationId)) {
            throw new IllegalArgumentException("Application not found: " + applicationId);
        }

        return historyRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId)
                .stream()
                .map(h -> ApplicationHistoryResponse.builder()
                        .id(h.getId())
                        .fromStage(h.getFromStage())
                        .toStage(h.getToStage())
                        .changedBy(h.getChangedBy())
                        .reason(h.getReason())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();
    }

    public List<ApplicationHistoryResponse> getApplicationHistory(UUID applicationId) {
        return getApplicationHistory(applicationId, null);
    }

    // =========================================================================
    // 4. Get Job Application Rankings (sorted by match score)
    // =========================================================================

    /**
     * Get all applications for a job, ranked by match_results.overall_score DESC.
     * Joins applications with match_results and candidate_profiles/users for name.
     */
    public ApplicationRankingResponse getJobRankings(UUID jobId, UUID userId, String stageFilter, Integer minScore) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkEmployerJobOwnership(userId, jobId);
        }

        List<ApplicationEntity> applications = applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId);

        // Build ranking items with match result data
        List<ApplicationRankingItem> items = new ArrayList<>();
        for (ApplicationEntity app : applications) {
            // Apply stage filter if provided
            if (stageFilter != null && !stageFilter.isEmpty()
                    && !app.getStage().equalsIgnoreCase(stageFilter)) {
                continue;
            }

            Optional<MatchResult> matchOpt = matchResultRepository.findByApplicationId(app.getId());

            Integer overallScore = matchOpt.map(m -> (int) m.getOverallScore()).orElse(null);
            Integer skillsScore = matchOpt.map(m -> m.getSkillsScore() != null ? (int) m.getSkillsScore() : null).orElse(null);
            Integer experienceScore = matchOpt.map(m -> m.getExperienceScore() != null ? (int) m.getExperienceScore() : null).orElse(null);
            String rationale = matchOpt.map(MatchResult::getRationale).orElse(null);

            // Apply minimum score filter if provided
            if (minScore != null && (overallScore == null || overallScore < minScore)) {
                continue;
            }

            // Look up candidate name via JdbcClient
            String candidateName = lookupCandidateName(app.getCandidateId());

            items.add(ApplicationRankingItem.builder()
                    .applicationId(app.getId())
                    .candidateId(app.getCandidateId())
                    .candidateName(candidateName)
                    .stage(app.getStage())
                    .overallScore(overallScore)
                    .skillsScore(skillsScore)
                    .experienceScore(experienceScore)
                    .rationale(rationale)
                    .appliedAt(app.getAppliedAt())
                    .build());
        }

        // Sort by overall score descending (nulls last)
        items.sort((a, b) -> {
            Integer scoreA = a.getOverallScore();
            Integer scoreB = b.getOverallScore();
            if (scoreA == null && scoreB == null) return 0;
            if (scoreA == null) return 1;
            if (scoreB == null) return -1;
            return scoreB.compareTo(scoreA);
        });

        // Assign ranking numbers
        AtomicInteger rank = new AtomicInteger(1);
        items.forEach(item -> item.setRanking(rank.getAndIncrement()));

        return ApplicationRankingResponse.builder()
                .jobId(jobId)
                .totalCandidates(items.size())
                .items(items)
                .build();
    }

    public ApplicationRankingResponse getJobRankings(UUID jobId, String stageFilter, Integer minScore) {
        return getJobRankings(jobId, null, stageFilter, minScore);
    }

    // =========================================================================
    // 5. List & Detail Applications
    // =========================================================================

    /**
     * Retrieves paginated applications submitted by the given candidate.
     * Enforces that the authenticated user owns this candidate profile.
     *
     * @param candidateId candidate profile ID
     * @param userId      authenticated user ID
     * @param page        0-based page number
     * @param size        number of items per page
     * @param stageFilter optional stage filter
     * @return ApplicationListResponse
     */
    public ApplicationListResponse getMyApplications(UUID candidateId, UUID userId, int page, int size, String stageFilter) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkCandidateProfileOwnership(userId, candidateId);
        }

        int validatedPage = Math.max(page, 0);
        int validatedSize = (size <= 0 || size > 100) ? 10 : size;
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "appliedAt"));

        Page<ApplicationEntity> appPage;
        if (stageFilter != null && !stageFilter.isBlank()) {
            appPage = applicationRepository.findByCandidateIdAndStage(candidateId, stageFilter.trim().toLowerCase(), pageable);
        } else {
            appPage = applicationRepository.findByCandidateId(candidateId, pageable);
        }

        List<ApplicationDetailResponse> items = appPage.getContent().stream()
                .map(this::toDetailResponse)
                .toList();

        return ApplicationListResponse.builder()
                .items(items)
                .totalItems(appPage.getTotalElements())
                .page(appPage.getNumber())
                .size(appPage.getSize())
                .totalPages(appPage.getTotalPages())
                .build();
    }

    public ApplicationListResponse getMyApplications(UUID candidateId, int page, int size, String stageFilter) {
        return getMyApplications(candidateId, null, page, size, stageFilter);
    }

    /**
     * Retrieves full application details by application ID.
     * Enforces access control: accessible by the candidate owner OR the managing employer.
     *
     * @param applicationId application ID
     * @param userId        authenticated user ID
     * @return ApplicationDetailResponse
     */
    public ApplicationDetailResponse getApplicationDetail(UUID applicationId, UUID userId) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkApplicationAccess(userId, applicationId);
        }

        ApplicationEntity application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        return toDetailResponse(application);
    }

    public ApplicationDetailResponse getApplicationDetail(UUID applicationId) {
        return getApplicationDetail(applicationId, null);
    }

    /**
     * Retrieves paginated applications for a specific job for HR/Employers.
     * Enforces employer job ownership.
     *
     * @param jobId       job ID
     * @param userId      authenticated HR/employer user ID
     * @param page        0-based page number
     * @param size        number of items per page
     * @param stageFilter optional stage filter
     * @return ApplicationListResponse
     */
    public ApplicationListResponse getJobApplications(UUID jobId, UUID userId, int page, int size, String stageFilter) {
        if (resourceOwnershipService != null && userId != null) {
            resourceOwnershipService.checkEmployerJobOwnership(userId, jobId);
        }

        int validatedPage = Math.max(page, 0);
        int validatedSize = (size <= 0 || size > 100) ? 10 : size;
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "appliedAt"));

        Page<ApplicationEntity> appPage;
        if (stageFilter != null && !stageFilter.isBlank()) {
            appPage = applicationRepository.findByJobIdAndStage(jobId, stageFilter.trim().toLowerCase(), pageable);
        } else {
            appPage = applicationRepository.findByJobId(jobId, pageable);
        }

        List<ApplicationDetailResponse> items = appPage.getContent().stream()
                .map(this::toDetailResponse)
                .toList();

        return ApplicationListResponse.builder()
                .items(items)
                .totalItems(appPage.getTotalElements())
                .page(appPage.getNumber())
                .size(appPage.getSize())
                .totalPages(appPage.getTotalPages())
                .build();
    }

    public ApplicationListResponse getJobApplications(UUID jobId, int page, int size, String stageFilter) {
        return getJobApplications(jobId, null, page, size, stageFilter);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    /**
     * Validates that the job exists, has status 'active', and deadline has not passed.
     */
    private void validateJobIsOpen(UUID jobId) {
        Optional<Map<String, Object>> jobOpt = jdbcClient.sql("""
                SELECT status, deadline FROM jobs WHERE id = ? AND deleted_at IS NULL
                """)
                .param(jobId)
                .query((rs, rowNum) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("status", rs.getString("status"));
                    row.put("deadline", rs.getTimestamp("deadline"));
                    return row;
                })
                .optional();

        if (jobOpt.isEmpty()) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        Map<String, Object> job = jobOpt.get();
        String status = (String) job.get("status");
        if (!"active".equals(status)) {
            throw new IllegalStateException("Job is not accepting applications (status: " + status + ").");
        }

        java.sql.Timestamp deadline = (java.sql.Timestamp) job.get("deadline");
        if (deadline != null && deadline.toInstant().isBefore(Instant.now())) {
            throw new IllegalStateException("Job application deadline has passed.");
        }
    }

    /**
     * Looks up the candidate's full name from users via candidate_profiles.
     */
    private String lookupCandidateName(UUID candidateId) {
        try {
            return jdbcClient.sql("""
                    SELECT u.full_name FROM users u
                    JOIN candidate_profiles cp ON cp.user_id = u.id
                    WHERE cp.id = ?
                    """)
                    .param(candidateId)
                    .query(String.class)
                    .optional()
                    .orElse("Unknown");
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private record JobInfo(String title, String companyName) {}

    /**
     * Looks up job title and company name for an application.
     */
    private JobInfo lookupJobInfo(UUID jobId) {
        try {
            return jdbcClient.sql("""
                    SELECT j.title, c.name AS company_name
                    FROM jobs j
                    JOIN companies c ON c.id = j.company_id
                    WHERE j.id = ?
                    """)
                    .param(jobId)
                    .query((rs, rowNum) -> new JobInfo(
                            rs.getString("title"),
                            rs.getString("company_name")
                    ))
                    .optional()
                    .orElse(new JobInfo("Unknown Job", "Unknown Company"));
        } catch (Exception e) {
            return new JobInfo("Unknown Job", "Unknown Company");
        }
    }

    /**
     * Enriches an ApplicationEntity into an ApplicationDetailResponse DTO.
     */
    private ApplicationDetailResponse toDetailResponse(ApplicationEntity app) {
        String candidateName = lookupCandidateName(app.getCandidateId());
        JobInfo jobInfo = lookupJobInfo(app.getJobId());

        return ApplicationDetailResponse.builder()
                .applicationId(app.getId())
                .candidateId(app.getCandidateId())
                .candidateName(candidateName)
                .jobId(app.getJobId())
                .jobTitle(jobInfo.title())
                .companyName(jobInfo.companyName())
                .coverLetter(app.getCoverLetter())
                .cvSnapshotUrl(app.getCvSnapshotUrl())
                .stage(app.getStage())
                .rejectReason(app.getRejectReason())
                .matchScore(app.getMatchScore())
                .appliedAt(app.getAppliedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }

    // =========================================================================
    // Custom exception for duplicate applications
    // =========================================================================

    /**
     * Thrown when a candidate attempts to apply for a job they've already applied to.
     * Should be mapped to HTTP 409 Conflict by the exception handler.
     */
    public static class DuplicateApplicationException extends RuntimeException {
        public DuplicateApplicationException(String message) {
            super(message);
        }
    }
}
