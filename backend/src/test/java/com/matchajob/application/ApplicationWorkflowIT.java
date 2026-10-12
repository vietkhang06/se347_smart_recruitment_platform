package com.matchajob.application;

import com.matchajob.MatchaJobApplication;
import com.matchajob.application.controller.ApplicationController;
import com.matchajob.application.dto.*;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.model.ApplicationStatusHistory;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.client.stub.AiWorkerStub;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end integration tests for the Application recruitment workflow.
 * Uses the deterministic AI Worker Stub (ai-stub profile) for completely offline testing.
 * Runs against real PostgreSQL schema with Flyway V5.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles({"test", "ai-stub"})
@Tag("integration")
@DisplayName("Application Workflow Integration Tests")
class ApplicationWorkflowIT {

    @Autowired
    private ApplicationController applicationController;

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

    private UUID createJobFixture(UUID employerUserId, String status) {
        UUID companyId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO companies (id, owner_id, name)
            VALUES (?, ?, 'Test Corp ' || ?)
            """)
            .params(companyId, employerUserId, companyId.toString().substring(0, 8))
            .update();

        jdbcClient.sql("""
            INSERT INTO jobs (id, company_id, created_by, title, status, work_type, salary_mode)
            VALUES (?, ?, ?, 'Senior Backend Engineer', ?, 'full_time', 'negotiable')
            """)
            .params(jobId, companyId, employerUserId, status)
            .update();

        return jobId;
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

        ResponseEntity<ApplicationResponse> response = applicationController.submitApplication(
                cand.candidateId(), cand.userId(), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ApplicationResponse body = response.getBody();
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
    @DisplayName("Submit application fails with 409 Conflict when duplicate application is attempted")
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
        ResponseEntity<ApplicationResponse> first = applicationController.submitApplication(
                cand.candidateId(), cand.userId(), request);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Second apply to same job throws 409 Conflict
        assertThatThrownBy(() -> applicationController.submitApplication(cand.candidateId(), cand.userId(), request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(rse.getReason()).contains("already applied");
                });
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

        assertThatThrownBy(() -> applicationController.submitApplication(cand.candidateId(), cand.userId(), request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
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

        ApplicationResponse app = applicationController.submitApplication(
                cand.candidateId(), cand.userId(), applyReq).getBody();
        UUID appId = app.getApplicationId();

        // 1. Transition: new -> screening
        ResponseEntity<StageUpdateResponse> r1 = applicationController.updateApplicationStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("screening").reason("Good resume").build());
        assertThat(r1.getBody().getCurrentStage()).isEqualTo("screening");

        // 2. Transition: screening -> interview
        ResponseEntity<StageUpdateResponse> r2 = applicationController.updateApplicationStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("interview").reason("Passed screening call").build());
        assertThat(r2.getBody().getCurrentStage()).isEqualTo("interview");

        // 3. Transition: interview -> offer
        ResponseEntity<StageUpdateResponse> r3 = applicationController.updateApplicationStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("offer").reason("Passed tech interview").build());
        assertThat(r3.getBody().getCurrentStage()).isEqualTo("offer");

        // 4. Transition: offer -> hired (Terminal state)
        ResponseEntity<StageUpdateResponse> r4 = applicationController.updateApplicationStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("hired").reason("Candidate accepted offer").build());
        assertThat(r4.getBody().getCurrentStage()).isEqualTo("hired");

        // 5. Verify full history (5 entries: initial new + 4 transitions)
        ResponseEntity<List<ApplicationHistoryResponse>> histResp = applicationController.getApplicationHistory(appId);
        List<ApplicationHistoryResponse> history = histResp.getBody();
        assertThat(history).hasSize(5);
        assertThat(history.get(0).getToStage()).isEqualTo("hired");
        assertThat(history.get(4).getToStage()).isEqualTo("new");

        // 6. Verify terminal state prevents further transitions
        assertThatThrownBy(() -> applicationController.updateApplicationStage(
                appId, employerId,
                ApplicationStageUpdateRequest.builder().toStage("screening").reason("Reopen").build()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("terminal stage");
                });
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

        ApplicationResponse app1 = applicationController.submitApplication(
                cand1.candidateId(), cand1.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv1).build()).getBody();

        ApplicationResponse app2 = applicationController.submitApplication(
                cand2.candidateId(), cand2.userId(),
                ApplicationApplyRequest.builder().jobId(jobId).cvVersionId(cv2).build()).getBody();

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
        ResponseEntity<ApplicationRankingResponse> rankResp = applicationController.getJobRanking(
                jobId, null, null);

        assertThat(rankResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        ApplicationRankingResponse ranking = rankResp.getBody();
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
}
