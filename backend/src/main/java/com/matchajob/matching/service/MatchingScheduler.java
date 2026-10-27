package com.matchajob.matching.service;

import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

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

    /** Poll for pending APPLICATION_MATCHING jobs with lease acquisition. */
    @Scheduled(fixedDelayString = "${matchajob.matching.processing.poll-delay-ms:3000}")
    public void poll() {
        try {
            processingJobService.recoverExpiredMatchingLeases();
            processingJobService.claimNextMatchingJob().ifPresent(job -> {
                log.info("Claimed APPLICATION_MATCHING job: {} (attempt {})",
                         job.getId(), job.getAttemptCount());
                try {
                    matchingService.evaluateApplicationMatch(job.getEntityId(), job.getLeaseToken());
                } catch (MatchingService.MatchNotReadyException e) {
                    log.warn("Matching job {} deferred (not ready): {}",
                             job.getId(), e.getMessage());
                    processingJobService.markJobFailed(job.getId(), e.getMessage(), true);
                } catch (Exception e) {
                    boolean retryable = isRetryable(e);
                    log.warn("Matching job {} failed (retryable={}): {}",
                             job.getId(), retryable, e.getClass().getSimpleName());
                    processingJobService.markJobFailed(job.getId(), toSafeMessage(e), retryable);
                }
            });
        } catch (Exception e) {
            log.warn("Matching queue poll failed; cause={}", e.getClass().getSimpleName());
        }
    }

    private boolean isRetryable(Exception e) {
        return e instanceof ResourceAccessException
            || (e instanceof HttpStatusCodeException http
                && http.getStatusCode().is5xxServerError());
    }

    private String toSafeMessage(Exception e) {
        if (e instanceof ResourceAccessException) {
            return "AI Worker is temporarily unavailable.";
        }
        if (e instanceof HttpStatusCodeException http) {
            return "AI Worker returned HTTP " + http.getStatusCode().value() + ".";
        }
        return "Matching evaluation failed.";
    }
}
