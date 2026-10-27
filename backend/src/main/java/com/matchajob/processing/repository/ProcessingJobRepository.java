package com.matchajob.processing.repository;

import com.matchajob.processing.model.ProcessingJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProcessingJobRepository extends JpaRepository<ProcessingJob, UUID> {

    Optional<ProcessingJob> findByIdempotencyKey(String idempotencyKey);

    Optional<ProcessingJob> findFirstByJobTypeAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            String jobType, String entityType, UUID entityId);

    @Query(value = """
        SELECT * FROM processing_jobs 
        WHERE (status = 'PENDING' OR (status = 'FAILED' AND attempt_count < max_attempts)) 
          AND retry_after <= :now 
        ORDER BY retry_after ASC 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<ProcessingJob> claimNextPendingJob(@Param("now") Instant now);

    @Modifying
    @Query("""
        UPDATE ProcessingJob p 
        SET p.status = 'PENDING', p.leaseToken = null, p.retryAfter = :now 
        WHERE p.status = 'PROCESSING' 
          AND p.leaseExpiresAt < :now 
          AND p.attemptCount < p.maxAttempts
        """)
    int recoverExpiredLeases(@Param("now") Instant now);

    List<ProcessingJob> findByEntityId(UUID entityId);

    @Query(value = """
        SELECT * FROM processing_jobs
        WHERE job_type = 'CV_TEXT_EXTRACTION' AND entity_type = 'cv_version'
          AND status = 'PENDING' AND attempt_count < max_attempts AND retry_after <= :now
        ORDER BY retry_after ASC LIMIT 1 FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<ProcessingJob> claimNextCvJob(@Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT job FROM ProcessingJob job WHERE job.id = :id")
    Optional<ProcessingJob> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query(value = """
        UPDATE processing_jobs
        SET status = CASE WHEN attempt_count < max_attempts THEN 'PENDING' ELSE 'FAILED' END,
            lease_token = NULL, lease_expires_at = NULL, retry_after = :now,
            last_error = 'CV processing lease expired.', updated_at = :now
        WHERE job_type = 'CV_TEXT_EXTRACTION' AND entity_type = 'cv_version'
          AND status = 'PROCESSING' AND lease_expires_at < :now
        """, nativeQuery = true)
    int recoverExpiredCvLeases(@Param("now") Instant now);

    @Query(value = """
        SELECT * FROM processing_jobs
        WHERE job_type = 'APPLICATION_MATCHING' AND entity_type = 'application'
          AND (status = 'PENDING' OR (status = 'FAILED' AND attempt_count < max_attempts))
          AND retry_after <= :now
        ORDER BY retry_after ASC LIMIT 1 FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<ProcessingJob> claimNextMatchingJob(@Param("now") Instant now);

    @Modifying
    @Query(value = """
        UPDATE processing_jobs
        SET status = CASE WHEN attempt_count < max_attempts THEN 'PENDING' ELSE 'FAILED' END,
            lease_token = NULL, lease_expires_at = NULL, retry_after = :now,
            last_error = 'Matching processing lease expired.', updated_at = :now
        WHERE job_type = 'APPLICATION_MATCHING' AND entity_type = 'application'
          AND status = 'PROCESSING' AND lease_expires_at < :now
        """, nativeQuery = true)
    int recoverExpiredMatchingLeases(@Param("now") Instant now);
}
