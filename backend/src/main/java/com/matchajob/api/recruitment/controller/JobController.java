package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recruitment/jobs")
@RequiredArgsConstructor
public class JobController {
    private final JobService jobService;

    @GetMapping("/employer/{employerId}")
    public ResponseEntity<List<Job>> getEmployerJobs(@PathVariable Long employerId) {
        return ResponseEntity.ok(jobService.getJobsByEmployer(employerId));
    }

    @PostMapping
    public ResponseEntity<Job> createJob(@RequestBody Job job) {
        return ResponseEntity.ok(jobService.createJob(job));
    }

    // --- Added endpoints for search, pagination, and status updates ---

    @GetMapping("/search")
    public ResponseEntity<org.springframework.data.domain.Page<Job>> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(jobService.searchJobs(keyword, pageable));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Job> updateJobStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam Long employerId,
            @RequestParam(defaultValue = "false") boolean isAdmin) {
        try {
            Job updated = jobService.updateJobStatus(id, status, employerId, isAdmin);
            return ResponseEntity.ok(updated);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
