package com.matchajob.matching.service;

import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingPersistenceServiceTest {

    @Mock
    private ApplicationRepository applications;

    @Mock
    private ProcessingJobRepository jobs;

    @Mock
    private MatchResultRepository results;

    private MatchingPersistenceService persistence;

    @BeforeEach
    void setUp() {
        persistence = new MatchingPersistenceService(applications, jobs, results);
    }

    @Test
    void failDoesNotOverwriteStateWhenLeaseTokenBelongsToAnotherWorker() {
        UUID jobId = UUID.randomUUID();
        ProcessingJob lease = lease(jobId, "old-worker-token", Instant.now().plusSeconds(60));
        ProcessingJob current = lease(jobId, "new-worker-token", Instant.now().plusSeconds(60));
        current.setEntityId(lease.getEntityId());
        current.setAttemptCount(2);

        when(jobs.findByIdForUpdate(jobId)).thenReturn(Optional.of(current));

        persistence.fail(lease, "AI Worker connection failed.", true);

        assertThat(current.getStatus()).isEqualTo("PROCESSING");
        assertThat(current.getLeaseToken()).isEqualTo("new-worker-token");
        verify(jobs, never()).save(any(ProcessingJob.class));
    }

    @Test
    void failDoesNotOverwriteStateWhenLeaseHasExpired() {
        UUID jobId = UUID.randomUUID();
        Instant expiredAt = Instant.now().minusSeconds(10);
        ProcessingJob lease = lease(jobId, "expired-token", expiredAt);
        ProcessingJob current = lease(jobId, "expired-token", expiredAt);
        current.setEntityId(lease.getEntityId());

        when(jobs.findByIdForUpdate(jobId)).thenReturn(Optional.of(current));

        persistence.fail(lease, "AI Worker connection failed.", true);

        assertThat(current.getStatus()).isEqualTo("PROCESSING");
        assertThat(current.getLeaseToken()).isEqualTo("expired-token");
        verify(jobs, never()).save(any(ProcessingJob.class));
    }

    @Test
    void failSchedulesRetryOnlyForTheCurrentLiveLease() {
        UUID jobId = UUID.randomUUID();
        ProcessingJob lease = lease(jobId, "active-token", Instant.now().plusSeconds(60));
        ProcessingJob current = lease(jobId, "active-token", Instant.now().plusSeconds(60));
        current.setEntityId(lease.getEntityId());
        current.setAttemptCount(1);
        current.setMaxAttempts(3);
        when(jobs.findByIdForUpdate(jobId)).thenReturn(Optional.of(current));
        when(jobs.save(any(ProcessingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        persistence.fail(lease, "AI Worker connection failed.", true);

        assertThat(current.getStatus()).isEqualTo("PENDING");
        assertThat(current.getLastError()).isEqualTo("AI Worker connection failed.");
        assertThat(current.getLeaseToken()).isNull();
        assertThat(current.getLeaseExpiresAt()).isNull();
        assertThat(current.getRetryAfter()).isAfter(Instant.now());
        verify(jobs).save(current);
    }

    private ProcessingJob lease(UUID jobId, String token, Instant expiresAt) {
        return ProcessingJob.builder()
                .id(jobId)
                .jobType("APPLICATION_MATCHING")
                .entityType("application")
                .entityId(UUID.randomUUID())
                .status("PROCESSING")
                .leaseToken(token)
                .leaseExpiresAt(expiresAt)
                .attemptCount(1)
                .maxAttempts(3)
                .build();
    }
}
