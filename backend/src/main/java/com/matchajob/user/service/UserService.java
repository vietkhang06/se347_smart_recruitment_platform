package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountNotActivatedException;
import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.user.dto.CompanySummaryResponse;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final boolean requireEmailVerification;

    public UserService(
            UserRepository userRepository,
            CompanyMemberRepository companyMemberRepository,
            @Value("${app.auth.require-email-verification:true}") boolean requireEmailVerification
    ) {
        this.userRepository = userRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.requireEmailVerification = requireEmailVerification;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UUID userId) {
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

        if (requireEmailVerification && Boolean.FALSE.equals(user.getIsVerified())) {
            throw new AccountNotActivatedException("Account is pending email verification");
        }

        String roleUpper = user.getRole() != null ? user.getRole().toUpperCase(Locale.ROOT) : "CANDIDATE";

        List<CompanySummaryResponse> companies = Collections.emptyList();
        if ("employer".equalsIgnoreCase(user.getRole())) {
            List<CompanySummaryResponse> activeCompanies = companyMemberRepository.findActiveCompanySummariesByUserId(user.getId());
            companies = activeCompanies != null ? activeCompanies : Collections.emptyList();
        }

        log.debug("Retrieved profile for current user: {}, role: {}, companies count: {}", user.getId(), roleUpper, companies.size());

        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleUpper)
                .status(user.getStatus())
                .isVerified(user.getIsVerified())
                .companies(companies)
                .build();
    }
}
