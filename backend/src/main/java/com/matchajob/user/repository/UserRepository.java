package com.matchajob.user.repository;

import com.matchajob.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRoleAndStatusAndDeletedAtIsNull(String role, String status);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(:lockKey)", nativeQuery = true)
    Integer acquireAdvisoryXactLock(@Param("lockKey") long lockKey);
}
