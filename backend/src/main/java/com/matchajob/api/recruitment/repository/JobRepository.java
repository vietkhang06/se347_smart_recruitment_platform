package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

       List<Job> findByCompanyIdAndDeletedAtIsNull(UUID companyId);

    Page<Job> findByCompanyIdAndDeletedAtIsNull(UUID companyId, Pageable pageable);

    Page<Job> findByCompanyIdAndStatusAndDeletedAtIsNull(UUID companyId, String status, Pageable pageable);

    Page<Job> findByCompanyIdInAndDeletedAtIsNull(Collection<UUID> companyIds, Pageable pageable);

    Page<Job> findByCompanyIdInAndStatusAndDeletedAtIsNull(Collection<UUID> companyIds, String status, Pageable pageable);

    Optional<Job> findByIdAndDeletedAtIsNull(UUID id);

    Optional<Job> findBySlugAndDeletedAtIsNull(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT j.status, COUNT(j) FROM Job j GROUP BY j.status")
    List<Object[]> countJobsByStatus();
}
