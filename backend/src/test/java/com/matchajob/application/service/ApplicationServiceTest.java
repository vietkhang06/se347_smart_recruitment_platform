package com.matchajob.application.service;

import com.matchajob.application.dto.*;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.model.ApplicationStage;
import com.matchajob.application.model.ApplicationStatusHistory;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicationService Unit Tests")
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationStatusHistoryRepository historyRepository;

    @Mock
    private CvVersionRepository cvVersionRepository;

    @Mock
    private ApplicationCvSnapshotRepository snapshotRepository;

    @Mock
    private MatchResultRepository matchResultRepository;

    @Mock
    private ProcessingJobService processingJobService;

    @Mock
    private ApplicationStateMachine stateMachine;

    @Mock
    private JdbcClient jdbcClient;

    private ApplicationService applicationService;

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
                jdbcClient
        );
    }

    @Nested
    @DisplayName("Stage Transition Tests")
    class StageTransitions {

        @Test
        @DisplayName("updateStage successfully updates stage and saves audit history")
        void updateStage_success() {
            UUID appId = UUID.randomUUID();
            UUID hrUserId = UUID.randomUUID();

            ApplicationEntity app = ApplicationEntity.builder()
                    .id(appId)
                    .candidateId(UUID.randomUUID())
                    .jobId(UUID.randomUUID())
                    .stage("new")
                    .appliedAt(Instant.now().minusSeconds(3600))
                    .updatedAt(Instant.now().minusSeconds(3600))
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
            doNothing().when(stateMachine).validateTransition(ApplicationStage.NEW, ApplicationStage.SCREENING);
            when(applicationRepository.save(any(ApplicationEntity.class))).thenAnswer(i -> i.getArgument(0));

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .reason("Profile matches requirements, moving to screening")
                    .build();

            StageUpdateResponse response = applicationService.updateStage(appId, hrUserId, request);

            assertThat(response).isNotNull();
            assertThat(response.getApplicationId()).isEqualTo(appId);
            assertThat(response.getPreviousStage()).isEqualTo("new");
            assertThat(response.getCurrentStage()).isEqualTo("screening");

            // Verify entity saved with updated stage
            ArgumentCaptor<ApplicationEntity> appCaptor = ArgumentCaptor.forClass(ApplicationEntity.class);
            verify(applicationRepository).save(appCaptor.capture());
            assertThat(appCaptor.getValue().getStage()).isEqualTo("screening");

            // Verify status history recorded
            ArgumentCaptor<ApplicationStatusHistory> historyCaptor = ArgumentCaptor.forClass(ApplicationStatusHistory.class);
            verify(historyRepository).save(historyCaptor.capture());
            ApplicationStatusHistory savedHistory = historyCaptor.getValue();
            assertThat(savedHistory.getApplicationId()).isEqualTo(appId);
            assertThat(savedHistory.getFromStage()).isEqualTo("new");
            assertThat(savedHistory.getToStage()).isEqualTo("screening");
            assertThat(savedHistory.getChangedBy()).isEqualTo(hrUserId);
            assertThat(savedHistory.getReason()).isEqualTo("Profile matches requirements, moving to screening");
        }

        @Test
        @DisplayName("updateStage records rejection reason when transitioning to REJECTED")
        void updateStage_toRejected_recordsReason() {
            UUID appId = UUID.randomUUID();
            UUID hrUserId = UUID.randomUUID();

            ApplicationEntity app = ApplicationEntity.builder()
                    .id(appId)
                    .stage("screening")
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
            doNothing().when(stateMachine).validateTransition(ApplicationStage.SCREENING, ApplicationStage.REJECTED);
            when(applicationRepository.save(any(ApplicationEntity.class))).thenAnswer(i -> i.getArgument(0));

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("rejected")
                    .reason("Insufficient years of experience")
                    .build();

            applicationService.updateStage(appId, hrUserId, request);

            ArgumentCaptor<ApplicationEntity> appCaptor = ArgumentCaptor.forClass(ApplicationEntity.class);
            verify(applicationRepository).save(appCaptor.capture());
            assertThat(appCaptor.getValue().getRejectReason()).isEqualTo("Insufficient years of experience");
        }

        @Test
        @DisplayName("updateStage throws when application not found")
        void updateStage_notFound() {
            UUID appId = UUID.randomUUID();
            when(applicationRepository.findById(appId)).thenReturn(Optional.empty());

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .build();

            assertThatThrownBy(() -> applicationService.updateStage(appId, UUID.randomUUID(), request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Application not found");

            verify(applicationRepository, never()).save(any());
            verify(historyRepository, never()).save(any());
        }

        @Test
        @DisplayName("updateStage does not save when state machine rejects transition")
        void updateStage_stateMachineRejects() {
            UUID appId = UUID.randomUUID();
            ApplicationEntity app = ApplicationEntity.builder()
                    .id(appId)
                    .stage("rejected")
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
            doThrow(new IllegalStateException("Cannot transition from terminal stage 'rejected'."))
                    .when(stateMachine).validateTransition(ApplicationStage.REJECTED, ApplicationStage.INTERVIEW);

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("interview")
                    .build();

            assertThatThrownBy(() -> applicationService.updateStage(appId, UUID.randomUUID(), request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot transition from terminal stage");

            verify(applicationRepository, never()).save(any());
            verify(historyRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Status History Retrieval Tests")
    class StatusHistory {

        @Test
        @DisplayName("getApplicationHistory returns timeline ordered descending")
        void getApplicationHistory_success() {
            UUID appId = UUID.randomUUID();
            when(applicationRepository.existsById(appId)).thenReturn(true);

            Instant t1 = Instant.now().minusSeconds(7200);
            Instant t2 = Instant.now().minusSeconds(3600);

            ApplicationStatusHistory h1 = ApplicationStatusHistory.builder()
                    .id(UUID.randomUUID())
                    .applicationId(appId)
                    .fromStage("screening")
                    .toStage("interview")
                    .changedBy(UUID.randomUUID())
                    .reason("Passed test")
                    .createdAt(t2)
                    .build();

            ApplicationStatusHistory h2 = ApplicationStatusHistory.builder()
                    .id(UUID.randomUUID())
                    .applicationId(appId)
                    .fromStage(null)
                    .toStage("new")
                    .changedBy(UUID.randomUUID())
                    .reason("Applied")
                    .createdAt(t1)
                    .build();

            when(historyRepository.findByApplicationIdOrderByCreatedAtDesc(appId))
                    .thenReturn(List.of(h1, h2));

            List<ApplicationHistoryResponse> history = applicationService.getApplicationHistory(appId);

            assertThat(history).hasSize(2);
            assertThat(history.get(0).getToStage()).isEqualTo("interview");
            assertThat(history.get(1).getToStage()).isEqualTo("new");
        }

        @Test
        @DisplayName("getApplicationHistory throws when application does not exist")
        void getApplicationHistory_notFound() {
            UUID appId = UUID.randomUUID();
            when(applicationRepository.existsById(appId)).thenReturn(false);

            assertThatThrownBy(() -> applicationService.getApplicationHistory(appId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Application not found");
        }
    }

    @Nested
    @DisplayName("Candidate Ranking Tests")
    class CandidateRanking {

        @Test
        @DisplayName("getJobRankings sorts candidates by overall score descending and assigns 1-based ranks")
        void getJobRankings_ordersAndRanks() {
            UUID jobId = UUID.randomUUID();
            UUID cand1 = UUID.randomUUID();
            UUID cand2 = UUID.randomUUID();
            UUID app1Id = UUID.randomUUID();
            UUID app2Id = UUID.randomUUID();

            ApplicationEntity app1 = ApplicationEntity.builder()
                    .id(app1Id)
                    .candidateId(cand1)
                    .jobId(jobId)
                    .stage("interview")
                    .appliedAt(Instant.now())
                    .build();

            ApplicationEntity app2 = ApplicationEntity.builder()
                    .id(app2Id)
                    .candidateId(cand2)
                    .jobId(jobId)
                    .stage("screening")
                    .appliedAt(Instant.now())
                    .build();

            when(applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId)).thenReturn(List.of(app1, app2));

            // Candidate 1 score: 75
            MatchResult mr1 = MatchResult.builder()
                    .applicationId(app1Id)
                    .overallScore((short) 75)
                    .skillsScore((short) 80)
                    .experienceScore((short) 70)
                    .rationale("Good fit")
                    .breakdown("{}")
                    .build();

            // Candidate 2 score: 92 (should be ranked #1)
            MatchResult mr2 = MatchResult.builder()
                    .applicationId(app2Id)
                    .overallScore((short) 92)
                    .skillsScore((short) 95)
                    .experienceScore((short) 88)
                    .rationale("Excellent fit")
                    .breakdown("{}")
                    .build();

            when(matchResultRepository.findByApplicationId(app1Id)).thenReturn(Optional.of(mr1));
            when(matchResultRepository.findByApplicationId(app2Id)).thenReturn(Optional.of(mr2));

            // Stub candidate name lookup
            var mockSpec = mock(JdbcClient.StatementSpec.class);
            var mockQuerySpec = mock(JdbcClient.MappedQuerySpec.class);
            when(jdbcClient.sql(anyString())).thenReturn(mockSpec);
            when(mockSpec.param(any(UUID.class))).thenReturn(mockSpec);
            when(mockSpec.query(any(Class.class))).thenReturn(mockQuerySpec);
            when(mockQuerySpec.optional()).thenReturn(Optional.of("Candidate Name"));

            ApplicationRankingResponse response = applicationService.getJobRankings(jobId, null, null);

            assertThat(response).isNotNull();
            assertThat(response.getJobId()).isEqualTo(jobId);
            assertThat(response.getTotalCandidates()).isEqualTo(2);

            // Candidate 2 has score 92 -> Rank 1
            assertThat(response.getItems().get(0).getRanking()).isEqualTo(1);
            assertThat(response.getItems().get(0).getApplicationId()).isEqualTo(app2Id);
            assertThat(response.getItems().get(0).getOverallScore()).isEqualTo(92);

            // Candidate 1 has score 75 -> Rank 2
            assertThat(response.getItems().get(1).getRanking()).isEqualTo(2);
            assertThat(response.getItems().get(1).getApplicationId()).isEqualTo(app1Id);
            assertThat(response.getItems().get(1).getOverallScore()).isEqualTo(75);
        }
    }

    // =========================================================================
    // Helper method to stub job queries
    // =========================================================================

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubJobQuery(String status, Instant deadline) {
        var mockSpec = mock(JdbcClient.StatementSpec.class);
        var mockQuerySpec = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbcClient.sql(contains("FROM jobs"))).thenReturn(mockSpec);
        when(mockSpec.param(any(UUID.class))).thenReturn(mockSpec);
        when(mockSpec.query(any(RowMapper.class))).thenReturn(mockQuerySpec);

        if (status == null) {
            when(mockQuerySpec.optional()).thenReturn(Optional.empty());
        } else {
            Map<String, Object> row = new HashMap<>();
            row.put("status", status);
            row.put("deadline", deadline != null ? java.sql.Timestamp.from(deadline) : null);
            when(mockQuerySpec.optional()).thenReturn(Optional.of(row));
        }
    }

    // =========================================================================
    // Nested tests: SubmitApplication
    // =========================================================================

    @Nested
    @DisplayName("Submit Application Tests")
    class SubmitApplication {

        @Test
        @DisplayName("applyForJob successfully creates application, snapshot, history, and processing job")
        void applyForJob_success() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID cvVersionId = UUID.randomUUID();
            UUID createdAppId = UUID.randomUUID();
            UUID processingJobId = UUID.randomUUID();

            stubJobQuery("active", Instant.now().plusSeconds(86400));
            when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);

            CvVersion cvVersion = CvVersion.builder()
                    .id(cvVersionId)
                    .candidateId(candidateId)
                    .filePath("https://storage/cv.pdf")
                    .build();
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.of(cvVersion));

            when(applicationRepository.save(any(ApplicationEntity.class))).thenAnswer(invocation -> {
                ApplicationEntity entity = invocation.getArgument(0);
                entity.setId(createdAppId);
                return entity;
            });

            ProcessingJob pJob = ProcessingJob.builder()
                    .id(processingJobId)
                    .jobType("APPLICATION_MATCHING")
                    .build();
            when(processingJobService.createJob(eq("APPLICATION_MATCHING"), eq("application"), eq(createdAppId), anyString()))
                    .thenReturn(pJob);

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .coverLetter("Looking forward to joining.")
                    .build();

            ApplicationResponse response = applicationService.applyForJob(candidateId, userId, request);

            assertThat(response).isNotNull();
            assertThat(response.getApplicationId()).isEqualTo(createdAppId);
            assertThat(response.getCandidateId()).isEqualTo(candidateId);
            assertThat(response.getJobId()).isEqualTo(jobId);
            assertThat(response.getStage()).isEqualTo("new");
            assertThat(response.getProcessingJobId()).isEqualTo(processingJobId);
            assertThat(response.getMessage()).contains("Application submitted successfully");

            verify(snapshotRepository).save(any());
            verify(historyRepository).save(any(ApplicationStatusHistory.class));
            verify(processingJobService).createJob(eq("APPLICATION_MATCHING"), eq("application"), eq(createdAppId), anyString());
        }

        @Test
        @DisplayName("applyForJob throws DuplicateApplicationException when candidate already applied")
        void applyForJob_duplicateThrows409() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID cvVersionId = UUID.randomUUID();

            stubJobQuery("active", null);
            when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(true);

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .coverLetter("Duplicate attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(ApplicationService.DuplicateApplicationException.class)
                    .hasMessageContaining("already applied");

            verify(applicationRepository, never()).save(any());
            verify(snapshotRepository, never()).save(any());
        }

        @Test
        @DisplayName("applyForJob throws IllegalStateException when job is closed")
        void applyForJob_closedJobThrows() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            stubJobQuery("closed", null);

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(UUID.randomUUID())
                    .coverLetter("Closed job attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not accepting");
        }

        @Test
        @DisplayName("applyForJob throws IllegalStateException when deadline has passed")
        void applyForJob_deadlinePassed() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            stubJobQuery("active", Instant.now().minusSeconds(7200));

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(UUID.randomUUID())
                    .coverLetter("Expired job attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("deadline has passed");
        }

        @Test
        @DisplayName("applyForJob throws IllegalArgumentException when job does not exist")
        void applyForJob_jobNotFound() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            stubJobQuery(null, null);

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(UUID.randomUUID())
                    .coverLetter("Missing job attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Job not found");
        }

        @Test
        @DisplayName("applyForJob throws IllegalArgumentException when CV version not found")
        void applyForJob_cvNotFound() {
            UUID candidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID cvVersionId = UUID.randomUUID();

            stubJobQuery("active", null);
            when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.empty());

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .coverLetter("Missing CV attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("CV version not found");
        }

        @Test
        @DisplayName("applyForJob throws AccessDeniedException when CV belongs to another candidate")
        void applyForJob_cvNotBelongToCandidate() {
            UUID candidateId = UUID.randomUUID();
            UUID anotherCandidateId = UUID.randomUUID();
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID cvVersionId = UUID.randomUUID();

            stubJobQuery("active", null);
            when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);

            CvVersion cvVersion = CvVersion.builder()
                    .id(cvVersionId)
                    .candidateId(anotherCandidateId)
                    .filePath("https://storage/other_cv.pdf")
                    .build();
            when(cvVersionRepository.findById(cvVersionId)).thenReturn(Optional.of(cvVersion));

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvVersionId)
                    .coverLetter("Stolen CV attempt")
                    .build();

            assertThatThrownBy(() -> applicationService.applyForJob(candidateId, userId, request))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("CV version does not belong");
        }
    }

    // =========================================================================
    // Nested tests: ListAndDetailApplications
    // =========================================================================

    @Nested
    @DisplayName("List and Detail Application Tests")
    class ListAndDetailApplications {

        @Test
        @DisplayName("getMyApplications returns paginated applications")
        void getMyApplications_returnsPaginated() {
            UUID candidateId = UUID.randomUUID();
            ApplicationEntity app1 = ApplicationEntity.builder()
                    .id(UUID.randomUUID())
                    .candidateId(candidateId)
                    .jobId(UUID.randomUUID())
                    .stage("new")
                    .appliedAt(Instant.now().minusSeconds(100))
                    .build();
            ApplicationEntity app2 = ApplicationEntity.builder()
                    .id(UUID.randomUUID())
                    .candidateId(candidateId)
                    .jobId(UUID.randomUUID())
                    .stage("interview")
                    .appliedAt(Instant.now().minusSeconds(200))
                    .build();

            when(applicationRepository.findByCandidateId(eq(candidateId), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(app1, app2), PageRequest.of(0, 10), 2));

            ApplicationListResponse response = applicationService.getMyApplications(candidateId, 0, 10, null);

            assertThat(response).isNotNull();
            assertThat(response.getItems()).hasSize(2);
            assertThat(response.getTotalItems()).isEqualTo(2);
            assertThat(response.getPage()).isEqualTo(0);
            assertThat(response.getSize()).isEqualTo(10);
            assertThat(response.getTotalPages()).isEqualTo(1);
        }

        @Test
        @DisplayName("getMyApplications filters by stage")
        void getMyApplications_filterByStage() {
            UUID candidateId = UUID.randomUUID();
            ApplicationEntity app = ApplicationEntity.builder()
                    .id(UUID.randomUUID())
                    .candidateId(candidateId)
                    .jobId(UUID.randomUUID())
                    .stage("screening")
                    .appliedAt(Instant.now())
                    .build();

            when(applicationRepository.findByCandidateIdAndStage(eq(candidateId), eq("screening"), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(app), PageRequest.of(0, 10), 1));

            ApplicationListResponse response = applicationService.getMyApplications(candidateId, 0, 10, "screening");

            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getItems().get(0).getStage()).isEqualTo("screening");
            verify(applicationRepository).findByCandidateIdAndStage(eq(candidateId), eq("screening"), any(Pageable.class));
        }

        @Test
        @DisplayName("getApplicationDetail returns application detail when found")
        void getApplicationDetail_success() {
            UUID appId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            ApplicationEntity app = ApplicationEntity.builder()
                    .id(appId)
                    .candidateId(candidateId)
                    .jobId(jobId)
                    .stage("offer")
                    .coverLetter("Detail test cover letter")
                    .cvSnapshotUrl("https://snapshot.url")
                    .appliedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));

            ApplicationDetailResponse detail = applicationService.getApplicationDetail(appId);

            assertThat(detail).isNotNull();
            assertThat(detail.getApplicationId()).isEqualTo(appId);
            assertThat(detail.getCandidateId()).isEqualTo(candidateId);
            assertThat(detail.getJobId()).isEqualTo(jobId);
            assertThat(detail.getStage()).isEqualTo("offer");
            assertThat(detail.getCoverLetter()).isEqualTo("Detail test cover letter");
        }

        @Test
        @DisplayName("getApplicationDetail throws IllegalArgumentException when not found")
        void getApplicationDetail_notFound() {
            UUID appId = UUID.randomUUID();
            when(applicationRepository.findById(appId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> applicationService.getApplicationDetail(appId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Application not found");
        }

        @Test
        @DisplayName("getJobApplications returns applications for a job")
        void getJobApplications_returnsForEmployer() {
            UUID jobId = UUID.randomUUID();
            ApplicationEntity app = ApplicationEntity.builder()
                    .id(UUID.randomUUID())
                    .candidateId(UUID.randomUUID())
                    .jobId(jobId)
                    .stage("new")
                    .appliedAt(Instant.now())
                    .build();

            when(applicationRepository.findByJobId(eq(jobId), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(app), PageRequest.of(0, 10), 1));

            ApplicationListResponse response = applicationService.getJobApplications(jobId, 0, 10, null);

            assertThat(response).isNotNull();
            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getTotalItems()).isEqualTo(1);
        }

        @Test
        @DisplayName("getJobApplications filters by stage")
        void getJobApplications_filterByStage() {
            UUID jobId = UUID.randomUUID();
            ApplicationEntity app = ApplicationEntity.builder()
                    .id(UUID.randomUUID())
                    .candidateId(UUID.randomUUID())
                    .jobId(jobId)
                    .stage("interview")
                    .appliedAt(Instant.now())
                    .build();

            when(applicationRepository.findByJobIdAndStage(eq(jobId), eq("interview"), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(app), PageRequest.of(0, 10), 1));

            ApplicationListResponse response = applicationService.getJobApplications(jobId, 0, 10, "interview");

            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getItems().get(0).getStage()).isEqualTo("interview");
            verify(applicationRepository).findByJobIdAndStage(eq(jobId), eq("interview"), any(Pageable.class));
        }
    }
}
