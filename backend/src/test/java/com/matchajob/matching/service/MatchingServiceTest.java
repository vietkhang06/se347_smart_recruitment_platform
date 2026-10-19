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
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private AiWorkerClient aiWorkerClient;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationCvSnapshotRepository applicationCvSnapshotRepository;
    @Mock private JobRepository jobRepository;
    @Mock private ProcessingJobRepository processingJobRepository;
    @Mock private ProcessingJobService processingJobService;

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
                processingJobService);
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
                        "missing_skills", List.of("Spring Boot")))
                .rationale("Relevant backend experience.")
                .build();

        when(processingJobRepository.findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "APPLICATION_MATCHING", "application", applicationId)).thenReturn(Optional.empty());
        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(application));
        when(applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));
        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(job));
        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class))).thenReturn(scoreResponse);
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchResult result = service.evaluateApplicationMatch(applicationId);

        ArgumentCaptor<MatchScoreRequest> requestCaptor = ArgumentCaptor.forClass(MatchScoreRequest.class);
        verify(aiWorkerClient).calculateMatchScore(requestCaptor.capture());
        MatchScoreRequest request = requestCaptor.getValue();
        assertThat(request.getJobId()).isEqualTo(jobId.toString());
        assertThat(request.getJobTitle()).isEqualTo("Backend Engineer");
        assertThat(request.getJobRequirements()).contains("Java, Spring Boot");
        assertThat(request.getCvText()).isEqualTo("Experience with Java and Spring.");
        assertThat(request.getCandidateSkills()).containsExactly("Java", "Spring");
        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getJobId()).isEqualTo(jobId);
        assertThat(result.getCvVersionId()).isEqualTo(cvVersionId);
        assertThat(result.getOverallScore()).isEqualTo((short) 84);
    }

    @Test
    void returnsNotStartedStatusWithNullScoresWhenNoResultOrJobExists() {
        UUID applicationId = UUID.randomUUID();
        ApplicationEntity application = ApplicationEntity.builder()
                .id(applicationId)
                .jobId(UUID.randomUUID())
                .build();
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(application));
        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());
        when(processingJobRepository.findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "APPLICATION_MATCHING", "application", applicationId)).thenReturn(Optional.empty());
        when(applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.empty());

        MatchingResultResponse result = service.getMatchResultStatus(applicationId);

        assertThat(result.getStatus()).isEqualTo("NOT_STARTED");
        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getOverallScore()).isNull();
        assertThat(result.getSkillsScore()).isNull();
        assertThat(result.getExperienceScore()).isNull();
        assertThat(result.getProcessingJobId()).isNull();
    }

    @Test
    void rejectsInvalidAiScoreWithoutPersistingZeroAsAResult() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();
        ApplicationEntity application = ApplicationEntity.builder().id(applicationId).jobId(jobId).build();
        CvVersion cvVersion = CvVersion.builder().id(cvVersionId).rawText("CV text").build();
        ApplicationCvSnapshot snapshot = ApplicationCvSnapshot.builder()
                .applicationId(applicationId).cvVersion(cvVersion).build();
        Job job = Job.builder().id(jobId).title("Engineer").build();

        when(processingJobRepository.findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "APPLICATION_MATCHING", "application", applicationId)).thenReturn(Optional.empty());
        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(application));
        when(applicationCvSnapshotRepository.findWithCvVersionByApplicationId(applicationId))
                .thenReturn(Optional.of(snapshot));
        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(job));
        when(aiWorkerClient.calculateMatchScore(any(MatchScoreRequest.class)))
                .thenReturn(MatchScoreResponse.builder().overallScore(null).build());

        assertThatThrownBy(() -> service.evaluateApplicationMatch(applicationId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("invalid overall");
        verify(matchResultRepository, never()).save(any(MatchResult.class));
    }

    @Test
    void doesNotRestartAnAlreadyProcessingJob() {
        UUID applicationId = UUID.randomUUID();
        ProcessingJob processingJob = ProcessingJob.builder()
                .id(UUID.randomUUID())
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(applicationId)
                .status("PROCESSING")
                .retryAfter(Instant.now())
                .build();
        when(processingJobRepository.findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                eq("APPLICATION_MATCHING"), eq("application"), eq(applicationId)))
                .thenReturn(Optional.of(processingJob));
        when(matchResultRepository.findByApplicationId(applicationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.evaluateApplicationMatch(applicationId))
                .isInstanceOf(MatchingService.MatchNotReadyException.class)
                .hasMessageContaining("already being processed");
        verify(applicationRepository, never()).findById(applicationId);
        verify(aiWorkerClient, never()).calculateMatchScore(any(MatchScoreRequest.class));
    }
}
