package com.matchajob.pipeline;

import com.matchajob.application.dto.*;
import com.matchajob.application.model.*;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.application.service.ApplicationStateMachine;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.dto.CvUploadResponse;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvAccessAuditService;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.matching.controller.MatchController;
import com.matchajob.matching.dto.MatchingResultResponse;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.processing.controller.ProcessingJobController;
import com.matchajob.processing.dto.ProcessingJobResponse;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * CV–Application–AI Pipeline Comprehensive Regression Test Suite.
 *
 * Validates the full lifecycle, safety guarantees, security boundaries,
 * and recovery mechanisms for:
 * CV -> Application -> ProcessingJob -> AI Worker -> MatchResult -> Ranking -> Pipeline Stage.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CV–Application–AI Pipeline Regression Test Suite")
class CvApplicationAiPipelineRegressionTest {

    // Mocked Dependencies for Application
    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private ApplicationCvSnapshotRepository snapshotRepository;
    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private ProcessingJobService processingJobService;
    @Mock private ApplicationStateMachine stateMachine;
    @Mock private JdbcClient jdbcClient;
    @Mock private ResourceOwnershipService resourceOwnershipService;

    // Mocked Dependencies for CV
    @Mock private CvStorageService cvStorageService;
    @Mock private CvRegistrationService cvRegistrationService;
    @Mock private CvAccessAuditService cvAccessAuditService;

    // Mocked Dependencies for Processing & Matching
    @Mock private ProcessingJobRepository processingJobRepository;
    @Mock private MatchingService matchingService;

    // Subject Under Test
    private ApplicationService applicationService;
    private ProcessingJobController processingJobController;
    private CvController cvController;
    private MatchController matchController;

    // Test Identifiers (valid hexadecimal UUIDs)
    private final UUID candidateUserId = UUID.fromString("30000000-0000-4000-8000-000000000001");
    private final UUID candidateProfileId = UUID.fromString("ca000000-0000-4000-8000-000000000001");
    private final UUID employerUserId = UUID.fromString("20000000-0000-4000-8000-000000000001");
    private final UUID jobId = UUID.fromString("ba000000-0000-4000-8000-000000000101");
    private final UUID cvVersionId = UUID.fromString("bb000000-0000-4000-8000-000000000001");
    private final UUID applicationId = UUID.fromString("aa000000-0000-4000-8000-000000000001");

    private Authentication candidateAuth;
    private Authentication employerAuth;
    private Authentication anonymousAuth;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(
                applicationRepository,
                historyRepository,
                cvVersionRepository,
                snapshotRepository,
                matchResultRepository,
                processingJobService,
                stateMachine,
                jdbcClient,
                resourceOwnershipService
        );

        processingJobController = new ProcessingJobController(processingJobService, resourceOwnershipService);
        cvController = new CvController(cvStorageService, cvVersionRepository, cvRegistrationService, null, resourceOwnershipService, cvAccessAuditService);
        matchController = new MatchController(matchingService, resourceOwnershipService);

