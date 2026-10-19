package com.matchajob.application.repository;

import com.matchajob.application.model.InterviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface InterviewRepository extends JpaRepository<InterviewEntity, UUID> {

    List<InterviewEntity> findByApplicationId(UUID applicationId);

    List<InterviewEntity> findByApplicationIdIn(Collection<UUID> applicationIds);

    List<InterviewEntity> findByStatus(String status);

    @Query(value = """
        SELECT i.* FROM interviews i
        JOIN applications a ON i.application_id = a.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = :companyId
          AND (:status IS NULL OR i.status = :status)
        ORDER BY i.scheduled_at DESC
        """, nativeQuery = true)
    List<InterviewEntity> findByCompanyIdAndOptionalStatus(
            @Param("companyId") UUID companyId,
            @Param("status") String status
    );

    @Query(value = """
        SELECT i.* FROM interviews i
        JOIN applications a ON i.application_id = a.id
        JOIN candidate_profiles cp ON a.candidate_id = cp.id
        WHERE cp.user_id = :userId
        ORDER BY i.scheduled_at DESC
        """, nativeQuery = true)
    List<InterviewEntity> findByCandidateUserId(@Param("userId") UUID userId);
}
