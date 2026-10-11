package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByCompanyId(UUID companyId);
    List<Job> findByCreatedBy(UUID createdBy);
}