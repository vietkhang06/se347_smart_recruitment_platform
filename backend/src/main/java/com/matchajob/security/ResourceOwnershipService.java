package com.matchajob.security;

import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.repository.CandidateProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Service enforcing resource ownership across Candidate, Employer, and registered modules.
 * Grounded in Flyway V1-V5 database schema.
 */
@Slf4j
@Service
public class ResourceOwnershipService {

    private final JdbcClient jdbcClient;
    private final CandidateProfileRepository candidateProfileRepository;

    public ResourceOwnershipService(
            JdbcClient jdbcClient,
            CandidateProfileRepository candidateProfileRepository
    ) {
        this.jdbcClient = jdbcClient;
        this.candidateProfileRepository = candidateProfileRepository;
    }

    /**
     * Resolves the Candidate Profile UUID for an authenticated User.
     */
    public Optional<UUID> getCandidateProfileId(UUID userId) {
        if (userId == null) {
            return Optional.empty();
        }
        Optional<UUID> fromRepo = candidateProfileRepository.findByUserId(userId)
                .map(CandidateProfile::getId);
        if (fromRepo.isPresent()) {
            return fromRepo;
        }

        // Direct DB fallback in case JPA entity is not populated in current transaction
        return jdbcClient.sql("SELECT id FROM candidate_profiles WHERE user_id = ? AND deleted_at IS NULL")
                .param(userId)
                .query(UUID.class)
                .optional();
    }

    /**
     * Resolves the Candidate Profile UUID or throws AccessDeniedException if not found.
     */
    public UUID getRequiredCandidateProfileId(UUID userId) {
        return getCandidateProfileId(userId).orElseThrow(() ->
                new AccessDeniedException("Access is denied: candidate profile not found for user " + userId));
    }

    /**
     * Verifies that the authenticated user owns the given candidate profile.
     */
    public void checkCandidateProfileOwnership(UUID userId, UUID candidateId) {
        UUID userProfileId = getRequiredCandidateProfileId(userId);
        if (!userProfileId.equals(candidateId)) {
            log.warn("Ownership violation: user {} (profile {}) attempted to access candidate profile {}",
                    userId, userProfileId, candidateId);
            throw new AccessDeniedException("Access is denied: You can only access your own candidate profile");
        }
    }

    /**
     * Verifies that the authenticated employer user owns or is a member of the company owning the job.
     */
    public void checkEmployerJobOwnership(UUID userId, UUID jobId) {
        // 1. Verify job exists
        Integer exists = jdbcClient.sql("SELECT COUNT(*) FROM jobs WHERE id = ? AND deleted_at IS NULL")
                .param(jobId)
                .query(Integer.class)
                .single();
        if (exists == null || exists == 0) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // 2. Verify employer has rights to this job (as creator, company owner, or company member)
        Integer authorized = jdbcClient.sql("""
                SELECT COUNT(*) FROM jobs j
                WHERE j.id = ?
                  AND j.deleted_at IS NULL
                  AND (
                    j.created_by = ?
                    OR j.company_id IN (
                      SELECT c.id FROM companies c WHERE c.owner_id = ? AND c.deleted_at IS NULL
                      UNION
                      SELECT cm.company_id FROM company_members cm WHERE cm.user_id = ?
                    )
                  )
                """)
                .params(jobId, userId, userId, userId)
                .query(Integer.class)
                .single();

        if (authorized == null || authorized == 0) {
            log.warn("Employer ownership violation: user {} attempted to access job {}", userId, jobId);
            throw new AccessDeniedException("Access is denied: You do not have permission to manage this job");
        }
    }

    /**
     * Verifies that the authenticated employer user has rights to manage the given application.
     */
    public void checkEmployerApplicationOwnership(UUID userId, UUID applicationId) {
        // 1. Verify application exists and get its job_id
        Optional<UUID> jobIdOpt = jdbcClient.sql("SELECT job_id FROM applications WHERE id = ?")
                .param(applicationId)
                .query(UUID.class)
                .optional();

        if (jobIdOpt.isEmpty()) {
            throw new IllegalArgumentException("Application not found: " + applicationId);
        }

        // 2. Verify employer owns the corresponding job
        checkEmployerJobOwnership(userId, jobIdOpt.get());
    }

