package com.matchajob.application.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for the applications table (V2 baseline schema).
 * Re-uses the upstream Application entity from com.matchajob.api.recruitment.model
 * but is registered under the application module's package for component-scan isolation.
 *
 * Note: We use a generic Object-based approach with native queries to avoid
 * tight coupling with the upstream recruitment entity which is excluded from
 * the main MatchaJobApplication component scan.
 */
@Repository
public interface ApplicationRepository extends JpaRepository<com.matchajob.application.model.ApplicationEntity, UUID> {

    /**
     * Check if a candidate has already applied to a specific job (anti-duplicate).
     */
    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    /**
     * Find application by candidate and job combination.
     */
    Optional<com.matchajob.application.model.ApplicationEntity> findByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    /**
     * Find all applications for a specific job.
     */
    List<com.matchajob.application.model.ApplicationEntity> findByJobId(UUID jobId);

    /**
     * Find all applications for a specific job, ordered by applied_at desc.
     */
    List<com.matchajob.application.model.ApplicationEntity> findByJobIdOrderByAppliedAtDesc(UUID jobId);

    /**
     * Find all applications for a specific candidate, ordered by applied_at desc.
     */
    List<com.matchajob.application.model.ApplicationEntity> findByCandidateIdOrderByAppliedAtDesc(UUID candidateId);
}
