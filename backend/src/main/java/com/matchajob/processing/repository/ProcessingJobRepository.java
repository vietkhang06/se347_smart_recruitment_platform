package com.matchajob.processing.repository;

import com.matchajob.processing.model.ProcessingJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProcessingJobRepository extends JpaRepository<ProcessingJob, UUID> {

    Optional<ProcessingJob> findByIdempotencyKey(String idempotencyKey);

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
}
