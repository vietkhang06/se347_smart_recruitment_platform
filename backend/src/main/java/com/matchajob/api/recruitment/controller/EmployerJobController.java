package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/v1/employer/jobs")
@RequiredArgsConstructor
public class EmployerJobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<PageResponse<JobSummaryResponse>> getEmployerJobs(
            Authentication authentication,
            @RequestParam(required = false) String companyId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        UUID companyUuid = null;
        if (companyId != null && !companyId.isBlank()) {
            try {
                companyUuid = UUID.fromString(companyId.trim());
            } catch (IllegalArgumentException ex) {
                log.warn("Tham số companyId '{}' không phải định dạng UUID hợp lệ: {}. Tự động fallback sang công ty của tài khoản nhà tuyển dụng.",
                        companyId, ex.getMessage());
                companyUuid = null;
            }
        }
        return ResponseEntity.ok(jobService.getEmployerJobs(userId, companyUuid, status, page, size));
    }

    @PostMapping
    public ResponseEntity<JobDetailResponse> createJob(
            Authentication authentication,
            @RequestBody JobCreateRequest request) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        JobDetailResponse created = jobService.createJob(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobDetailResponse> updateJob(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody JobUpdateRequest request) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(jobService.updateJob(userId, id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<JobDetailResponse> updateJobStatus(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody JobStatusUpdateRequest request) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(jobService.updateJobStatus(userId, id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        jobService.deleteJob(userId, id);
        return ResponseEntity.noContent().build();
    }
}
