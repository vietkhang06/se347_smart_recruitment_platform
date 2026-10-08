package com.matchajob.matching.repository;

import com.matchajob.matching.model.MatchResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchResultRepository extends JpaRepository<MatchResult, UUID> {
    Optional<MatchResult> findByApplicationId(UUID applicationId);
    List<MatchResult> findByJobIdOrderByOverallScoreDesc(UUID jobId);
}