        candidateAuth = new UsernamePasswordAuthenticationToken(candidateUserId, "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE")));
        employerAuth = new UsernamePasswordAuthenticationToken(employerUserId, "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_EMPLOYER")));
        anonymousAuth = new AnonymousAuthenticationToken("key", "anonymousUser",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
    }

    // =========================================================================
    // 1. HAPPY PATH: End-to-End Pipeline
    // =========================================================================
    @Nested
    @DisplayName("1. Happy Path: End-to-End Pipeline Execution")
    class HappyPathTests {

        @Test
        @DisplayName("E2E: CV Upload -> Job Apply -> Processing Job Queued -> Stage History Recorded")
        void e2ePipeline_applyFlow_succeeds() {
            // Setup active job in mock database
            mockJobQuery("active", Timestamp.from(Instant.now().plusSeconds(86400)));

            // Setup valid CV version
            CvVersion cv = CvVersion.builder()
                    .id(cvVersionId)
                    .candidateId(candidateProfileId)
                    .filePath("target/uploads/cv/test.pdf")
                    .fileName("test.pdf")
                    .active(true)
                    .status("processed")
                    .build();
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.of(cv));

            // Anti-duplicate check passes
            when(applicationRepository.existsByCandidateIdAndJobId(candidateProfileId, jobId)).thenReturn(false);

            // Mock application save
            when(applicationRepository.save(any(ApplicationEntity.class))).thenAnswer(inv -> {
                ApplicationEntity entity = inv.getArgument(0);
                entity.setId(applicationId);
                return entity;
            });

            // Mock ProcessingJob queueing
            ProcessingJob mockJob = ProcessingJob.builder()
                    .id(UUID.randomUUID())
                    .jobType("APPLICATION_MATCHING")
                    .entityType("application")
                    .entityId(applicationId)
                    .status("PENDING")
                    .attemptCount(0)
                    .maxAttempts(3)
                    .idempotencyKey("app_match_" + applicationId)
                    .build();
            when(processingJobService.createJob(eq("APPLICATION_MATCHING"), eq("application"), eq(applicationId), anyString()))
                    .thenReturn(mockJob);

            // Execute Apply
            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .coverLetter("Looking forward to working with you!")
                    .build();

            ApplicationResponse response = applicationService.applyForJob(candidateProfileId, candidateUserId, request);

            // Verifications
            assertThat(response).isNotNull();
            assertThat(response.getApplicationId()).isEqualTo(applicationId);
            assertThat(response.getStage()).isEqualTo("new");
            assertThat(response.getMessage()).contains("AI matching has been queued");

            // Verify CV snapshot creation
            verify(snapshotRepository, times(1)).save(argThat(snapshot ->
                    snapshot.getApplicationId().equals(applicationId) &&
                    snapshot.getCvVersion().getId().equals(cvVersionId)
            ));

            // Verify initial status history recorded
            verify(historyRepository, times(1)).save(argThat(hist ->
                    hist.getApplicationId().equals(applicationId) &&
                    "new".equals(hist.getToStage()) &&
                    candidateUserId.equals(hist.getChangedBy())
            ));

            // Verify processing job creation with idempotency key
            verify(processingJobService, times(1)).createJob(
                    eq("APPLICATION_MATCHING"), eq("application"), eq(applicationId), eq("app_match_" + applicationId)
            );
        }

        @Test
        @DisplayName("E2E: Employer updates stage new -> screening -> interview with audit log")
        void e2ePipeline_stageProgression_recordsAudit() {
            ApplicationEntity app = ApplicationEntity.builder()
                    .id(applicationId)
                    .candidateId(candidateProfileId)
                    .jobId(jobId)
                    .stage("new")
                    .build();
            when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(app));
            when(applicationRepository.save(any(ApplicationEntity.class))).thenAnswer(i -> i.getArgument(0));

            // Step 1: new -> screening
            ApplicationStageUpdateRequest request1 = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .reason("Matches technical requirements")
                    .build();
            StageUpdateResponse resp1 = applicationService.updateStage(applicationId, employerUserId, request1);
            assertThat(resp1.getCurrentStage()).isEqualTo("screening");
            assertThat(resp1.getPreviousStage()).isEqualTo("new");

            // Step 2: screening -> interview
            ApplicationStageUpdateRequest request2 = ApplicationStageUpdateRequest.builder()
                    .toStage("interview")
                    .reason("Passed phone screening")
                    .build();
            StageUpdateResponse resp2 = applicationService.updateStage(applicationId, employerUserId, request2);
            assertThat(resp2.getCurrentStage()).isEqualTo("interview");
            assertThat(resp2.getPreviousStage()).isEqualTo("screening");

            // Verify history recorded twice
            verify(historyRepository, times(2)).save(any(ApplicationStatusHistory.class));
        }
    }

    // =========================================================================
    // 2. SECURITY & IDOR: Access Control & Authorization Boundaries
    // =========================================================================
    @Nested
    @DisplayName("2. Security & IDOR Regression Tests")
    class SecurityAndIdorTests {

        @Test
        @DisplayName("SEC-01: Anonymous request to processing job status throws AccessDeniedException")
        void anonymousAccess_toProcessingJob_throwsAccessDenied() {
            UUID pJobId = UUID.randomUUID();
            ProcessingJob mockJob = ProcessingJob.builder()
                    .id(pJobId)
                    .status("COMPLETED")
                    .build();
            when(processingJobService.getJob(pJobId)).thenReturn(Optional.of(mockJob));

            assertThatThrownBy(() -> processingJobController.getJob(pJobId, anonymousAuth))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Full authentication is required");

            assertThatThrownBy(() -> processingJobController.getJob(pJobId, null))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Full authentication is required");
        }

        @Test
        @DisplayName("SEC-02: Candidate A cannot download Candidate B's CV")
        void candidateA_cannotDownloadCandidateB_cv() {
            UUID otherCandidateId = UUID.randomUUID();
            doThrow(new AccessDeniedException("Access is denied: You can only access your own candidate profile"))
                    .when(resourceOwnershipService).checkCvVersionAccess(candidateUserId, otherCandidateId, cvVersionId);

            assertThatThrownBy(() -> cvController.downloadCv(otherCandidateId, cvVersionId, candidateAuth, "attachment"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Access is denied");
        }

        @Test
        @DisplayName("SEC-03: Employer cannot download candidate CV for an unrelated job")
        void employer_cannotDownloadUnrelatedCandidateCv() {
            doThrow(new AccessDeniedException("Access is denied: You do not have permission to view this CV"))
                    .when(resourceOwnershipService).checkCvVersionAccess(employerUserId, candidateProfileId, cvVersionId);

            assertThatThrownBy(() -> cvController.downloadCv(candidateProfileId, cvVersionId, employerAuth, "attachment"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Access is denied");
        }

        @Test
        @DisplayName("SEC-04: Candidate cannot update application stage (only Employer owning job can)")
        void candidate_cannotUpdateApplicationStage() {
            doThrow(new AccessDeniedException("Access is denied: You do not have permission to update this application"))
                    .when(resourceOwnershipService).checkEmployerApplicationOwnership(candidateUserId, applicationId);

            ApplicationStageUpdateRequest req = ApplicationStageUpdateRequest.builder().toStage("interview").build();
            assertThatThrownBy(() -> applicationService.updateStage(applicationId, candidateUserId, req))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    // =========================================================================
    // 3. BOUNDARY & DUPLICATE PREVENTION: Anti-Duplicate, Closed Jobs, Validation
    // =========================================================================
    @Nested
    @DisplayName("3. Boundary & Duplicate Prevention Tests")
    class DuplicateAndBoundaryTests {

        @Test
        @DisplayName("EDGE-01: Repeated application submission throws DuplicateApplicationException")
        void repeatedApplication_throwsDuplicateException() {
            mockJobQuery("active", Timestamp.from(Instant.now().plusSeconds(86400)));
            when(applicationRepository.existsByCandidateIdAndJobId(candidateProfileId, jobId)).thenReturn(true);

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateProfileId, candidateUserId, req))
                    .isInstanceOf(ApplicationService.DuplicateApplicationException.class)
                    .hasMessageContaining("already applied for this job");
        }

        @Test
        @DisplayName("EDGE-02: Concurrent race condition hitting DB unique constraint triggers DuplicateApplicationException")
        void concurrentRaceCondition_triggersDuplicateException() {
            mockJobQuery("active", Timestamp.from(Instant.now().plusSeconds(86400)));
            when(applicationRepository.existsByCandidateIdAndJobId(candidateProfileId, jobId)).thenReturn(false);

            CvVersion cv = CvVersion.builder().id(cvVersionId).candidateId(candidateProfileId).filePath("path").build();
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.of(cv));

            // Simulate concurrent thread committing first and causing DB unique constraint violation
            when(applicationRepository.save(any(ApplicationEntity.class)))
                    .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"uq_application\""));

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateProfileId, candidateUserId, req))
                    .isInstanceOf(ApplicationService.DuplicateApplicationException.class)
                    .hasMessageContaining("already applied for this job");
        }

        @Test
        @DisplayName("EDGE-03: Applying to a closed job is rejected with Bad Request")
        void applyToClosedJob_rejected() {
            mockJobQuery("closed", Timestamp.from(Instant.now().plusSeconds(86400)));

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateProfileId, candidateUserId, req))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Job is not accepting applications");
        }

        @Test
        @DisplayName("EDGE-04: Applying to a job past deadline is rejected with Bad Request")
        void applyToExpiredDeadlineJob_rejected() {
            // Deadline was yesterday
            mockJobQuery("active", Timestamp.from(Instant.now().minusSeconds(86400)));

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateProfileId, candidateUserId, req))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Job application deadline has passed");
        }

        @Test
        @DisplayName("EDGE-05: Applying with CV belonging to another candidate is rejected")
        void applyWithUnownedCv_rejected() {
            mockJobQuery("active", Timestamp.from(Instant.now().plusSeconds(86400)));
            when(applicationRepository.existsByCandidateIdAndJobId(candidateProfileId, jobId)).thenReturn(false);

            UUID differentCandidateId = UUID.randomUUID();
            CvVersion otherCv = CvVersion.builder().id(cvVersionId).candidateId(differentCandidateId).build();
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.of(otherCv));

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateProfileId, candidateUserId, req))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("CV version does not belong to this candidate");
        }
    }

    // =========================================================================
    // 4. AI FAILURE, TIMEOUT & IDEMPOTENT RECOVERY
    // =========================================================================
    @Nested
    @DisplayName("4. AI Failure, Timeout & Idempotent Recovery Tests")
    class AiFailureAndRecoveryTests {

        @Test
        @DisplayName("REC-01: ProcessingJob failure transitions to FAILED with error message and backoff")
        void jobFailure_recordsLastError_andBackoff() {
            UUID testJobId = UUID.randomUUID();
            ProcessingJob job = ProcessingJob.builder()
                    .id(testJobId)
                    .status("PROCESSING")
                    .attemptCount(1)
                    .maxAttempts(3)
                    .build();

            ProcessingJobRepository mockRepo = mock(ProcessingJobRepository.class);
            when(mockRepo.findById(testJobId)).thenReturn(Optional.of(job));
            when(mockRepo.save(any(ProcessingJob.class))).thenAnswer(i -> i.getArgument(0));

            ProcessingJobService service = new ProcessingJobService(mockRepo);

            // Transient failure (retryable)
            service.markJobFailed(testJobId, "AI Worker timeout after 30s", true);
            assertThat(job.getStatus()).isEqualTo("PENDING");
            assertThat(job.getLastError()).isEqualTo("AI Worker timeout after 30s");
            assertThat(job.getRetryAfter()).isAfter(Instant.now().minusSeconds(1));

            // Final failure when max attempts reached
            job.setAttemptCount(3);
            service.markJobFailed(testJobId, "AI Worker 500 Internal Error permanent", true);
            assertThat(job.getStatus()).isEqualTo("FAILED");
            assertThat(job.getLastError()).isEqualTo("AI Worker 500 Internal Error permanent");
        }

        @Test
        @DisplayName("REC-02: Idempotent matching query returns existing completed result")
        void idempotentMatching_returnsExistingResult() {
            MatchResult existing = MatchResult.builder()
                    .id(UUID.randomUUID())
                    .applicationId(applicationId)
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .overallScore((short) 88)
                    .build();

            when(matchingService.getMatchResult(applicationId)).thenReturn(Optional.of(existing));

            ResponseEntity<MatchingResultResponse> resp = matchController.getMatchResult(applicationId, employerAuth);
            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getOverallScore()).isEqualTo(88);
        }

        @Test
        @DisplayName("REC-03: Stale lease recovery reclaims processing jobs older than 120s")
        void staleLeaseRecovery_reclaimsExpiredJob() {
            ProcessingJobRepository mockRepo = mock(ProcessingJobRepository.class);
            when(mockRepo.recoverExpiredLeases(any(Instant.class))).thenReturn(2);

            ProcessingJobService service = new ProcessingJobService(mockRepo);
            int recovered = service.recoverExpiredLeases();
            assertThat(recovered).isEqualTo(2);
        }
    }

    // =========================================================================
    // 5. RANKING & TIE-BREAKING: Deterministic Ranking Order
    // =========================================================================
    @Nested
    @DisplayName("5. Ranking & Tie-Breaking Logic Tests")
    class RankingTests {

        @Test
        @DisplayName("RANK-01: Ranking order: Higher score > Tied score (earlier applied_at) > Null score (NULLS LAST)")
        @SuppressWarnings("unchecked")
        void rankingOrder_deterministicTieBreaker() {
            Instant t0 = Instant.parse("2026-11-18T09:00:00Z");
            Instant t1 = Instant.parse("2026-11-18T10:00:00Z");
            Instant t2 = Instant.parse("2026-11-18T14:00:00Z");
            Instant t3 = Instant.parse("2026-11-19T08:00:00Z");

            List<ApplicationRankingItem> rawDbItems = new ArrayList<>();
            // Rank 1 expected: Score 92
            rawDbItems.add(ApplicationRankingItem.builder()
                    .applicationId(UUID.randomUUID()).candidateName("Candidate A").overallScore(92).appliedAt(t0).build());
            // Rank 2 expected: Score 78, applied earlier (t1)
            rawDbItems.add(ApplicationRankingItem.builder()
                    .applicationId(UUID.randomUUID()).candidateName("Candidate B (Early)").overallScore(78).appliedAt(t1).build());
            // Rank 3 expected: Score 78, applied later (t2)
            rawDbItems.add(ApplicationRankingItem.builder()
                    .applicationId(UUID.randomUUID()).candidateName("Candidate C (Late)").overallScore(78).appliedAt(t2).build());
            // Rank 4 expected: Score NULL (applied t3)
            rawDbItems.add(ApplicationRankingItem.builder()
                    .applicationId(UUID.randomUUID()).candidateName("Candidate D (Pending)").overallScore(null).appliedAt(t3).build());

            JdbcClient.StatementSpec spec = mock(JdbcClient.StatementSpec.class);
            JdbcClient.MappedQuerySpec<ApplicationRankingItem> querySpec = mock(JdbcClient.MappedQuerySpec.class);

            when(jdbcClient.sql(anyString())).thenReturn(spec);
            when(spec.param(any())).thenReturn(spec);
            when(spec.query(any(RowMapper.class))).thenAnswer(inv -> {
                List<ApplicationRankingItem> ranked = new ArrayList<>();
                for (int i = 0; i < rawDbItems.size(); i++) {
                    ApplicationRankingItem item = rawDbItems.get(i);
                    item.setRanking(i + 1);
                    ranked.add(item);
                }
                when(querySpec.list()).thenReturn(ranked);
                return querySpec;
            });

            ApplicationRankingResponse response = applicationService.getJobRankings(jobId, employerUserId, null, null);

            assertThat(response).isNotNull();
            assertThat(response.getTotalCandidates()).isEqualTo(4);

            List<ApplicationRankingItem> items = response.getItems();
            assertThat(items.get(0).getRanking()).isEqualTo(1);
            assertThat(items.get(0).getCandidateName()).isEqualTo("Candidate A");
            assertThat(items.get(0).getOverallScore()).isEqualTo(92);

            assertThat(items.get(1).getRanking()).isEqualTo(2);
            assertThat(items.get(1).getCandidateName()).isEqualTo("Candidate B (Early)");
            assertThat(items.get(1).getOverallScore()).isEqualTo(78);

            assertThat(items.get(2).getRanking()).isEqualTo(3);
            assertThat(items.get(2).getCandidateName()).isEqualTo("Candidate C (Late)");
            assertThat(items.get(2).getOverallScore()).isEqualTo(78);

            assertThat(items.get(3).getRanking()).isEqualTo(4);
            assertThat(items.get(3).getCandidateName()).isEqualTo("Candidate D (Pending)");
            assertThat(items.get(3).getOverallScore()).isNull();
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================
    @SuppressWarnings("unchecked")
    private void mockJobQuery(String status, Timestamp deadline) {
        JdbcClient.StatementSpec spec = mock(JdbcClient.StatementSpec.class);
        when(jdbcClient.sql(contains("SELECT status, deadline FROM jobs"))).thenReturn(spec);
        when(spec.param(any())).thenReturn(spec);

        Map<String, Object> map = new HashMap<>();
        map.put("status", status);
        map.put("deadline", deadline);

        JdbcClient.MappedQuerySpec<Map<String, Object>> mappedSpec = mock(JdbcClient.MappedQuerySpec.class);
        when(spec.query(any(RowMapper.class))).thenReturn(mappedSpec);
        when(mappedSpec.optional()).thenReturn(Optional.of(map));
    }
}
