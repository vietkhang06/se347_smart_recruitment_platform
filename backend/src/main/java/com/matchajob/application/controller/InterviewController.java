package com.matchajob.application.controller;

import com.matchajob.application.dto.*;
import com.matchajob.application.service.InterviewService;
import com.matchajob.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping({"/v1/interviews", "/v1/employer/interviews"})
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    /**
     * GET /v1/interviews — Lấy danh sách lịch phỏng vấn theo công ty hoặc trạng thái
     */
    @GetMapping
    public ResponseEntity<List<InterviewResponse>> getInterviews(
            Authentication authentication,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String status) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("GET /v1/interviews — user={}, company={}, status={}", userId, companyId, status);

        try {
            List<InterviewResponse> interviews = interviewService.getEmployerInterviews(userId, companyId, status);
            return ResponseEntity.ok(interviews);
        } catch (Exception ex) {
            log.error("Error fetching interviews: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * GET /v1/interviews/{id} — Chi tiết một lịch phỏng vấn
     */
    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> getInterviewById(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        try {
            InterviewResponse interview = interviewService.getInterviewById(userId, id);
            return ResponseEntity.ok(interview);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    /**
     * POST /v1/interviews — Tạo lịch phỏng vấn mới
     */
    @PostMapping
    public ResponseEntity<InterviewResponse> createInterview(
            Authentication authentication,
            @Valid @RequestBody InterviewCreateRequest request) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("POST /v1/interviews — user={}, app={}, cand={}", userId, request.getApplicationId(), request.getCandidateId());

        try {
            InterviewResponse created = interviewService.createInterview(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * PUT /v1/interviews/{id} — Cập nhật / Đổi lịch phỏng vấn
     */
    @PutMapping("/{id}")
    public ResponseEntity<InterviewResponse> updateInterview(
            @PathVariable UUID id,
            Authentication authentication,
            @Valid @RequestBody InterviewUpdateRequest request) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("PUT /v1/interviews/{} — user={}", id, userId);

        try {
            InterviewResponse updated = interviewService.updateInterview(userId, id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * PATCH /v1/interviews/{id}/status — Cập nhật trạng thái lịch (Xác nhận, Hoàn tất, Hủy)
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<InterviewResponse> updateInterviewStatus(
            @PathVariable UUID id,
            Authentication authentication,
            @Valid @RequestBody InterviewStatusUpdateRequest request) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("PATCH /v1/interviews/{}/status — status={}, user={}", id, request.getStatus(), userId);

        try {
            InterviewResponse updated = interviewService.updateInterviewStatus(
                    userId,
                    id,
                    request.getStatus(),
                    request.getReason() != null ? request.getReason() : request.getNote()
            );
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    /**
     * DELETE /v1/interviews/{id} — Hủy lịch phỏng vấn
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<InterviewResponse> cancelInterview(
            @PathVariable UUID id,
            Authentication authentication,
            @RequestParam(required = false, defaultValue = "Nhà tuyển dụng hủy lịch") String reason) {

        UUID userId = authentication != null ? SecurityUtils.extractUserId(authentication) : null;
        log.info("DELETE /v1/interviews/{} — user={}", id, userId);

        try {
            InterviewResponse cancelled = interviewService.cancelInterview(userId, id, reason);
            return ResponseEntity.ok(cancelled);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }
}
