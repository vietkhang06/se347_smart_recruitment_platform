package com.matchajob.processing.dto;

import com.matchajob.processing.model.ProcessingJob;
import java.time.Instant;
import java.util.UUID;

/** Public job progress; excludes leases, idempotency keys, and raw worker/database errors. */
public record ProcessingJobResponse(UUID id, String jobType, String entityType, UUID entityId, String status,
        Integer attemptCount, Integer maxAttempts, Instant retryAfter, String lastError,
        Instant startedAt, Instant completedAt, Instant createdAt, Instant updatedAt) {
    public static ProcessingJobResponse from(ProcessingJob job) {
        String safeError = job.getLastError() == null ? null : "Processing did not complete successfully.";
        return new ProcessingJobResponse(job.getId(), job.getJobType(), job.getEntityType(), job.getEntityId(),
                job.getStatus(), job.getAttemptCount(), job.getMaxAttempts(), job.getRetryAfter(), safeError,
                job.getStartedAt(), job.getCompletedAt(), job.getCreatedAt(), job.getUpdatedAt());
    }
}
