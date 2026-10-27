package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByEmployerId(Long employerId);

    org.springframework.data.domain.Page<Job> findByTitleContainingIgnoreCaseOrderByCreatedAtDescIdAsc(String title, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Job> findAllByOrderByCreatedAtDescIdAsc(org.springframework.data.domain.Pageable pageable);

    boolean existsByTitle(String title); // For taxonomy deletion check (if taxonomy was linked)

    @Query("SELECT j.status, COUNT(j) FROM Job j GROUP BY j.status")
    List<Object[]> countJobsByStatus();
}
