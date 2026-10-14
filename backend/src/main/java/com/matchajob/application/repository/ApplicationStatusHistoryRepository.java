package com.matchajob.application.repository;

import com.matchajob.application.model.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for the application_status_histories table (V5 migration).
 */
@Repository
public interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, UUID> {

    /**
     * Find all status history entries for a given application, newest first.
     */
    List<ApplicationStatusHistory> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);
}
