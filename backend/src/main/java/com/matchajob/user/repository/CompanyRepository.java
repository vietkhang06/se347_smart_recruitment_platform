package com.matchajob.user.repository;

import com.matchajob.user.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    List<Company> findByOwnerId(UUID ownerId);

    Optional<Company> findByTaxCode(String taxCode);

    boolean existsByTaxCode(String taxCode);
}
