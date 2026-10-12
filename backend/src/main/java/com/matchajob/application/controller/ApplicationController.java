package com.matchajob.application.controller;

import com.matchajob.application.dto.*;
import com.matchajob.application.service.ApplicationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for the application workflow endpoints.
 *
 * Endpoints:
 *   POST   /v1/applications                              — Submit a new application
 *   PATCH  /v1/applications/{applicationId}/stage         — Update application stage (HR)
 *   GET    /v1/applications/{applicationId}/history       — Get status transition history
 *   GET    /v1/jobs/{jobId}/applications/ranking          — Get ranked candidates for a job
 *
 * Note: Authentication is not yet integrated. User identity is supplied via
 *       request headers (X-Candidate-Id, X-User-Id) as per Phase 3 conventions.
 */
@RestController
@RequestMapping("/v1")
public class ApplicationController {

    private static final Logger log = LoggerFactory.getLogger(ApplicationController.class);

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // =========================================================================
    // POST /v1/applications — Candidate submits an application
    // =========================================================================

    @PostMapping("/applications")
    public ResponseEntity<ApplicationResponse> submitApplication(
            @RequestHeader("X-Candidate-Id") UUID candidateId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody ApplicationApplyRequest request) {

        log.info("POST /v1/applications — candidate={}, job={}", candidateId, request.getJobId());

        ApplicationResponse response = applicationService.applyForJob(candidateId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =========================================================================
    // PATCH /v1/applications/{applicationId}/stage — HR updates stage
    // =========================================================================

    @PatchMapping("/applications/{applicationId}/stage")
    public ResponseEntity<StageUpdateResponse> updateApplicationStage(
            @PathVariable UUID applicationId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody ApplicationStageUpdateRequest request) {

        log.info("PATCH /v1/applications/{}/stage — toStage={}", applicationId, request.getToStage());

        StageUpdateResponse response = applicationService.updateStage(applicationId, userId, request);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // GET /v1/applications/{applicationId}/history — Status transition history
    // =========================================================================

    @GetMapping("/applications/{applicationId}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getApplicationHistory(
            @PathVariable UUID applicationId) {

        List<ApplicationHistoryResponse> history = applicationService.getApplicationHistory(applicationId);
        return ResponseEntity.ok(history);
    }

    // =========================================================================
    // GET /v1/jobs/{jobId}/applications/ranking — Ranked candidates for a job
    // =========================================================================

    @GetMapping("/jobs/{jobId}/applications/ranking")
    public ResponseEntity<ApplicationRankingResponse> getJobRanking(
            @PathVariable UUID jobId,
            @RequestParam(value = "stage", required = false) String stage,
            @RequestParam(value = "minScore", required = false) Integer minScore) {

        ApplicationRankingResponse ranking = applicationService.getJobRankings(jobId, stage, minScore);
        return ResponseEntity.ok(ranking);
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
