package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobService {
    private final JobRepository jobRepository;

    public List<Job> getJobsByEmployer(Long employerId) {
        return jobRepository.findByEmployerId(employerId);
    }

    public Job createJob(Job job) {
        job.setStatus("DRAFT");
        return jobRepository.save(job);
    }

    // --- Added methods for search, pagination with stable sorting, and state machine / ownership ---

    public org.springframework.data.domain.Page<Job> searchJobs(String keyword, org.springframework.data.domain.Pageable pageable) {
        // Enforce stable sorting: created_at DESC, id ASC
        org.springframework.data.domain.Pageable sortedPageable = org.springframework.data.domain.PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
                .and(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "id"))
        );
        if (keyword != null && !keyword.trim().isEmpty()) {
            return jobRepository.findByTitleContainingIgnoreCaseOrderByCreatedAtDescIdAsc(keyword.trim(), sortedPageable);
        }
        return jobRepository.findAllByOrderByCreatedAtDescIdAsc(sortedPageable);
    }

    public Job updateJobStatus(Long jobId, String newStatus, Long employerId, boolean isAdmin) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Ownership check (IDOR protection)
        if (!isAdmin && (job.getEmployerId() == null || !job.getEmployerId().equals(employerId))) {
            throw new SecurityException("Unauthorized: you do not own this job posting");
        }

        String currentStatus = job.getStatus() != null ? job.getStatus().toUpperCase() : "DRAFT";
        String targetStatus = newStatus != null ? newStatus.toUpperCase() : "";

        // State Machine validation
        if ("CLOSED".equals(currentStatus)) {
            throw new IllegalStateException("Cannot transition from CLOSED state (terminal state)");
        }

        // Allowed transitions: DRAFT/PENDING -> ACTIVE, ACTIVE <-> PAUSED, ANY -> CLOSED
        if (!isTransitionAllowed(currentStatus, targetStatus)) {
            throw new IllegalStateException("Invalid state transition from " + currentStatus + " to " + targetStatus);
        }

        job.setStatus(targetStatus);
        return jobRepository.save(job);
    }

    private boolean isTransitionAllowed(String from, String to) {
        if ("CLOSED".equals(to)) return true; // Can close from any non-closed state
        if ("DRAFT".equals(from) || "PENDING".equals(from)) {
            return "ACTIVE".equals(to);
        }
        if ("ACTIVE".equals(from)) {
            return "PAUSED".equals(to);
        }
        if ("PAUSED".equals(from)) {
            return "ACTIVE".equals(to);
        }
        return false;
    }
