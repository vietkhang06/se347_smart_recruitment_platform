package com.matchajob.cv.repository;

import com.matchajob.cv.model.ApplicationCvSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationCvSnapshotRepository extends JpaRepository<ApplicationCvSnapshot, UUID> {
    Optional<ApplicationCvSnapshot> findByApplicationId(UUID applicationId);
}
