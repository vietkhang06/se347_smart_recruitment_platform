package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/employer/jobs")
@RequiredArgsConstructor
public class EmployerJobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<PageResponse<JobSummaryResponse>> getEmployerJobs(
            @RequestParam UUID companyId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(jobService.getEmployerJobs(companyId, status, page, size));
    }

    @PostMapping
    public ResponseEntity<JobDetailResponse> createJob(@RequestBody JobCreateRequest request) {
        JobDetailResponse created = jobService.createJob(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobDetailResponse> updateJob(
            @PathVariable UUID id,
            @RequestBody JobUpdateRequest request) {
        return ResponseEntity.ok(jobService.updateJob(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<JobDetailResponse> updateJobStatus(
            @PathVariable UUID id,
            @RequestBody JobStatusUpdateRequest request) {
        return ResponseEntity.ok(jobService.updateJobStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable UUID id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }
}
