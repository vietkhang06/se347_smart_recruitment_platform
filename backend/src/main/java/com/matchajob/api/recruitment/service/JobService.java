package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobService {
    private final JobRepository jobRepository;

    public List<Job> getJobsByEmployer(UUID employerId) {
        return jobRepository.findByCreatedBy(employerId);
    }

    public List<Job> getJobsByCompany(UUID companyId) {
        return jobRepository.findByCompanyId(companyId);
    }

    public Job createJob(Job job) {
        job.setStatus("pending");
        return jobRepository.save(job);
    }
}