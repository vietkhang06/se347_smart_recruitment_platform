package com.matchajob.processing.service;

import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProcessingJobService Unit Tests")
class ProcessingJobServiceTest {

    @Mock
    private ProcessingJobRepository jobRepository;

    private ProcessingJobService service;

    @BeforeEach
    void setUp() {
        service = new ProcessingJobService(jobRepository);
    }

    @Nested
    @DisplayName("Idempotent Job Creation Tests")
    class IdempotencyTests {

        @Test
        @DisplayName("createJob returns existing job when idempotency key is already present")
        void createJob_whenExistingFound_returnsExistingJob() {
            String key = "app_match_123";
            ProcessingJob existing = ProcessingJob.builder()
                    .id(UUID.randomUUID())
                    .idempotencyKey(key)
                    .status("PENDING")
                    .build();

            when(jobRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

            ProcessingJob result = service.createJob("APPLICATION_MATCHING", "application", UUID.randomUUID(), key);

            assertThat(result.getId()).isEqualTo(existing.getId());
            verify(jobRepository, never()).save(any());
        }

        @Test
        @DisplayName("createJob creates and saves a new job when idempotency key is new")
        void createJob_whenNew_savesAndReturnsJob() {
            String key = "app_match_new";
            UUID entityId = UUID.randomUUID();

            when(jobRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
            when(jobRepository.save(any(ProcessingJob.class))).thenAnswer(invocation -> {
                ProcessingJob j = invocation.getArgument(0);
                j.setId(UUID.randomUUID());
                return j;
            });

            ProcessingJob result = service.createJob("APPLICATION_MATCHING", "application", entityId, key);

            assertThat(result).isNotNull();
            assertThat(result.getIdempotencyKey()).isEqualTo(key);
            assertThat(result.getStatus()).isEqualTo("PENDING");
            assertThat(result.getAttemptCount()).isEqualTo(0);
            assertThat(result.getMaxAttempts()).isEqualTo(3);
            verify(jobRepository).save(any(ProcessingJob.class));
        }

        @Test
        @DisplayName("createJob recovers gracefully when concurrent insert throws DataIntegrityViolationException")
        void createJob_whenConcurrentInsertThrowsDataIntegrityViolation_recoversAndReturnsExistingJob() {
            String key = "app_match_concurrent";
            UUID entityId = UUID.randomUUID();

            ProcessingJob existingAfterRace = ProcessingJob.builder()
                    .id(UUID.randomUUID())
                    .idempotencyKey(key)
                    .status("PENDING")
                    .build();

            // First check returns empty
            when(jobRepository.findByIdempotencyKey(key))
                    .thenReturn(Optional.empty())
                    .thenReturn(Optional.of(existingAfterRace)); // Subsequent check after race condition

            // Save throws duplicate key exception
            when(jobRepository.save(any(ProcessingJob.class)))
                    .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint uq_processing_idempotency"));

            ProcessingJob result = service.createJob("APPLICATION_MATCHING", "application", entityId, key);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(existingAfterRace.getId());
            verify(jobRepository, times(2)).findByIdempotencyKey(key);
        }
    }

    @Nested
    @DisplayName("Failure & Exponential Backoff Tests")
    class FailureAndRetryTests {

        @Test
        @DisplayName("markJobFailed with retryable=true reschedules job with exponential backoff")
        void markJobFailed_retryable_reschedulesWithBackoff() {
            UUID jobId = UUID.randomUUID();
            ProcessingJob job = ProcessingJob.builder()
                    .id(jobId)
                    .status("PROCESSING")
                    .attemptCount(1)
                    .maxAttempts(3)
                    .build();

            when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
            when(jobRepository.save(any(ProcessingJob.class))).thenAnswer(i -> i.getArgument(0));

            service.markJobFailed(jobId, "AI Worker timeout", true);

            assertThat(job.getStatus()).isEqualTo("PENDING");
            assertThat(job.getLastError()).isEqualTo("AI Worker timeout");
            assertThat(job.getLeaseToken()).isNull();
            assertThat(job.getRetryAfter()).isAfter(Instant.now());
            verify(jobRepository).save(job);
        }

        @Test
        @DisplayName("markJobFailed marks job as FAILED permanently when max attempts reached")
        void markJobFailed_maxAttemptsReached_marksPermanentlyFailed() {
            UUID jobId = UUID.randomUUID();
            ProcessingJob job = ProcessingJob.builder()
                    .id(jobId)
                    .status("PROCESSING")
                    .attemptCount(3)
                    .maxAttempts(3)
                    .build();

            when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
            when(jobRepository.save(any(ProcessingJob.class))).thenAnswer(i -> i.getArgument(0));

            service.markJobFailed(jobId, "AI Worker down", true);

            assertThat(job.getStatus()).isEqualTo("FAILED");
            assertThat(job.getLastError()).isEqualTo("AI Worker down");
            verify(jobRepository).save(job);
        }
    }

    @Nested
    @DisplayName("Lease Recovery Tests")
    class LeaseRecoveryTests {

        @Test
        @DisplayName("recoverExpiredMatchingLeases delegates to repository")
        void recoverExpiredMatchingLeases_delegatesToRepository() {
            when(jobRepository.recoverExpiredMatchingLeases(any(Instant.class))).thenReturn(2);

            int recovered = service.recoverExpiredMatchingLeases();

            assertThat(recovered).isEqualTo(2);
            verify(jobRepository).recoverExpiredMatchingLeases(any(Instant.class));
        }
    }
}
