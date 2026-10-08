package com.matchajob.processing.service;

import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProcessingJobService {

    private static final Logger log = LoggerFactory.getLogger(ProcessingJobService.class);

    private final ProcessingJobRepository jobRepository;

    public ProcessingJobService(ProcessingJobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @Transactional
    public ProcessingJob createJob(String jobType, String entityType, UUID entityId, String idempotencyKey) {
        Optional<ProcessingJob> existing = jobRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            log.info("Returning existing processing job for idempotency key: {}", idempotencyKey);
            return existing.get();
        }

        ProcessingJob job = ProcessingJob.builder()
                .jobType(jobType)
                .entityType(entityType)
                .entityId(entityId)
                .idempotencyKey(idempotencyKey)
                .status("PENDING")
                .attemptCount(0)
                .maxAttempts(3)
                .retryAfter(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return jobRepository.save(job);
    }

    @Transactional
    public Optional<ProcessingJob> claimNextJob() {
        Instant now = Instant.now();
        Optional<ProcessingJob> jobOpt = jobRepository.claimNextPendingJob(now);

        if (jobOpt.isPresent()) {
            ProcessingJob job = jobOpt.get();
            job.setStatus("PROCESSING");
            job.setStartedAt(now);
            job.setAttemptCount(job.getAttemptCount() + 1);
            job.setLeaseToken(UUID.randomUUID().toString());
            job.setLeaseExpiresAt(now.plus(Duration.ofSeconds(120)));
            job.setUpdatedAt(now);
            jobRepository.save(job);
            log.info("Claimed processing job: {} (type: {}, attempt: {})", job.getId(), job.getJobType(), job.getAttemptCount());
            return Optional.of(job);
        }

        return Optional.empty();
    }

    @Transactional
    public ProcessingJob startJob(UUID jobId) {
        return jobRepository.findById(jobId).map(job -> {
            if (!"PROCESSING".equals(job.getStatus())) {
                job.setStatus("PROCESSING");
                job.setStartedAt(Instant.now());
                job.setAttemptCount(job.getAttemptCount() + 1);
                job.setUpdatedAt(Instant.now());
                return jobRepository.save(job);
            }
            return job;
        }).orElse(null);
    }

    @Transactional
    public void markJobCompleted(UUID jobId) {
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus("COMPLETED");
            job.setCompletedAt(Instant.now());
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);
            log.info("Marked processing job {} as COMPLETED", jobId);
        });
    }

    @Transactional
    public void markJobFailed(UUID jobId, String errorMessage, boolean retryable) {
        jobRepository.findById(jobId).ifPresent(job -> {
            Instant now = Instant.now();
            job.setUpdatedAt(now);
            job.setLastError(errorMessage);
            job.setLeaseToken(null);
            if ("PENDING".equals(job.getStatus())) {
                job.setAttemptCount(job.getAttemptCount() + 1);
            }

            if (retryable && job.getAttemptCount() < job.getMaxAttempts()) {
                long backoffSeconds = (long) Math.pow(2, job.getAttemptCount()) * 2;
                job.setStatus("PENDING");
                job.setRetryAfter(now.plusSeconds(backoffSeconds));
                log.warn("Job {} failed (transient). Rescheduled retry in {}s. Error: {}", jobId, backoffSeconds, errorMessage);
            } else {
                job.setStatus("FAILED");
                log.error("Job {} permanently FAILED (attempts: {}/{}). Error: {}", jobId, job.getAttemptCount(), job.getMaxAttempts(), errorMessage);
            }
            jobRepository.save(job);
        });
    }

    @Transactional
    public int recoverExpiredLeases() {
        int count = jobRepository.recoverExpiredLeases(Instant.now());
        if (count > 0) {
            log.info("Recovered {} expired processing job lease(s)", count);
        }
        return count;
    }

    public Optional<ProcessingJob> getJob(UUID jobId) {
        return jobRepository.findById(jobId);
    }
}
