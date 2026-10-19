package com.matchajob.processing.controller;

import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/processing-jobs")
public class ProcessingJobController {

    private final ProcessingJobService jobService;
    private final ResourceOwnershipService resourceOwnershipService;

    @org.springframework.beans.factory.annotation.Autowired
    public ProcessingJobController(
            ProcessingJobService jobService,
            ResourceOwnershipService resourceOwnershipService) {
        this.jobService = jobService;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    public ProcessingJobController(ProcessingJobService jobService) {
        this(jobService, null);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProcessingJob> getJob(
            @PathVariable UUID id,
            Authentication authentication) {

        ProcessingJob job = jobService.getJob(id).orElse(null);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkProcessingJobAccess(userId, id, job.getEntityType(), job.getEntityId());
        }

        return ResponseEntity.ok(job);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<ProcessingJob> getJob(UUID id) {
        return getJob(id, null);
    }
}
