package com.matchajob.matching.service;

import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Background scheduler that polls PENDING APPLICATION_MATCHING jobs
 * and executes AI scoring asynchronously via MatchingService.
 *
 * Design: AI Worker calls (LLM + embeddings) take 2-5s each.
 * Async processing prevents blocking HTTP threads when candidates apply in bulk.
 * HR or client polls result via GET /v1/applications/{id}/match.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(
    name = "matchajob.matching.processing.enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class MatchingScheduler {

    private static final Logger log = LoggerFactory.getLogger(MatchingScheduler.class);

    private final ProcessingJobService processingJobService;
    private final MatchingService matchingService;

    public MatchingScheduler(ProcessingJobService processingJobService,
                             MatchingService matchingService) {
        this.processingJobService = processingJobService;
        this.matchingService = matchingService;
    }

    /**
     * Polls the matching queue. ProcessingJobService is the single owner of queue
     * acquisition; MatchingService receives that exact lease and must not claim again.
     */
    @Scheduled(fixedDelayString = "${matchajob.matching.processing.poll-delay-ms:3000}")
    public void poll() {
        try {
            processingJobService.recoverExpiredMatchingLeases();
            processingJobService.claimNextMatchingJob().ifPresent(this::processClaimedJob);
        } catch (Exception e) {
            log.warn("Matching queue poll failed; cause={}", e.getClass().getSimpleName());
        }
    }

    private void processClaimedJob(ProcessingJob job) {
        log.info("Claimed APPLICATION_MATCHING job: {} (attempt {})",
                job.getId(), job.getAttemptCount());

        try {
            matchingService.evaluateApplicationMatch(job);
        } catch (MatchingException e) {
            // MatchingService owns failure persistence and retry scheduling.
            // The scheduler only reports the outcome; it must not fail the same lease again.
            log.warn("Matching job {} stopped (code={}, retryable={}): {}",
                    job.getId(), e.getCode(), e.isRetryable(), e.getMessage());
        } catch (Exception e) {
            // Unexpected exceptions are logged here. Normal RuntimeException paths are
            // persisted by MatchingService before they are rethrown.
            log.error("Matching job {} terminated unexpectedly; cause={}",
                    job.getId(), e.getClass().getSimpleName(), e);
        }
    }

}
