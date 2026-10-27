package com.matchajob.cv.service;

import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "matchajob.cv.processing.enabled", havingValue = "true", matchIfMissing = true)
public class CvProcessingScheduler {
    private static final Logger log = LoggerFactory.getLogger(CvProcessingScheduler.class);
    private final ProcessingJobService jobs;
    private final CvProcessingOrchestrator orchestrator;
    private final CvProcessingPersistenceService persistence;

    public CvProcessingScheduler(ProcessingJobService jobs, CvProcessingOrchestrator orchestrator,
            CvProcessingPersistenceService persistence) {
        this.jobs = jobs;
        this.orchestrator = orchestrator;
        this.persistence = persistence;
    }

    @Scheduled(fixedDelayString = "${matchajob.cv.processing.poll-delay-ms:2000}")
    public void poll() {
        try {
            persistence.recoverExpiredLeases();
            jobs.claimNextCvJob().ifPresent(orchestrator::processSingleJob);
        } catch (Exception e) {
            log.warn("CV queue poll failed; cause={}", e.getClass().getSimpleName());
        }
    }
}
