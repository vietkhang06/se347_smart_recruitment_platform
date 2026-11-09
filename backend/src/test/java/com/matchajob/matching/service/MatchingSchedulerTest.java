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

    /**
     * Verifies that the scheduler passes the already-claimed ProcessingJob
     * to MatchingService, including its lease token.
     *
     * The scheduler must not mark the job as failed because
     * MatchingService owns the processing result.
     */
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

    /**
     * Verifies that a MatchNotReadyException is handled without
     * updating the job status a second time in the scheduler.
     *
     * MatchingService is responsible for processing state transitions.
     */
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

        doThrow(
                new MatchingService.MatchNotReadyException(
                        "CV extraction not complete"
                )
        ).when(matchingService).evaluateApplicationMatch(job);

        scheduler.poll();

        verify(matchingService)
                .evaluateApplicationMatch(job);

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    /**
     * Verifies that an AI Worker connection failure does not cause
     * the scheduler to update the job status a second time.
     *
     * Retry and failure handling belong to MatchingService.
     */
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

        doThrow(
                new ResourceAccessException("Connection refused")
        ).when(matchingService).evaluateApplicationMatch(job);

        scheduler.poll();

        verify(matchingService)
                .evaluateApplicationMatch(job);

        verify(processingJobService, never())
                .markJobFailed(any(), anyString(), anyBoolean());
    }

    /**
     * Verifies that the scheduler only recovers expired leases
     * and does not invoke MatchingService when no pending job exists.
     */
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
