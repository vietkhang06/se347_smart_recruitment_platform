package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByEmployerId(Long employerId);
<<<<<<< HEAD
=======

    org.springframework.data.domain.Page<Job> findByTitleContainingIgnoreCaseOrderByCreatedAtDescIdAsc(String title, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Job> findAllByOrderByCreatedAtDescIdAsc(org.springframework.data.domain.Pageable pageable);
>>>>>>> 9f606963108af06510be846e2b8147d80f295599
}