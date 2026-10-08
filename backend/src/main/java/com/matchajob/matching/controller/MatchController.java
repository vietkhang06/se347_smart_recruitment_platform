package com.matchajob.matching.controller;

import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/applications")
public class MatchController {

    private final MatchingService matchingService;

    public MatchController(MatchingService matchingService) {
        this.matchingService = matchingService;
    }

    @PostMapping("/{applicationId}/match")
    public ResponseEntity<MatchResult> triggerMatch(
            @PathVariable UUID applicationId,
            @RequestParam(value = "jobId", required = false) UUID jobId,
            @RequestParam("cvVersionId") UUID cvVersionId,
            @RequestParam(value = "jobTitle", defaultValue = "Software Engineer") String jobTitle,
            @RequestParam(value = "jobRequirements", defaultValue = "Java, Spring Boot, PostgreSQL") String jobRequirements,
            @RequestParam(value = "jobDescription", defaultValue = "") String jobDescription) {

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

    @GetMapping("/{applicationId}/match")
    public ResponseEntity<MatchResult> getMatchResult(@PathVariable UUID applicationId) {
        return matchingService.getMatchResult(applicationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
