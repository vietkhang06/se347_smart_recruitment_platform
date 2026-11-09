package com.matchajob.matching.service;

import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Short transactions only. The AI Worker HTTP request runs outside these transactions. */
@Service
public class MatchingPersistenceService {

    private static final String JOB_TYPE = "APPLICATION_MATCHING";
    private static final String ENTITY_TYPE = "application";

    private final ApplicationRepository applications;
    private final ProcessingJobRepository jobs;
    private final MatchResultRepository results;

    public MatchingPersistenceService(
            ApplicationRepository applications,
            ProcessingJobRepository jobs,
            MatchResultRepository results) {
        this.applications = applications;
        this.jobs = jobs;
        this.results = results;
    }

    /** Atomically claims a matching attempt for the synchronous compatibility endpoint. */
    @Transactional
    public Optional<ProcessingJob> claim(UUID applicationId) {
        applications.findByIdForMatchingUpdate(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found"));

        if (results.findByApplicationId(applicationId).isPresent()) {
            // Reconcile a stale queue row if a result committed before a worker crash.
            jobs.findByIdempotencyKeyForUpdate("app_match_" + applicationId).ifPresent(existingJob -> {
                if (!"COMPLETED".equals(existingJob.getStatus())) {
                    Instant completedAt = Instant.now();
                    existingJob.setStatus("COMPLETED");
                    existingJob.setCompletedAt(completedAt);
                    existingJob.setUpdatedAt(completedAt);
                    existingJob.setLeaseToken(null);
                    existingJob.setLeaseExpiresAt(null);
                    existingJob.setLastError(null);
                    jobs.save(existingJob);
                }
            });
            return Optional.empty();
        }

        ProcessingJob job = jobs.findByIdempotencyKeyForUpdate("app_match_" + applicationId)
                .orElseGet(() -> jobs.save(ProcessingJob.builder()
                        .jobType(JOB_TYPE)
                        .entityType(ENTITY_TYPE)
                        .entityId(applicationId)
                        .idempotencyKey("app_match_" + applicationId)
                        .build()));

        if (!JOB_TYPE.equals(job.getJobType())
                || !ENTITY_TYPE.equals(job.getEntityType())
                || !applicationId.equals(job.getEntityId())) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_STATE_CONFLICT",
                    "The matching queue record does not match this application.",
                    false,
                    null
            );
        }

        Instant now = Instant.now();
        if ("PROCESSING".equals(job.getStatus())
                && job.getLeaseExpiresAt() != null
                && job.getLeaseExpiresAt().isAfter(now)) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_IN_PROGRESS",
                    "Matching is already being processed.",
                    false,
                    job.getLeaseExpiresAt()
            );
        }
        if ("FAILED".equals(job.getStatus()) || job.getAttemptCount() >= job.getMaxAttempts()) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_RETRY_EXHAUSTED",
                    "Matching is stopped or the retry limit has been reached.",
                    false,
                    null
            );
        }
        if (!"PENDING".equals(job.getStatus()) && !"PROCESSING".equals(job.getStatus())) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_STATE_CONFLICT",
                    "Matching state requires investigation.",
                    false,
                    null
            );
        }
        if (job.getRetryAfter() != null && job.getRetryAfter().isAfter(now)) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_BACKOFF",
                    "Wait before retrying matching.",
                    true,
                    job.getRetryAfter()
            );
        }

        job.setStatus("PROCESSING");
        job.setAttemptCount(job.getAttemptCount() + 1);
        job.setStartedAt(now);
        job.setCompletedAt(null);
        job.setUpdatedAt(now);
        job.setLeaseToken(UUID.randomUUID().toString());
        job.setLeaseExpiresAt(now.plusSeconds(120));
        return Optional.of(jobs.saveAndFlush(job));
    }

    /** Persists the score and completes the queue row only while this lease is still current. */
    @Transactional
    public MatchResult complete(ProcessingJob claim, MatchResult result) {
        var application = applications.findByIdForMatchingUpdate(result.getApplicationId())
                .orElseThrow();
        ProcessingJob job = jobs.findByIdForUpdate(claim.getId()).orElseThrow();
        checkLease(job, claim);

        if (!Objects.equals(job.getEntityId(), result.getApplicationId())) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_LEASE_LOST",
                    "The matching lease does not belong to this application.",
                    false,
                    null
            );
        }

        MatchResult saved = results.findByApplicationId(result.getApplicationId())
                .orElseGet(() -> results.saveAndFlush(result));

        Instant completedAt = Instant.now();
        job.setStatus("COMPLETED");
        job.setCompletedAt(completedAt);
        job.setUpdatedAt(completedAt);
        job.setLeaseToken(null);
        job.setLeaseExpiresAt(null);
        job.setLastError(null);
        jobs.save(job);

        application.setMatchScore(saved.getOverallScore());
        application.setUpdatedAt(completedAt);
        applications.save(application);
        return saved;
    }

    /** Records failure once; stale or expired workers cannot overwrite a newer lease. */
    @Transactional
    public void fail(ProcessingJob claim, String safeError, boolean retryable) {
        ProcessingJob job = jobs.findByIdForUpdate(claim.getId()).orElseThrow();
        Instant now = Instant.now();
        if (!ownsCurrentLease(job, claim, now)) {
            return;
        }

        boolean retry = retryable && job.getAttemptCount() < job.getMaxAttempts();
        job.setStatus(retry ? "PENDING" : "FAILED");
        job.setRetryAfter(now.plusSeconds(retry ? (1L << job.getAttemptCount()) * 2 : 0));
        job.setLastError(safeError);
        job.setUpdatedAt(now);
        job.setLeaseToken(null);
        job.setLeaseExpiresAt(null);
        jobs.save(job);
    }

    private void checkLease(ProcessingJob current, ProcessingJob claim) {
        if (!ownsCurrentLease(current, claim, Instant.now())) {
            throw new MatchingException(
                    HttpStatus.CONFLICT,
                    "MATCHING_LEASE_LOST",
                    "The matching attempt no longer owns this job. Reload its status.",
                    false,
                    null
            );
        }
    }

    private boolean ownsCurrentLease(ProcessingJob current, ProcessingJob claim, Instant now) {
        return current != null
                && claim != null
                && "PROCESSING".equals(current.getStatus())
                && JOB_TYPE.equals(current.getJobType())
                && ENTITY_TYPE.equals(current.getEntityType())
                && Objects.equals(current.getEntityId(), claim.getEntityId())
                && claim.getLeaseToken() != null
                && Objects.equals(current.getLeaseToken(), claim.getLeaseToken())
                && current.getLeaseExpiresAt() != null
                && current.getLeaseExpiresAt().isAfter(now);
    }
}
