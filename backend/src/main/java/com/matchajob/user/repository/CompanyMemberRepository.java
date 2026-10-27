package com.matchajob.user.repository;

import com.matchajob.user.dto.CompanySummaryResponse;
import com.matchajob.user.model.CompanyMember;
import com.matchajob.user.model.CompanyMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyMemberRepository extends JpaRepository<CompanyMember, CompanyMemberId> {

    List<CompanyMember> findByUserId(UUID userId);

    List<CompanyMember> findByCompanyId(UUID companyId);

    Optional<CompanyMember> findByCompanyIdAndUserId(UUID companyId, UUID userId);

    boolean existsByCompanyIdAndUserId(UUID companyId, UUID userId);

    @Query("SELECT new com.matchajob.user.dto.CompanySummaryResponse(c.id, c.name, cm.role) " +
           "FROM CompanyMember cm " +
           "JOIN Company c ON cm.companyId = c.id " +
           "WHERE cm.userId = :userId AND c.deletedAt IS NULL")
    List<CompanySummaryResponse> findActiveCompanySummariesByUserId(@Param("userId") UUID userId);
}
