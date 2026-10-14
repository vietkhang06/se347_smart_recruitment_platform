package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/employer/jobs")
@RequiredArgsConstructor
public class EmployerJobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<PageResponse<JobSummaryResponse>> getEmployerJobs(
            Authentication authentication,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(jobService.getEmployerJobs(userId, companyId, status, page, size));
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
