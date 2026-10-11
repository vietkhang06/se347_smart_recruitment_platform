package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/recruitment/jobs")
@RequiredArgsConstructor
public class JobController {
    private final JobService jobService;

    @GetMapping("/employer/{employerId}")
    public ResponseEntity<List<Job>> getEmployerJobs(@PathVariable UUID employerId) {
        return ResponseEntity.ok(jobService.getJobsByEmployer(employerId));
    }

    @PostMapping
    public ResponseEntity<Job> createJob(@RequestBody Job job) {
        return ResponseEntity.ok(jobService.createJob(job));
    }
}