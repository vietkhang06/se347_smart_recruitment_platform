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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchingSchedulerTest {

    @Mock
    private ProcessingJobService processingJobService;

    @Mock
    private MatchingService matchingService;

    private MatchingScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new MatchingScheduler(processingJobService, matchingService);
    }

    @Test
    void poll_whenJobAvailable_executesMatchingWithLeaseToken() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";
        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .attemptCount(1)
                .build();

        when(processingJobService.claimNextMatchingJob()).thenReturn(Optional.of(job));

        scheduler.poll();

        verify(processingJobService).recoverExpiredMatchingLeases();
        verify(matchingService).evaluateApplicationMatch(applicationId, leaseToken);
        verify(processingJobService, never()).markJobFailed(any(), anyString(), anyBoolean());
    }

    @Test
    void poll_whenMatchNotReady_defersJobWithRetryableTrue() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";
        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .attemptCount(1)
                .build();

        when(processingJobService.claimNextMatchingJob()).thenReturn(Optional.of(job));
        doThrow(new MatchingService.MatchNotReadyException("CV extraction not complete"))
                .when(matchingService).evaluateApplicationMatch(applicationId, leaseToken);

        scheduler.poll();

        verify(processingJobService).markJobFailed(eq(jobId), eq("CV extraction not complete"), eq(true));
    }

    @Test
    void poll_whenAiWorkerConnectionFails_marksJobFailedWithRetryableTrue() {
        UUID jobId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        String leaseToken = "lease-12345";
        ProcessingJob job = ProcessingJob.builder()
                .id(jobId)
                .entityId(applicationId)
                .leaseToken(leaseToken)
                .attemptCount(1)
                .build();

        when(processingJobService.claimNextMatchingJob()).thenReturn(Optional.of(job));
        doThrow(new ResourceAccessException("Connection refused"))
                .when(matchingService).evaluateApplicationMatch(applicationId, leaseToken);

        scheduler.poll();

        verify(processingJobService).markJobFailed(eq(jobId), contains("temporarily unavailable"), eq(true));
    }

    @Test
    void poll_whenNoPendingJob_onlyRecoversExpiredLeases() {
        when(processingJobService.claimNextMatchingJob()).thenReturn(Optional.empty());

        scheduler.poll();

        verify(processingJobService).recoverExpiredMatchingLeases();
        verify(matchingService, never()).evaluateApplicationMatch(any(), any());
    }
}
