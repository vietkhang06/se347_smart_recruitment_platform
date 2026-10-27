package com.matchajob.application;

import com.matchajob.MatchaJobApplication;
import com.matchajob.application.dto.*;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.model.ApplicationStatusHistory;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.client.stub.AiWorkerStub;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end integration tests for the Application workflow:
 * - Apply for job with CV version snapshot
 * - Status transition lifecycle (new -> screening -> interview -> offer -> hired)
 * - Candidate ranking sorted by AI match score
 * - Audit history tracking
 *
 * Runs against real PostgreSQL schema with Flyway V5.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles({"test", "ai-stub"})
@Tag("integration")
@DisplayName("Application Workflow Integration Tests")
class ApplicationWorkflowIT {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusHistoryRepository historyRepository;

    @Autowired
    private ApplicationCvSnapshotRepository snapshotRepository;

    @Autowired
    private CvVersionRepository cvVersionRepository;

    @Autowired
    private MatchResultRepository matchResultRepository;

    @Autowired
    private Optional<AiWorkerStub> aiWorkerStub;

    @Autowired
    private JdbcClient jdbcClient;

    // =========================================================================
    // Test fixtures
    // =========================================================================

    private record CandidateFixture(UUID userId, UUID candidateId) {}

    private CandidateFixture createCandidateFixture() {
        UUID userId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, 'hash', 'Test Candidate', 'candidate')
            """)
            .params(userId, "cand_" + userId + "@test.com")
            .update();

        jdbcClient.sql("""
            INSERT INTO candidate_profiles (id, user_id)
            VALUES (?, ?)
            """)
            .params(candidateId, userId)
            .update();

        return new CandidateFixture(userId, candidateId);
    }

    private UUID createEmployerUser() {
        UUID userId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, 'hash', 'Test Employer', 'employer')
            """)
            .params(userId, "emp_" + userId + "@test.com")
            .update();
        return userId;
    }

    private UUID createJobFixture(UUID employerUserId, String status, String title, String companyName) {
        UUID companyId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO companies (id, owner_id, name)
            VALUES (?, ?, ?)
            """)
            .params(companyId, employerUserId, companyName)
            .update();

        jdbcClient.sql("""
            INSERT INTO jobs (id, company_id, created_by, title, status, work_type, salary_mode, salary_min, salary_max)
            VALUES (?, ?, ?, ?, ?, 'full_time', 'range', 1000, 2000)
            """)
            .params(jobId, companyId, employerUserId, title, status)
            .update();

        return jobId;
    }

    private UUID createJobFixture(UUID employerUserId, String status) {
        return createJobFixture(employerUserId, status, "Backend Engineer", "Test Corp " + UUID.randomUUID());
    }

    private UUID createCvVersionFixture(UUID candidateId) {
        UUID cvId = UUID.randomUUID();
        CvVersion cvVersion = CvVersion.builder()
                .id(cvId)
                .candidateId(candidateId)
                .filePath("s3://bucket/resumes/" + cvId + ".pdf")
                .fileName("cv.pdf")
                .fileSizeBytes(1024)
                .mimeType("application/pdf")
                .sha256Hash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
                .status("extracted")
                .rawText("Java, Spring Boot, PostgreSQL, Docker developer with 4 years experience")
                .build();
        return cvVersionRepository.save(cvVersion).getId();
    }

    // =========================================================================
    // Tests
    // =========================================================================

    @Test
    @DisplayName("AI Worker Stub is active in test context")
    void aiWorkerStubIsActive() {
        assertThat(aiWorkerStub).isPresent();
        assertThat(aiWorkerStub.get().checkHealth()).containsEntry("status", "healthy");
    }

    @Test
    @DisplayName("End-to-end: Submit application -> creates snapshot -> records history -> queues matching")
    void submitApplication_success() {
        CandidateFixture cand = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");
        UUID cvVersionId = createCvVersionFixture(cand.candidateId());

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .coverLetter("I am very interested in this Backend position.")
                .build();

        ApplicationResponse body = applicationService.applyForJob(
                cand.candidateId(), cand.userId(), request);

        assertThat(body).isNotNull();
        assertThat(body.getApplicationId()).isNotNull();
        assertThat(body.getCandidateId()).isEqualTo(cand.candidateId());
        assertThat(body.getJobId()).isEqualTo(jobId);
        assertThat(body.getStage()).isEqualTo("new");
        assertThat(body.getProcessingJobId()).isNotNull();

        // 1. Verify Application persisted
        Optional<ApplicationEntity> savedApp = applicationRepository.findById(body.getApplicationId());
        assertThat(savedApp).isPresent();
        assertThat(savedApp.get().getStage()).isEqualTo("new");

        // 2. Verify ApplicationCvSnapshot persisted
        Optional<ApplicationCvSnapshot> snapshot = snapshotRepository.findByApplicationId(body.getApplicationId());
        assertThat(snapshot).isPresent();
        assertThat(snapshot.get().getCvVersion().getId()).isEqualTo(cvVersionId);

        // 3. Verify initial ApplicationStatusHistory persisted
        List<ApplicationStatusHistory> history = historyRepository.findByApplicationIdOrderByCreatedAtDesc(body.getApplicationId());
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getFromStage()).isNull();
        assertThat(history.get(0).getToStage()).isEqualTo("new");
        assertThat(history.get(0).getChangedBy()).isEqualTo(cand.userId());
    }

    @Test
    @DisplayName("Submit application fails with DuplicateApplicationException when duplicate application is attempted")
    void submitApplication_duplicateFailsWithConflict() {
        CandidateFixture cand = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");
        UUID cvVersionId = createCvVersionFixture(cand.candidateId());

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .coverLetter("First application")
                .build();

        // First apply succeeds
        ApplicationResponse first = applicationService.applyForJob(
                cand.candidateId(), cand.userId(), request);
        assertThat(first).isNotNull();

        // Second apply to same job throws DuplicateApplicationException
        assertThatThrownBy(() -> applicationService.applyForJob(cand.candidateId(), cand.userId(), request))
                .isInstanceOf(ApplicationService.DuplicateApplicationException.class)
                .hasMessageContaining("already applied");
    }

    @Test
    @DisplayName("Submit application fails when job is closed (status != active)")
    void submitApplication_closedJobFails() {
        CandidateFixture cand = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "closed");
        UUID cvVersionId = createCvVersionFixture(cand.candidateId());

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .build();

        assertThatThrownBy(() -> applicationService.applyForJob(cand.candidateId(), cand.userId(), request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not accepting applications");
    }

    @Test
    @DisplayName("Stage lifecycle: new -> screening -> interview -> offer -> hired with full audit trail")
    void stageTransitionLifecycle_fullAuditTrail() {
        CandidateFixture cand = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");
        UUID cvVersionId = createCvVersionFixture(cand.candidateId());

        ApplicationApplyRequest applyReq = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .build();

        ApplicationResponse app = applicationService.applyForJob(
                cand.candidateId(), cand.userId(), applyReq);
        UUID appId = app.getApplicationId();

        // 1. Transition: new -> screening
        StageUpdateResponse r1 = applicationService.updateStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("screening").reason("Good resume").build());
        assertThat(r1.getCurrentStage()).isEqualTo("screening");

        // 2. Transition: screening -> interview
        StageUpdateResponse r2 = applicationService.updateStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("interview").reason("Passed screening call").build());
        assertThat(r2.getCurrentStage()).isEqualTo("interview");

        // 3. Transition: interview -> offer
        StageUpdateResponse r3 = applicationService.updateStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("offer").reason("Passed tech interview").build());
        assertThat(r3.getCurrentStage()).isEqualTo("offer");

        // 4. Transition: offer -> hired (Terminal state)
        StageUpdateResponse r4 = applicationService.updateStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("hired").reason("Candidate accepted offer").build());
        assertThat(r4.getCurrentStage()).isEqualTo("hired");

        // 5. Verify full history (5 entries: initial new + 4 transitions)
        List<ApplicationHistoryResponse> history = applicationService.getApplicationHistory(appId, null);
        assertThat(history).hasSize(5);
        assertThat(history.get(0).getToStage()).isEqualTo("hired");
        assertThat(history.get(4).getToStage()).isEqualTo("new");

        // 6. Verify terminal state prevents further transitions
        assertThatThrownBy(() -> applicationService.updateStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("screening").reason("Reopen").build()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("terminal stage");
    }

    @Test
    @DisplayName("Candidate rankings returns sorted candidates by overall match score")
    void candidateRankings_sortedByScore() {
        CandidateFixture cand1 = createCandidateFixture();
        CandidateFixture cand2 = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");

        UUID cv1 = createCvVersionFixture(cand1.candidateId());
        UUID cv2 = createCvVersionFixture(cand2.candidateId());

        ApplicationResponse app1 = applicationService.applyForJob(
                cand1.candidateId(), cand1.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv1).build());

        ApplicationResponse app2 = applicationService.applyForJob(
                cand2.candidateId(), cand2.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv2).build());

        // Seed match results: Candidate 1 gets 60, Candidate 2 gets 95
        matchResultRepository.save(MatchResult.builder()
                .applicationId(app1.getApplicationId())
                .jobId(jobId)
                .cvVersionId(cv1)
                .overallScore((short) 60)
                .skillsScore((short) 65)
                .experienceScore((short) 55)
                .rationale("Moderate fit")
                .breakdown("{}")
                .build());

        matchResultRepository.save(MatchResult.builder()
                .applicationId(app2.getApplicationId())
                .jobId(jobId)
                .cvVersionId(cv2)
                .overallScore((short) 95)
                .skillsScore((short) 98)
                .experienceScore((short) 92)
                .rationale("Exceptional fit")
                .breakdown("{}")
                .build());

        // Get rankings
        ApplicationRankingResponse ranking = applicationService.getJobRankings(
                jobId, null, null, null);

        assertThat(ranking).isNotNull();
        assertThat(ranking.getTotalCandidates()).isEqualTo(2);

        // First item must be candidate 2 (score 95)
        assertThat(ranking.getItems().get(0).getRanking()).isEqualTo(1);
        assertThat(ranking.getItems().get(0).getApplicationId()).isEqualTo(app2.getApplicationId());
        assertThat(ranking.getItems().get(0).getOverallScore()).isEqualTo(95);

        // Second item must be candidate 1 (score 60)
        assertThat(ranking.getItems().get(1).getRanking()).isEqualTo(2);
        assertThat(ranking.getItems().get(1).getApplicationId()).isEqualTo(app1.getApplicationId());
        assertThat(ranking.getItems().get(1).getOverallScore()).isEqualTo(60);
    }

    @Test
    @DisplayName("Submitting application with CV version belonging to another candidate fails with AccessDeniedException")
    void submitApplication_cvBelongsToOtherCandidate_fails() {
        CandidateFixture cand1 = createCandidateFixture();
        CandidateFixture cand2 = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");

        UUID cvVersion2 = createCvVersionFixture(cand2.candidateId());

        assertThatThrownBy(() -> applicationService.applyForJob(
                cand1.candidateId(), cand1.userId(),
                ApplicationApplyRequest.builder()
                        .jobId(jobId)
                        .cvVersionId(cvVersion2)
                        .coverLetter("Attempt to use another candidate's CV")
                        .build()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not belong to this candidate");
    }

    @Test
    @DisplayName("getApplicationDetail returns complete enriched application info")
    void getApplicationDetail_returnsFullInfo() {
        CandidateFixture candidate = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active", "Software Engineer", "Acme Corp");
        UUID cvVersionId = createCvVersionFixture(candidate.candidateId());

        ApplicationResponse app = applicationService.applyForJob(
                candidate.candidateId(), candidate.userId(),
                ApplicationApplyRequest.builder()
                        .jobId(jobId)
                        .cvVersionId(cvVersionId)
                        .coverLetter("Full info test")
                        .build());

        ApplicationDetailResponse detail = applicationService.getApplicationDetail(app.getApplicationId(), null);

        assertThat(detail).isNotNull();
        assertThat(detail.getApplicationId()).isEqualTo(app.getApplicationId());
        assertThat(detail.getCandidateId()).isEqualTo(candidate.candidateId());
        assertThat(detail.getJobId()).isEqualTo(jobId);
        assertThat(detail.getStage()).isEqualTo("new");
        assertThat(detail.getCandidateName()).isEqualTo("Test Candidate");
        assertThat(detail.getJobTitle()).isEqualTo("Software Engineer");
        assertThat(detail.getCompanyName()).isEqualTo("Acme Corp");
    }

    @Test
    @DisplayName("getMyApplications returns paginated and filtered applications for candidate")
    void getMyApplications_paginatedAndFiltered() {
        CandidateFixture candidate = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID job1 = createJobFixture(employerId, "active");
        UUID job2 = createJobFixture(employerId, "active");
        UUID cv1 = createCvVersionFixture(candidate.candidateId());
        UUID cv2 = createCvVersionFixture(candidate.candidateId());

        ApplicationResponse app1 = applicationService.applyForJob(
                candidate.candidateId(), candidate.userId(),
                ApplicationApplyRequest.builder().jobId(job1).cvVersionId(cv1).build());

        ApplicationResponse app2 = applicationService.applyForJob(
                candidate.candidateId(), candidate.userId(),
                ApplicationApplyRequest.builder().jobId(job2).cvVersionId(cv2).build());

        // Transition app1 to screening
        applicationService.updateStage(app1.getApplicationId(), employerId,
                ApplicationStageUpdateRequest.builder().toStage("screening").build());

        // Query all
        ApplicationListResponse allApps = applicationService.getMyApplications(
                candidate.candidateId(), null, 0, 10, null);
        assertThat(allApps.getTotalItems()).isGreaterThanOrEqualTo(2);

        // Query filtered by screening
        ApplicationListResponse screeningApps = applicationService.getMyApplications(
                candidate.candidateId(), null, 0, 10, "screening");
        assertThat(screeningApps.getItems())
                .allMatch(item -> "screening".equalsIgnoreCase(item.getStage()));
    }

    @Test
    @DisplayName("getJobApplications returns applications for HR/employer view")
    void getJobApplications_employerView() {
        CandidateFixture cand1 = createCandidateFixture();
        CandidateFixture cand2 = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");
        UUID cv1 = createCvVersionFixture(cand1.candidateId());
        UUID cv2 = createCvVersionFixture(cand2.candidateId());

        applicationService.applyForJob(cand1.candidateId(), cand1.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv1).build());
        applicationService.applyForJob(cand2.candidateId(), cand2.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv2).build());

        ApplicationListResponse jobApps = applicationService.getJobApplications(jobId, null, 0, 10, null);

        assertThat(jobApps.getTotalItems()).isEqualTo(2);
        assertThat(jobApps.getItems()).hasSize(2);
    }

    @Test
    @DisplayName("updateStage fails when transition violates state machine rules")
    void updateStage_invalidTransition_fails() {
        CandidateFixture candidate = createCandidateFixture();
        UUID employerId = createEmployerUser();
        UUID jobId = createJobFixture(employerId, "active");
        UUID cvId = createCvVersionFixture(candidate.candidateId());

        ApplicationResponse app = applicationService.applyForJob(candidate.candidateId(), candidate.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cvId).build());

        // Direct transition from new to offer violates state machine
        assertThatThrownBy(() -> applicationService.updateStage(
                app.getApplicationId(), employerId,
                ApplicationStageUpdateRequest.builder().toStage("offer").reason("Skipping stages").build()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid stage transition");
    }
}
