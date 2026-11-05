package com.matchajob.matching.service;

import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Short transactions only. The Worker HTTP request runs outside these transactions. */
@Service
public class MatchingPersistenceService {
    private final ApplicationRepository applications;
    private final ProcessingJobRepository jobs;
    private final MatchResultRepository results;
    public MatchingPersistenceService(ApplicationRepository applications, ProcessingJobRepository jobs, MatchResultRepository results) {
        this.applications = applications; this.jobs = jobs; this.results = results;
    }
    @Transactional
    public Optional<ProcessingJob> claim(UUID applicationId) {
        applications.findByIdForMatchingUpdate(applicationId).orElseThrow(() -> new NoSuchElementException("Application not found"));
        if (results.findByApplicationId(applicationId).isPresent()) return Optional.empty();
        ProcessingJob job = jobs.findByIdempotencyKey("app_match_" + applicationId).orElseGet(() -> jobs.save(ProcessingJob.builder()
                .jobType("APPLICATION_MATCHING").entityType("application").entityId(applicationId)
                .idempotencyKey("app_match_" + applicationId).build()));
        Instant now = Instant.now();
        if ("PROCESSING".equals(job.getStatus()) && (job.getLeaseExpiresAt() == null || job.getLeaseExpiresAt().isAfter(now)))
            throw new MatchingException(HttpStatus.CONFLICT, "MATCHING_IN_PROGRESS", "Matching is already being processed.", false, null);
        if ("FAILED".equals(job.getStatus()) || job.getAttemptCount() >= job.getMaxAttempts())
            throw new MatchingException(HttpStatus.CONFLICT, "MATCHING_RETRY_EXHAUSTED", "Matching is stopped or the retry limit has been reached.", false, null);
        if (!"PENDING".equals(job.getStatus()) && !"PROCESSING".equals(job.getStatus()))
            throw new MatchingException(HttpStatus.CONFLICT, "MATCHING_STATE_CONFLICT", "Matching state requires investigation.", false, null);
        if (job.getRetryAfter() != null && job.getRetryAfter().isAfter(now))
            throw new MatchingException(HttpStatus.CONFLICT, "MATCHING_BACKOFF", "Wait before retrying matching.", true, job.getRetryAfter());
        job.setStatus("PROCESSING"); job.setAttemptCount(job.getAttemptCount() + 1);
        job.setStartedAt(now); job.setCompletedAt(null); job.setUpdatedAt(now);
        job.setLeaseToken(UUID.randomUUID().toString()); job.setLeaseExpiresAt(now.plusSeconds(120));
        return Optional.of(jobs.saveAndFlush(job));
    }
    @Transactional
    public MatchResult complete(ProcessingJob claim, MatchResult result) {
        var application = applications.findByIdForMatchingUpdate(result.getApplicationId()).orElseThrow();
        ProcessingJob job = jobs.findByIdForUpdate(claim.getId()).orElseThrow();
        checkLease(job, claim);
        MatchResult saved = results.findByApplicationId(result.getApplicationId()).orElseGet(() -> results.saveAndFlush(result));
        job.setStatus("COMPLETED"); job.setCompletedAt(Instant.now()); job.setUpdatedAt(Instant.now());
        job.setLeaseToken(null); job.setLeaseExpiresAt(null); job.setLastError(null);
        jobs.save(job);
        application.setMatchScore(saved.getOverallScore()); application.setUpdatedAt(Instant.now());
        applications.save(application);
        return saved;
    }
    @Transactional
    public void fail(ProcessingJob claim, String safeError, boolean retryable) {
        ProcessingJob job = jobs.findByIdForUpdate(claim.getId()).orElseThrow();
        if (!Objects.equals(job.getLeaseToken(), claim.getLeaseToken())) return;
        Instant now = Instant.now();
        boolean retry = retryable && job.getAttemptCount() < job.getMaxAttempts();
        job.setStatus(retry ? "PENDING" : "FAILED");
        job.setRetryAfter(now.plusSeconds(retry ? (1L << job.getAttemptCount()) * 2 : 0));
        job.setLastError(safeError); job.setUpdatedAt(now); job.setLeaseToken(null); job.setLeaseExpiresAt(null);
        jobs.save(job);
    }
    private void checkLease(ProcessingJob current, ProcessingJob claim) {
        if (!"PROCESSING".equals(current.getStatus()) || !Objects.equals(current.getLeaseToken(), claim.getLeaseToken()))
            throw new MatchingException(HttpStatus.CONFLICT, "MATCHING_LEASE_LOST", "The matching attempt no longer owns this job. Reload its status.", false, null);
    }
}
