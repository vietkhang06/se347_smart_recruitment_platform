package com.matchajob.matching.controller;

import com.matchajob.matching.dto.MatchingResultResponse;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingResultMapper;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/v1/applications")
@Tag(name = "CV–JD Matching", description = "Retrieve and evaluate application-to-job matching results")
public class MatchController {

    private final MatchingService matchingService;
    private final MatchingResultMapper matchingResultMapper;
    private final ResourceOwnershipService resourceOwnershipService;

    @Autowired
    public MatchController(
            MatchingService matchingService,
            MatchingResultMapper matchingResultMapper,
            ResourceOwnershipService resourceOwnershipService) {
        this.matchingService = matchingService;
        this.matchingResultMapper = matchingResultMapper;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    /** Compatibility constructor used by small controller unit tests. */
    public MatchController(MatchingService matchingService, ResourceOwnershipService resourceOwnershipService) {
        this(matchingService, new MatchingResultMapper(new com.fasterxml.jackson.databind.ObjectMapper()), resourceOwnershipService);
    }

    public MatchController(MatchingService matchingService) {
        this(matchingService, null);
    }

    @PostMapping("/{applicationId}/match")
    @Operation(
            summary = "Evaluate CV–JD matching for an application",
            description = "Uses the persisted Application, immutable CV snapshot and Job data. Client query parameters cannot override the CV or Job used for scoring.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Matching result completed", content = @Content(schema = @Schema(implementation = MatchingResultResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Authentication required"),
                    @ApiResponse(responseCode = "403", description = "User cannot access this application"),
                    @ApiResponse(responseCode = "404", description = "Application or Job not found"),
                    @ApiResponse(responseCode = "409", description = "CV is not ready or a retry is blocked by processing state/backoff"),
                    @ApiResponse(responseCode = "500", description = "Matching provider failed or returned an invalid response")
            })
    public ResponseEntity<MatchingResultResponse> triggerMatch(
            @Parameter(description = "Application ID whose saved CV snapshot is evaluated")
            @PathVariable UUID applicationId,
            Authentication authentication) {

        checkApplicationAccess(applicationId, authentication);
        MatchResult result = matchingService.evaluateApplicationMatch(applicationId);
        return ResponseEntity.ok(matchingResultMapper.fromEntity(result));
    }

    /**
     * Read result/status for an application. When no score has been saved yet, this endpoint
     * returns 200 with a PENDING/PROCESSING/FAILED/NOT_STARTED state and null scores.
     */
    @GetMapping("/{applicationId}/match")
    @Operation(
            summary = "Read CV–JD matching result or processing state",
            description = "Returns the persisted result when available. If no result exists yet, returns a status DTO with null scores instead of treating a valid application as not found.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Result or processing state", content = @Content(schema = @Schema(implementation = MatchingResultResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Authentication required"),
                    @ApiResponse(responseCode = "403", description = "User cannot access this application"),
                    @ApiResponse(responseCode = "404", description = "Application not found"),
                    @ApiResponse(responseCode = "500", description = "Unexpected error reading matching result")
            })
    public ResponseEntity<MatchingResultResponse> getMatchResult(
            @Parameter(description = "Application ID")
            @PathVariable UUID applicationId,
            Authentication authentication) {

        checkApplicationAccess(applicationId, authentication);
        Optional<MatchResult> existing = matchingService.getMatchResult(applicationId);
        if (existing.isPresent()) {
            return ResponseEntity.ok(matchingResultMapper.fromEntity(existing.get()));
        }
        return ResponseEntity.ok(matchingService.getMatchResultStatus(applicationId));
    }

    @ExceptionHandler(MatchingService.MatchNotReadyException.class)
    public ResponseEntity<ProblemDetail> handleMatchingNotReady(MatchingService.MatchNotReadyException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setTitle("Matching Not Ready");
        problem.setType(URI.create("https://matchajob.com/errors/matching-not-ready"));
        problem.setProperty("code", "MATCHING_NOT_READY");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    private void checkApplicationAccess(UUID applicationId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new AccessDeniedException("Authentication is required to access this application.");
        }
        if (resourceOwnershipService == null) {
            throw new IllegalStateException("Application ownership service is not configured.");
        }
        UUID userId = SecurityUtils.extractUserId(authentication);
        resourceOwnershipService.checkApplicationAccess(userId, applicationId);
    }

    /** Programmatic compatibility overload for legacy service/integration tests. */
    public ResponseEntity<MatchingResultResponse> triggerMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription) {
        MatchResult result = matchingService.evaluateMatch(
                applicationId, jobId, cvVersionId, jobTitle, jobRequirements, jobDescription);
        return ResponseEntity.ok(matchingResultMapper.fromEntity(result));
    }

    /** Programmatic compatibility overload for controller tests. */
    public ResponseEntity<MatchingResultResponse> getMatchResult(UUID applicationId) {
        Optional<MatchResult> result = matchingService.getMatchResult(applicationId);
        return result.map(value -> ResponseEntity.ok(matchingResultMapper.fromEntity(value)))
                .orElseGet(() -> ResponseEntity.ok(matchingService.getMatchResultStatus(applicationId)));
    }
}
