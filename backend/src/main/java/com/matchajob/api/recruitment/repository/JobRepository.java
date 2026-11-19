package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.dto.KeyCountDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

    @Override
<<<<<<< Updated upstream
    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
=======
    @EntityGraph(attributePaths = {"category"})
>>>>>>> Stashed changes
    Page<Job> findAll(Specification<Job> spec, Pageable pageable);

    List<Job> findByCompanyIdAndDeletedAtIsNull(UUID companyId);

<<<<<<< Updated upstream
    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
    Page<Job> findByCompanyIdAndDeletedAtIsNull(UUID companyId, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
    Page<Job> findByCompanyIdAndStatusAndDeletedAtIsNull(UUID companyId, String status, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
    Page<Job> findByCompanyIdInAndDeletedAtIsNull(Collection<UUID> companyIds, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
    Page<Job> findByCompanyIdInAndStatusAndDeletedAtIsNull(Collection<UUID> companyIds, String status, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
    Optional<Job> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = {"category", "jobSkills", "jobSkills.skill"})
=======
    @EntityGraph(attributePaths = {"category"})
    Page<Job> findByCompanyIdAndDeletedAtIsNull(UUID companyId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Job> findByCompanyIdAndStatusAndDeletedAtIsNull(UUID companyId, String status, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Job> findByCompanyIdInAndDeletedAtIsNull(Collection<UUID> companyIds, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Job> findByCompanyIdInAndStatusAndDeletedAtIsNull(Collection<UUID> companyIds, String status, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Optional<Job> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = {"category"})
>>>>>>> Stashed changes
    Optional<Job> findBySlugAndDeletedAtIsNull(String slug);

    boolean existsBySlug(String slug);

    boolean existsByCategoryId(UUID categoryId);

    // =========================================================================
    // Aggregation & Statistics Queries (Optimized, Indexed, Zero N+1)
    // =========================================================================

    @Query("SELECT new com.matchajob.api.recruitment.dto.KeyCountDto(LOWER(j.status), COUNT(j)) FROM Job j WHERE j.deletedAt IS NULL GROUP BY LOWER(j.status)")
    List<KeyCountDto> countJobsByStatus();

    @Query("SELECT COUNT(j) FROM Job j WHERE j.deletedAt IS NULL AND LOWER(j.status) = 'active' AND (j.deadline IS NULL OR j.deadline >= :today)")
    long countActiveNonExpiredJobs(@Param("today") LocalDate today);

    @Query("SELECT COUNT(j) FROM Job j WHERE j.deletedAt IS NULL AND LOWER(j.status) = 'active' AND j.deadline < :today")
    long countActiveExpiredJobs(@Param("today") LocalDate today);

    @Query("SELECT new com.matchajob.api.recruitment.dto.KeyCountDto(c.name, COUNT(j)) FROM Job j JOIN j.category c WHERE j.deletedAt IS NULL AND c.deletedAt IS NULL GROUP BY c.name")
    List<KeyCountDto> countJobsByCategory();

    @Query("SELECT new com.matchajob.api.recruitment.dto.KeyCountDto(LOWER(j.level), COUNT(j)) FROM Job j WHERE j.deletedAt IS NULL AND j.level IS NOT NULL GROUP BY LOWER(j.level)")
    List<KeyCountDto> countJobsByLevel();

    @Query("SELECT new com.matchajob.api.recruitment.dto.KeyCountDto(LOWER(j.workType), COUNT(j)) FROM Job j WHERE j.deletedAt IS NULL AND j.workType IS NOT NULL GROUP BY LOWER(j.workType)")
    List<KeyCountDto> countJobsByWorkType();

    @Query("SELECT COALESCE(SUM(j.applicantCount), 0), COALESCE(SUM(j.viewCount), 0) FROM Job j WHERE j.deletedAt IS NULL")
    List<Object[]> getAggregatedMetrics();

    @Query("SELECT LOWER(j.status), COUNT(j) FROM Job j WHERE j.deletedAt IS NULL AND LOWER(j.status) NOT IN ('draft', 'closed') GROUP BY LOWER(j.status)")
    List<Object[]> countPublicJobsByStatus();
}
