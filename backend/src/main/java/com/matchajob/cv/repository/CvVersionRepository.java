package com.matchajob.cv.repository;

import com.matchajob.cv.model.CvVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CvVersionRepository extends JpaRepository<CvVersion, UUID> {
    List<CvVersion> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
    Optional<CvVersion> findByIdAndCandidateId(UUID id, UUID candidateId);
    Optional<CvVersion> findBySha256Hash(String sha256Hash);

    Optional<CvVersion> findByCandidateIdAndActiveTrue(UUID candidateId);

    // Serialize uploads and active-version switches even when this candidate has no CV yet.
    @Query(value = "SELECT id FROM candidate_profiles WHERE id = :candidateId AND deleted_at IS NULL FOR UPDATE", nativeQuery = true)
    Optional<UUID> lockCandidate(@Param("candidateId") UUID candidateId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE CvVersion cv SET cv.active = false WHERE cv.candidateId = :candidateId AND cv.active = true")
    int clearActive(@Param("candidateId") UUID candidateId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE CvVersion cv SET cv.active = true WHERE cv.id = :cvId AND cv.candidateId = :candidateId")
    int selectActive(@Param("candidateId") UUID candidateId, @Param("cvId") UUID cvId);
}
