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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Controller for Candidate job applications, stage workflow, history, and ranking.
 *
 * Identity & Ownership Rules:
 * - POST /v1/applications: Identity strictly derived from JWT principal (candidate profile id).
 * - PATCH /v1/applications/{applicationId}/stage: Identity strictly derived from JWT principal (HR user id).
 *   Requires employer ownership of the job associated with the application.
 * - Legacy headers X-Candidate-Id and X-User-Id are ignored if supplied.
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

        ApplicationResponse response = applicationService.applyForJob(candidateId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

        StageUpdateResponse response = applicationService.updateStage(applicationId, userId, request);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // GET /v1/applications — Candidate lists their own applications
    // =========================================================================

    @GetMapping("/applications")
    public ResponseEntity<ApplicationListResponse> getMyApplications(
            Authentication authentication,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "stage", required = false) String stage) {

        UUID userId = SecurityUtils.extractUserId(authentication);
        UUID candidateId = resourceOwnershipService.getRequiredCandidateProfileId(userId);

        log.info("GET /v1/applications — candidate={}, user={}, page={}, size={}, stage={}",
                candidateId, userId, page, size, stage);

        ApplicationListResponse response = applicationService.getMyApplications(candidateId, userId, page, size, stage);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // GET /v1/applications/{applicationId} — Application detail
    // =========================================================================

    @GetMapping("/applications/{applicationId}")
    public ResponseEntity<ApplicationDetailResponse> getApplicationDetail(
            @PathVariable UUID applicationId,
            Authentication authentication) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("GET /v1/applications/{} — user={}", applicationId, userId);

        ApplicationDetailResponse detail = applicationService.getApplicationDetail(applicationId, userId);
        return ResponseEntity.ok(detail);
    }

    // =========================================================================
    // GET /v1/applications/{applicationId}/history — Status transition history
    // =========================================================================

    @GetMapping("/applications/{applicationId}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getApplicationHistory(
            @PathVariable UUID applicationId,
            Authentication authentication) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        List<ApplicationHistoryResponse> history = applicationService.getApplicationHistory(applicationId, userId);
        return ResponseEntity.ok(history);
    }

    // =========================================================================
    // GET /v1/jobs/{jobId}/applications — Employer lists applications for a job
    // =========================================================================

    @GetMapping("/jobs/{jobId}/applications")
    public ResponseEntity<ApplicationListResponse> getJobApplications(
            @PathVariable UUID jobId,
            Authentication authentication,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "stage", required = false) String stage) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("GET /v1/jobs/{}/applications — user={}, page={}, size={}, stage={}",
                jobId, userId, page, size, stage);

        ApplicationListResponse response = applicationService.getJobApplications(jobId, userId, page, size, stage);
        return ResponseEntity.ok(response);
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
        ApplicationRankingResponse ranking = applicationService.getJobRankings(jobId, userId, stage, minScore);
        return ResponseEntity.ok(ranking);
    }

    // =========================================================================
    // GET /v1/employer/applications — List Employer Applications
    // =========================================================================

    @GetMapping("/employer/applications")
    public ResponseEntity<List<EmployerApplicationItemResponse>> getEmployerApplications(
            Authentication authentication,
            @RequestParam(required = false) String companyId,
            @RequestParam(required = false) UUID jobId,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String search) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        UUID companyUuid = null;
        if (companyId != null && !companyId.isBlank()) {
            try {
                companyUuid = UUID.fromString(companyId.trim());
            } catch (IllegalArgumentException ex) {
                log.warn("Tham số companyId '{}' không phải UUID hợp lệ, fallback sang company của user", companyId);
                companyUuid = null;
            }
        }

        try {
            List<EmployerApplicationItemResponse> list = applicationService.getEmployerApplications(
                    userId, companyUuid, jobId, stage, search);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
    }

    // =========================================================================
    // GET /v1/employer/applications/{applicationId} — Employer Application Details
    // =========================================================================

    @GetMapping("/employer/applications/{applicationId}")
    public ResponseEntity<EmployerApplicationItemResponse> getEmployerApplicationById(
            @PathVariable UUID applicationId,
            Authentication authentication) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        try {
            EmployerApplicationItemResponse detail = applicationService.getEmployerApplicationDetail(applicationId, userId);
            return ResponseEntity.ok(detail);
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.getMessage(), ex);
        }
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
        HttpStatus status = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")
                ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, ex.getMessage());
        problem.setTitle(status == HttpStatus.NOT_FOUND ? "Not Found" : "Bad Request");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.status(status).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Forbidden");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                status, ex.getReason() != null ? ex.getReason() : ex.getMessage());
        problem.setTitle(status == HttpStatus.NOT_FOUND ? "Not Found" : "Error");
        problem.setType(URI.create("about:blank"));
        return ResponseEntity.status(status).body(problem);
    }
}
