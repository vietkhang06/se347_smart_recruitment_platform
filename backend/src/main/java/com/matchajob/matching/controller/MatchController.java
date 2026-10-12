package com.matchajob.matching.controller;

import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/applications")
public class MatchController {

    private final MatchingService matchingService;
    private final ResourceOwnershipService resourceOwnershipService;

    @org.springframework.beans.factory.annotation.Autowired
    public MatchController(
            MatchingService matchingService,
            ResourceOwnershipService resourceOwnershipService) {
        this.matchingService = matchingService;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    public MatchController(MatchingService matchingService) {
        this(matchingService, null);
    }

    @PostMapping("/{applicationId}/match")
    public ResponseEntity<MatchResult> triggerMatch(
            @PathVariable UUID applicationId,
            Authentication authentication,
            @RequestParam(value = "jobId", required = false) UUID jobId,
            @RequestParam("cvVersionId") UUID cvVersionId,
            @RequestParam(value = "jobTitle", defaultValue = "Software Engineer") String jobTitle,
            @RequestParam(value = "jobRequirements", defaultValue = "Java, Spring Boot, PostgreSQL") String jobRequirements,
            @RequestParam(value = "jobDescription", defaultValue = "") String jobDescription) {

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkApplicationAccess(userId, applicationId);
        }

        MatchResult result = matchingService.evaluateMatch(
                applicationId,
                jobId != null ? jobId : UUID.randomUUID(),
                cvVersionId,
                jobTitle,
                jobRequirements,
                jobDescription
        );

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<MatchResult> triggerMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription) {
        return triggerMatch(applicationId, null, jobId, cvVersionId, jobTitle, jobRequirements, jobDescription);
    }

    @GetMapping("/{applicationId}/match")
    public ResponseEntity<MatchResult> getMatchResult(
            @PathVariable UUID applicationId,
            Authentication authentication) {

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkApplicationAccess(userId, applicationId);
        }

        return matchingService.getMatchResult(applicationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<MatchResult> getMatchResult(UUID applicationId) {
        return getMatchResult(applicationId, null);
    }
}
