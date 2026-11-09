package com.matchajob.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.model.ApplicationCvSnapshot;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.dto.MatchingResultResponse;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock
    private CvVersionRepository cvVersionRepository;

    @Mock
    private MatchResultRepository matchResultRepository;

    @Mock
    private AiWorkerClient aiWorkerClient;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationCvSnapshotRepository applicationCvSnapshotRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private ProcessingJobRepository processingJobRepository;

    @Mock
    private MatchingPersistenceService persistence;

    private MatchingService service;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();

        service = new MatchingService(
                cvVersionRepository,
                matchResultRepository,
                aiWorkerClient,
                objectMapper,
                new MatchingResultMapper(objectMapper),
                applicationRepository,
                applicationCvSnapshotRepository,
                jobRepository,
                processingJobRepository,
                persistence
        );
    }

    @Test
    void evaluatesUsingPersistedApplicationJobAndCvSnapshot() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(jobId)
                .build();

        CvVersion cvVersion = CvVersion.builder()
                .id(cvVersionId)
                .rawText("Experience with Java and Spring.")
                .parsedData("{\"skills\":[\"Java\",\"Spring\"]}")
                .build();

        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(applicationId)
                .cvVersion(cvVersion)
                .build();

        Job job = Job.builder()
                .id(jobId)
                .title("Backend Engineer")
                .requirements("Java, Spring Boot")
                .description("Build backend services")
                .build();

        MatchScoreResponse scoreResponse = MatchScoreResponse.builder()
                .overallScore(84)
                .skillsScore(80)
                .experienceScore(88)
                .breakdown(Map.of(
                        "required_skills_matched", List.of("Java", "Spring"),
                        "missing_skills", List.of("Spring Boot")
                ))
                .rationale("Relevant backend experience.")
                .build();

        ProcessingJob claimedJob = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .status("PROCESSING")
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .leaseToken("lease-test-token")
                .leaseExpiresAt(java.time.Instant.now().plusSeconds(120))
                .build();

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId))
                .thenReturn(Optional.of(job));

        when(persistence.claim(applicationId))
                .thenReturn(Optional.of(claimedJob));

        when(persistence.complete(
                any(ProcessingJob.class),
                any(MatchResult.class)
        )).thenAnswer(invocation -> invocation.getArgument(1));

        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class)))
                .thenReturn(scoreResponse);

        MatchResult result = service.evaluateApplicationMatch(applicationId);

        ArgumentCaptor<MatchScoreRequest> requestCaptor =
                ArgumentCaptor.forClass(MatchScoreRequest.class);

        verify(aiWorkerClient).calculateMatchScore(requestCaptor.capture());

        MatchScoreRequest request = requestCaptor.getValue();

        assertThat(request.getJobId()).isEqualTo(jobId.toString());
        assertThat(request.getJobTitle()).isEqualTo("Backend Engineer");
        assertThat(request.getJobRequirements()).contains("Java, Spring Boot");
        assertThat(request.getCvText())
                .isEqualTo("Experience with Java and Spring.");
        assertThat(request.getCandidateSkills())
                .containsExactly("Java", "Spring");

        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getJobId()).isEqualTo(jobId);
        assertThat(result.getCvVersionId()).isEqualTo(cvVersionId);
        assertThat(result.getOverallScore()).isEqualTo((short) 84);

        verify(persistence).claim(applicationId);
        verify(persistence).complete(
                eq(claimedJob),
                any(MatchResult.class)
        );
    }

    @Test
    void evaluatesAlreadyClaimedSchedulerLeaseWithoutClaimingAgain() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        ProcessingJob lease = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .status("PROCESSING")
                .leaseToken("scheduler-lease-token")
                .leaseExpiresAt(java.time.Instant.now().plusSeconds(120))
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(jobId)
                .build();
        CvVersion cv = CvVersion.builder()
                .id(cvVersionId)
                .rawText("Candidate experienced in Java and Spring Boot")
                .parsedData("{\"skills\":[\"Java\",\"Spring Boot\"]}")
                .build();
        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(applicationId)
                .cvVersion(cv)
                .build();
        Job job = Job.builder()
                .id(jobId)
                .title("Backend Engineer")
                .requirements("Java, Spring Boot")
                .build();
        MatchScoreResponse score = MatchScoreResponse.builder()
                .overallScore(86)
                .skillsScore(90)
                .experienceScore(82)
                .breakdown(Map.of("skills", 90))
                .rationale("Relevant experience")
                .build();

        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(application));
        when(applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));
        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(job));
        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class))).thenReturn(score);
        when(persistence.complete(eq(lease), any(MatchResult.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        MatchResult result = service.evaluateApplicationMatch(lease);

        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getOverallScore()).isEqualTo((short) 86);
        verify(persistence, never()).claim(applicationId);
        verify(persistence).complete(eq(lease), any(MatchResult.class));
        verify(persistence, never()).fail(any(ProcessingJob.class), anyString(), anyBoolean());
    }

    @Test
    void defersClaimedJobWhenCvSnapshotIsNotReadyAndPersistsRetryableFailureOnce() {
        UUID applicationId = UUID.randomUUID();
        ProcessingJob lease = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .status("PROCESSING")
                .leaseToken("scheduler-lease-token")
                .leaseExpiresAt(java.time.Instant.now().plusSeconds(120))
                .attemptCount(1)
                .maxAttempts(3)
                .build();
        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(UUID.randomUUID())
                .build();

        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(application));
        when(applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.evaluateApplicationMatch(lease))
                .isInstanceOf(MatchingService.MatchNotReadyException.class);

        verify(persistence).fail(
                eq(lease),
                eq("CV snapshot for this application is not available yet."),
                eq(true)
        );
        verify(persistence, never()).claim(applicationId);
        verify(aiWorkerClient, never()).calculateMatchScore(any());
    }

    @Test
    void returnsNotStartedStatusWithNullScoresWhenNoResultOrJobExists() {
        UUID applicationId = UUID.randomUUID();

        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(UUID.randomUUID())
                .build();

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(processingJobRepository
                .findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                        "APPLICATION_MATCHING",
                        "application",
                        applicationId
                ))
                .thenReturn(Optional.empty());

        when(applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        MatchingResultResponse result =
                service.getMatchResultStatus(applicationId);

        assertThat(result.getStatus()).isEqualTo("NOT_STARTED");
        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getOverallScore()).isNull();
        assertThat(result.getSkillsScore()).isNull();
        assertThat(result.getExperienceScore()).isNull();
        assertThat(result.getProcessingJobId()).isNull();
        assertThat(result.isRetryable()).isTrue();
    }

    @Test
    void rejectsInvalidAiScoreWithoutPersistingZeroAsAResult() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(jobId)
                .build();

        CvVersion cvVersion = CvVersion.builder()
                .id(cvVersionId)
                .rawText("CV text")
                .build();

        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(applicationId)
                .cvVersion(cvVersion)
                .build();

        Job job = Job.builder()
                .id(jobId)
                .title("Engineer")
                .build();

        ProcessingJob claimedJob = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .status("PROCESSING")
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .leaseToken("lease-test-token")
                .leaseExpiresAt(java.time.Instant.now().plusSeconds(120))
                .build();

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId))
                .thenReturn(Optional.of(job));

        when(persistence.claim(applicationId))
                .thenReturn(Optional.of(claimedJob));

        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class)))
                .thenReturn(MatchScoreResponse.builder()
                        .overallScore(null)
                        .build());

        assertThatThrownBy(() -> service.evaluateApplicationMatch(applicationId))
                .isInstanceOf(MatchingException.class)
                .hasMessageContaining("contract");

        verify(matchResultRepository, never()).save(any(MatchResult.class));

        verify(persistence).fail(
                eq(claimedJob),
                eq("Matching evaluation failed (IllegalStateException)."),
                eq(false)
        );
    }

    @Test
    void processingStateDoesNotOfferAnotherPostWhileAlreadyProcessing() {
        UUID applicationId = UUID.randomUUID();

        ProcessingJob processingJob = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .status("PROCESSING")
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(
                        ApplicationEntity.builder()
                                .id(applicationId)
                                .jobId(UUID.randomUUID())
                                .build()
                ));

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(processingJobRepository
                .findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                        "APPLICATION_MATCHING",
                        "application",
                        applicationId
                ))
                .thenReturn(Optional.of(processingJob));

        when(applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        MatchingResultResponse result =
                service.getMatchResultStatus(applicationId);

        assertThat(result.getStatus()).isEqualTo("PROCESSING");
        assertThat(result.isRetryable()).isFalse();
        assertThat(result.getAttemptCount()).isEqualTo(1);
        assertThat(result.getMaxAttempts()).isEqualTo(3);

        verify(aiWorkerClient, never())
                .calculateMatchScore(any());

        verify(persistence, never())
                .claim(applicationId);
    }

    @Test
    void evaluatesApplicationMatchOnAiWorkerExceptionMarksClaimFailedAsRetryable() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        ProcessingJob claimedJob = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .status("PROCESSING")
                .leaseToken("lease-test-token")
                .leaseExpiresAt(java.time.Instant.now().plusSeconds(120))
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(jobId)
                .build();

        CvVersion cvVersion = CvVersion.builder()
                .id(cvVersionId)
                .rawText("CV text")
                .build();

        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(applicationId)
                .cvVersion(cvVersion)
                .build();

        Job job = Job.builder()
                .id(jobId)
                .title("Engineer")
                .build();

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(applicationCvSnapshotRepository
                .findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId))
                .thenReturn(Optional.of(job));

        when(persistence.claim(applicationId))
                .thenReturn(Optional.of(claimedJob));

        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class)))
                .thenThrow(new org.springframework.web.client.ResourceAccessException(
                        "AI Worker connection failed"
                ));

        assertThatThrownBy(() -> service.evaluateApplicationMatch(applicationId))
                .isInstanceOf(MatchingException.class)
                .hasMessageContaining("Matching Worker could not complete");

        verify(persistence).fail(
                eq(claimedJob),
                eq("AI Worker connection failed."),
                eq(true)
        );

        verify(matchResultRepository, never())
                .save(any(MatchResult.class));
    }

    @Test
    void saveMatchResultTransactionWhenResultAlreadyExistsUpdatesExistingResultIdempotently() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        MatchResult existing = MatchResult.builder()
                .id(UUID.randomUUID())
                .applicationId(applicationId)
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .overallScore((short) 60)
                .skillsScore((short) 50)
                .experienceScore((short) 70)
                .breakdown("{}")
                .rationale("Previous score")
                .build();

        MatchScoreResponse updatedScore = MatchScoreResponse.builder()
                .overallScore(85)
                .skillsScore(90)
                .experienceScore(80)
                .rationale("New re-evaluated score")
                .breakdown(Map.of("skills", 90))
                .build();

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.of(existing));

        when(matchResultRepository.save(any(MatchResult.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MatchResult saved = service.saveMatchResultTransaction(
                applicationId,
                jobId,
                cvVersionId,
                updatedScore
        );

        assertThat(saved.getId()).isEqualTo(existing.getId());
        assertThat(saved.getOverallScore()).isEqualTo((short) 85);
        assertThat(saved.getSkillsScore()).isEqualTo((short) 90);
        assertThat(saved.getExperienceScore()).isEqualTo((short) 80);
        assertThat(saved.getRationale()).isEqualTo("New re-evaluated score");

        verify(matchResultRepository).save(existing);
    }

    @Test
    void saveMatchResultTransactionWhenResultDoesNotExistCreatesNewResult() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        MatchScoreResponse newScore = MatchScoreResponse.builder()
                .overallScore(92)
                .skillsScore(95)
                .experienceScore(88)
                .rationale("Excellent fit")
                .breakdown(Map.of("skills", 95))
                .build();

        when(matchResultRepository.findByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        when(matchResultRepository.save(any(MatchResult.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MatchResult saved = service.saveMatchResultTransaction(
                applicationId,
                jobId,
                cvVersionId,
                newScore
        );

        assertThat(saved).isNotNull();
        assertThat(saved.getApplicationId()).isEqualTo(applicationId);
        assertThat(saved.getJobId()).isEqualTo(jobId);
        assertThat(saved.getCvVersionId()).isEqualTo(cvVersionId);
        assertThat(saved.getOverallScore()).isEqualTo((short) 92);
        assertThat(saved.getSkillsScore()).isEqualTo((short) 95);
        assertThat(saved.getExperienceScore()).isEqualTo((short) 88);
        assertThat(saved.getRationale()).isEqualTo("Excellent fit");

        verify(matchResultRepository).save(any(MatchResult.class));
    }
}