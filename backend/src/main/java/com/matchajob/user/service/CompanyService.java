package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.dto.UpdateCompanyRequest;
import com.matchajob.user.exception.DuplicateTaxCodeException;
import com.matchajob.user.exception.EmployerRoleRequiredException;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.CompanyMember;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final UserRepository userRepository;
    private final ResourceOwnershipService resourceOwnershipService;
    private final JdbcClient jdbcClient;

    @Transactional(readOnly = true)
    public CompanyResponse getCompanyById(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Company ID cannot be null");
        }
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));

        if (company.getDeletedAt() != null) {
            throw new IllegalArgumentException("Company has been deleted: " + id);
        }

        List<String> perks = jdbcClient.sql("SELECT perk FROM company_perks WHERE company_id = ? ORDER BY sort_order ASC, id ASC")
                .param(id)
                .query(String.class)
                .list();

        return CompanyResponse.fromEntity(company, perks);
    }

    @Transactional(readOnly = true)
    public CompanyResponse getEmployerCompany(UUID userId) {
        if (userId == null) {
            throw new UserNotFoundException("User ID cannot be null");
        }

        UUID companyId = jdbcClient.sql("""
                SELECT c.id FROM companies c
                WHERE c.deleted_at IS NULL
                  AND (
                    c.owner_id = ?
                    OR EXISTS (
                      SELECT 1 FROM company_members cm
                      WHERE cm.company_id = c.id AND cm.user_id = ?
                    )
                  )
                ORDER BY c.created_at ASC
                LIMIT 1
                """)
                .params(userId, userId)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> new IllegalArgumentException("No company found for employer user: " + userId));

        return getCompanyById(companyId);
    }

    @Transactional(rollbackFor = Exception.class)
    public CompanyResponse updateCompany(UUID userId, UUID companyId, UpdateCompanyRequest request) {
        if (companyId == null) {
            throw new IllegalArgumentException("Company ID cannot be null");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update payload cannot be null");
        }

        if (userId != null) {
            resourceOwnershipService.checkEmployerCompanyOwnership(userId, companyId);
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + companyId));

        if (company.getDeletedAt() != null) {
            throw new IllegalArgumentException("Company has been deleted: " + companyId);
        }

        String newTax = trimToNull(request.getTaxCode());
        if (newTax != null && !newTax.equalsIgnoreCase(company.getTaxCode())) {
            if (companyRepository.existsByTaxCode(newTax)) {
                throw new DuplicateTaxCodeException("Company with tax code " + newTax + " already exists");
            }
            company.setTaxCode(newTax);
        }

        company.setName(request.getName().trim());
        company.setShortName(trimToNull(request.getShortName()));
        company.setIndustry(trimToNull(request.getIndustry()));
        company.setSize(trimToNull(request.getSize()));
        company.setLocation(trimToNull(request.getLocation()));
        company.setAddress(trimToNull(request.getAddress()));
        company.setWebsite(trimToNull(request.getWebsite()));
        company.setEmail(trimToNull(request.getEmail()));
        company.setPhone(trimToNull(request.getPhone()));
        company.setAbout(request.resolveAbout());

        if (request.getLogoUrl() != null) {
            company.setLogoUrl(trimToNull(request.getLogoUrl()));
        }
        if (request.getCoverImageUrl() != null) {
            company.setCoverImageUrl(trimToNull(request.getCoverImageUrl()));
        }
        company.setUpdatedAt(Instant.now());

        Company savedCompany = companyRepository.saveAndFlush(company);

        if (request.getPerks() != null) {
            jdbcClient.sql("DELETE FROM company_perks WHERE company_id = ?")
                    .param(companyId)
                    .update();

            short sortOrder = 1;
            for (String p : request.getPerks()) {
                if (p != null && !p.trim().isEmpty()) {
                    jdbcClient.sql("INSERT INTO company_perks (id, company_id, perk, sort_order) VALUES (?, ?, ?, ?)")
                            .params(UUID.randomUUID(), companyId, p.trim(), sortOrder++)
                            .update();
                }
            }
        }

        List<String> perks = jdbcClient.sql("SELECT perk FROM company_perks WHERE company_id = ? ORDER BY sort_order ASC, id ASC")
                .param(companyId)
                .query(String.class)
                .list();

        log.info("Updated company {} (userId: {})", companyId, userId);
        return CompanyResponse.fromEntity(savedCompany, perks);
    }

    @Transactional(rollbackFor = Exception.class)
    public CompanyResponse createCompany(UUID userId, CreateCompanyRequest request) {
        if (userId == null) {
            throw new UserNotFoundException("User ID cannot be null");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        if (user.getDeletedAt() != null) {
            throw new UserNotFoundException("User has been deleted");
        }

        if ("suspended".equalsIgnoreCase(user.getStatus())) {
            throw new AccountSuspendedException("Account has been suspended");
        }

        if (!"employer".equalsIgnoreCase(user.getRole())) {
            throw new EmployerRoleRequiredException("Only users with role EMPLOYER are permitted to create a company");
        }

        String taxCode = trimToNull(request.getTaxCode());
        if (taxCode != null && companyRepository.existsByTaxCode(taxCode)) {
            throw new DuplicateTaxCodeException("Company with tax code " + taxCode + " already exists");
        }

        Company company = Company.builder()
                .ownerId(userId)
                .name(request.getName().trim())
                .shortName(trimToNull(request.getShortName()))
                .logoUrl(trimToNull(request.getLogoUrl()))
                .coverImageUrl(trimToNull(request.getCoverImageUrl()))
                .industry(trimToNull(request.getIndustry()))
                .size(trimToNull(request.getSize()))
                .location(trimToNull(request.getLocation()))
                .address(trimToNull(request.getAddress()))
                .website(trimToNull(request.getWebsite()))
                .email(trimToNull(request.getEmail()))
                .phone(trimToNull(request.getPhone()))
                .taxCode(taxCode)
                .isVerified(false)
                .about(trimToNull(request.getAbout()))
                .build();

        Company savedCompany;
        try {
            savedCompany = companyRepository.saveAndFlush(company);
        } catch (DataIntegrityViolationException ex) {
            if (isTaxCodeUniqueViolation(ex)) {
                throw new DuplicateTaxCodeException("Company with tax code " + taxCode + " already exists");
            }
            throw ex;
        }

        CompanyMember ownerMembership = CompanyMember.builder()
                .companyId(savedCompany.getId())
                .userId(userId)
                .role("owner")
                .joinedAt(Instant.now())
                .build();

        companyMemberRepository.saveAndFlush(ownerMembership);

        log.info("Created company {} with owner membership for user {}", savedCompany.getId(), userId);

        return CompanyResponse.fromEntity(savedCompany);
    }

    private boolean isTaxCodeUniqueViolation(DataIntegrityViolationException ex) {
        String constraintName = extractConstraintName(ex);
        return "uq_companies_tax_code".equalsIgnoreCase(constraintName);
    }

    private String extractConstraintName(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof org.hibernate.exception.ConstraintViolationException cve) {
                if (cve.getConstraintName() != null) {
                    return cve.getConstraintName();
                }
            }
            try {
                var method = current.getClass().getMethod("getServerErrorMessage");
                Object sem = method.invoke(current);
                if (sem != null) {
                    var getConstraintMethod = sem.getClass().getMethod("getConstraint");
                    Object constraint = getConstraintMethod.invoke(sem);
                    if (constraint != null) {
                        return constraint.toString();
                    }
                }
            } catch (Exception ignored) {
            }
            current = current.getCause();
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
