package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobDetailResponse;
import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<PageResponse<JobSummaryResponse>> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String workType,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Long salaryMin,
            @RequestParam(required = false) Long salaryMax,
            @RequestParam(required = false) List<UUID> skillIds,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        JobSearchCriteria criteria = JobSearchCriteria.builder()
                .keyword(keyword)
                .categoryId(categoryId)
                .level(level)
                .workType(workType)
                .location(location)
                .salaryMin(salaryMin)
                .salaryMax(salaryMax)
                .skillIds(skillIds)
                .sortBy(sortBy)
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(jobService.searchJobs(criteria));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobDetailResponse> getJobDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(jobService.getJobDetail(id));
    }
}
