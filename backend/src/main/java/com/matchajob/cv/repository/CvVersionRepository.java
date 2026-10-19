package com.matchajob.cv.repository;

import com.matchajob.cv.model.CvVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CvVersionRepository extends JpaRepository<CvVersion, UUID> {
    List<CvVersion> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
    Optional<CvVersion> findBySha256Hash(String sha256Hash);
}