    /**
     * Verifies that the authenticated user can access the application:
     * Either as the Candidate who submitted it, OR as the Employer managing the job.
     */
    public void checkApplicationAccess(UUID userId, UUID applicationId) {
        // 1. Verify application exists and retrieve candidate_id and job_id
        var appRow = jdbcClient.sql("SELECT candidate_id, job_id FROM applications WHERE id = ?")
                .param(applicationId)
                .query((rs, rowNum) -> new Object[]{
                        rs.getObject("candidate_id", UUID.class),
                        rs.getObject("job_id", UUID.class)
                })
                .optional();

        if (appRow.isEmpty()) {
            throw new IllegalArgumentException("Application not found: " + applicationId);
        }

        UUID appCandidateId = (UUID) appRow.get()[0];
        UUID appJobId = (UUID) appRow.get()[1];

        // 2. Check if user is the candidate owner
        Optional<UUID> candidateProfileId = getCandidateProfileId(userId);
        if (candidateProfileId.isPresent() && candidateProfileId.get().equals(appCandidateId)) {
            return; // Authorized as candidate applicant
        }

        // 3. Check if user is employer owner of the job
        Integer authorizedEmployer = jdbcClient.sql("""
                SELECT COUNT(*) FROM jobs j
                WHERE j.id = ?
                  AND j.deleted_at IS NULL
                  AND (
                    j.created_by = ?
                    OR j.company_id IN (
                      SELECT c.id FROM companies c WHERE c.owner_id = ? AND c.deleted_at IS NULL
                      UNION
                      SELECT cm.company_id FROM company_members cm WHERE cm.user_id = ?
                    )
                  )
                """)
                .params(appJobId, userId, userId, userId)
                .query(Integer.class)
                .single();

        if (authorizedEmployer != null && authorizedEmployer > 0) {
            return; // Authorized as job employer
        }

        log.warn("Application access violation: user {} attempted to access application {}", userId, applicationId);
        throw new AccessDeniedException("Access is denied: You do not have permission to access this application");
    }

    /**
     * Verifies access to a specific CV Version:
     * Either as the Candidate owner, OR as an Employer reviewing an application submitted by this candidate.
     */
    public void checkCvVersionAccess(UUID userId, UUID candidateId, UUID cvVersionId) {
        // 1. Check if user is the candidate owner
        Optional<UUID> candidateProfileId = getCandidateProfileId(userId);
        if (candidateProfileId.isPresent() && candidateProfileId.get().equals(candidateId)) {
            return; // Authorized as candidate owner
        }

        // 2. Check if user is an employer with an application referencing this candidate on their job
        Integer authorizedEmployer = jdbcClient.sql("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON a.job_id = j.id
                WHERE a.candidate_id = ?
                  AND j.deleted_at IS NULL
                  AND (
                    j.created_by = ?
                    OR j.company_id IN (
                      SELECT c.id FROM companies c WHERE c.owner_id = ? AND c.deleted_at IS NULL
                      UNION
                      SELECT cm.company_id FROM company_members cm WHERE cm.user_id = ?
                    )
                  )
                """)
                .params(candidateId, userId, userId, userId)
                .query(Integer.class)
                .single();

        if (authorizedEmployer != null && authorizedEmployer > 0) {
            return; // Authorized as reviewing employer
        }

        log.warn("CV version access violation: user {} attempted to access CV {} for candidate {}",
                userId, cvVersionId, candidateId);
        throw new AccessDeniedException("Access is denied: You do not have permission to view this CV");
    }

    /**
     * Verifies access to an asynchronous processing job based on its entity type.
     */
    public void checkProcessingJobAccess(UUID userId, UUID processingJobId, String entityType, UUID entityId) {
        if ("cv_version".equalsIgnoreCase(entityType)) {
            // Find candidate_id of this cv_version
            Optional<UUID> candidateIdOpt = jdbcClient.sql("SELECT candidate_id FROM cv_versions WHERE id = ?")
                    .param(entityId)
                    .query(UUID.class)
                    .optional();
            if (candidateIdOpt.isPresent()) {
                checkCvVersionAccess(userId, candidateIdOpt.get(), entityId);
                return;
            }
        } else if ("application".equalsIgnoreCase(entityType)) {
            checkApplicationAccess(userId, entityId);
            return;
        }

        // Default: If ownership cannot be established for unknown entity, deny access
        log.warn("Processing job access violation: user {} attempted to access job {} (type={}, entity={})",
                userId, processingJobId, entityType, entityId);
        throw new AccessDeniedException("Access is denied: You do not have permission to view this processing job");
    }
}
