package com.matchajob.matching.service;

import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.ResourceAccessException;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingSchedulerTest {

    @Mock
    private ProcessingJobService processingJobService;

    @Mock
    private MatchingService matchingService;

    private MatchingScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new MatchingScheduler(
                processingJobService,
                matchingService
        );
    }

    @Test
    void poll_whenJobAvailable_passesClaimedJobLeaseToMatchingService() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";

        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .status("PROCESSING")
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        when(processingJobService.claimNextMatchingJob())
                .thenReturn(Optional.of(job));

        scheduler.poll();

        verify(processingJobService)
                .recoverExpiredMatchingLeases();

        verify(processingJobService)
                .claimNextMatchingJob();

        verify(matchingService)
                .evaluateApplicationMatch(job);

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    @Test
    void poll_whenMatchNotReady_doesNotMutateJobTwice() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";

        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .status("PROCESSING")
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        when(processingJobService.claimNextMatchingJob())
                .thenReturn(Optional.of(job));

        doThrow(new MatchingService.MatchNotReadyException(
                "CV extraction not complete"
        )).when(matchingService).evaluateApplicationMatch(job);

        scheduler.poll();

        verify(matchingService)
                .evaluateApplicationMatch(job);

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    @Test
    void poll_whenAiWorkerConnectionFails_doesNotMutateJobTwice() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";

        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .status("PROCESSING")
                .attemptCount(1)
                .maxAttempts(3)
                .build();

        when(processingJobService.claimNextMatchingJob())
                .thenReturn(Optional.of(job));

        doThrow(new ResourceAccessException("Connection refused"))
                .when(matchingService)
                .evaluateApplicationMatch(job);

        scheduler.poll();

        verify(matchingService)
                .evaluateApplicationMatch(job);

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    @Test
    void poll_doesNotFailJobTwiceWhenMatchingServiceAlreadyRescheduledIt() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();

        ProcessingJob claimed = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken("lease")
                .build();

        when(processingJobService.claimNextMatchingJob())
                .thenReturn(Optional.of(claimed));

        when(processingJobService.getJob(jobId))
                .thenReturn(Optional.of(
                        ProcessingJob.builder()
                                .id(jobId)
                                .status("PENDING")
                                .build()
                ));

        doThrow(new RuntimeException("worker failed"))
        .when(matchingService)
        .evaluateApplicationMatch(any(ProcessingJob.class));

        scheduler.poll();

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    @Test
    void poll_whenNoPendingJob_onlyRecoversExpiredLeases() {
        when(processingJobService.claimNextMatchingJob())
                .thenReturn(Optional.empty());

        scheduler.poll();

        verify(processingJobService)
                .recoverExpiredMatchingLeases();

        verify(processingJobService)
                .claimNextMatchingJob();

        verify(matchingService, never())
                .evaluateApplicationMatch(any(ProcessingJob.class));
    }
}
