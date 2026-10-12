package com.matchajob.application.controller;

import com.matchajob.application.dto.*;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for the application workflow endpoints.
 *
 * Identity is derived authoritatively from the JWT Authentication principal.
 * Client-provided headers (X-Candidate-Id, X-User-Id) are accepted for backwards compatibility but strictly ignored.
 */
@RestController
@RequestMapping("/v1")
public class ApplicationController {

    private static final Logger log = LoggerFactory.getLogger(ApplicationController.class);

    private final ApplicationService applicationService;
    private final ResourceOwnershipService resourceOwnershipService;

    public ApplicationController(
            ApplicationService applicationService,
            ResourceOwnershipService resourceOwnershipService) {
        this.applicationService = applicationService;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    // =========================================================================
    // POST /v1/applications — Candidate submits an application
    // =========================================================================

    @PostMapping("/applications")
    public ResponseEntity<ApplicationResponse> submitApplication(
            Authentication authentication,
            @RequestHeader(value = "X-Candidate-Id", required = false) UUID ignoredCandidateId,
            @RequestHeader(value = "X-User-Id", required = false) UUID ignoredUserId,
            @Valid @RequestBody ApplicationApplyRequest request) {

        UUID userId = SecurityUtils.extractUserId(authentication);
        UUID candidateId = resourceOwnershipService.getRequiredCandidateProfileId(userId);

        log.info("POST /v1/applications — candidate={}, user={}, job={}", candidateId, userId, request.getJobId());

        return submitApplicationInternal(candidateId, userId, request);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<ApplicationResponse> submitApplication(
            UUID candidateId,
            UUID userId,
            ApplicationApplyRequest request) {
        return submitApplicationInternal(candidateId, userId, request);
    }

    private ResponseEntity<ApplicationResponse> submitApplicationInternal(
            UUID candidateId,
            UUID userId,
            ApplicationApplyRequest request) {
        try {
            ApplicationResponse response = applicationService.applyForJob(candidateId, userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (ApplicationService.DuplicateApplicationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage(), ex);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
    }

    // =========================================================================
    // PATCH /v1/applications/{applicationId}/stage — HR updates stage
    // =========================================================================

    @PatchMapping("/applications/{applicationId}/stage")
    public ResponseEntity<StageUpdateResponse> updateApplicationStage(
            @PathVariable UUID applicationId,
            Authentication authentication,
            @RequestHeader(value = "X-User-Id", required = false) UUID ignoredUserId,
            @Valid @RequestBody ApplicationStageUpdateRequest request) {

        UUID userId = SecurityUtils.extractUserId(authentication);
        log.info("PATCH /v1/applications/{}/stage — toStage={}, user={}", applicationId, request.getToStage(), userId);

        return updateApplicationStageInternal(applicationId, userId, request);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<StageUpdateResponse> updateApplicationStage(
            UUID applicationId,
            UUID userId,
            ApplicationStageUpdateRequest request) {
        return updateApplicationStageInternal(applicationId, userId, request);
    }

    private ResponseEntity<StageUpdateResponse> updateApplicationStageInternal(
            UUID applicationId,
            UUID userId,
            ApplicationStageUpdateRequest request) {
        try {
            StageUpdateResponse response = applicationService.updateStage(applicationId, userId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
    }

    // =========================================================================
    // GET /v1/applications/{applicationId}/history — Status transition history
    // =========================================================================

    @GetMapping("/applications/{applicationId}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getApplicationHistory(
            @PathVariable UUID applicationId,
            Authentication authentication) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        try {
            List<ApplicationHistoryResponse> history = applicationService.getApplicationHistory(applicationId, userId);
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<List<ApplicationHistoryResponse>> getApplicationHistory(
            @PathVariable UUID applicationId) {
        return getApplicationHistory(applicationId, null);
    }

    // =========================================================================
    // GET /v1/jobs/{jobId}/applications/ranking — Ranked candidates for a job
    // =========================================================================

    @GetMapping("/jobs/{jobId}/applications/ranking")
    public ResponseEntity<ApplicationRankingResponse> getJobRanking(
            @PathVariable UUID jobId,
            Authentication authentication,
            @RequestParam(value = "stage", required = false) String stage,
            @RequestParam(value = "minScore", required = false) Integer minScore) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        try {
            ApplicationRankingResponse ranking = applicationService.getJobRankings(jobId, userId, stage, minScore);
            return ResponseEntity.ok(ranking);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<ApplicationRankingResponse> getJobRanking(
            UUID jobId,
            String stage,
            Integer minScore) {
        return getJobRanking(jobId, null, stage, minScore);
    }

    // =========================================================================
    // Exception Handlers (RFC 7807 Problem Details)
    // =========================================================================

    @ExceptionHandler(ApplicationService.DuplicateApplicationException.class)
    public ResponseEntity<ProblemDetail> handleDuplicateApplication(
            ApplicationService.DuplicateApplicationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Duplicate Application");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ProblemDetail> handleIllegalState(IllegalStateException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Invalid Operation");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Bad Request");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.badRequest().body(problem);
    }
}
