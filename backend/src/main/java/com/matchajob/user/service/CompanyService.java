package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final UserRepository userRepository;

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
