package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountNotActivatedException;
import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.user.dto.CompanySummaryResponse;
import com.matchajob.user.dto.UpdateCurrentUserRequest;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.ZoneId;
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
        User user = loadActiveUser(userId);
        return mapToResponse(user);
    }

    /**
     * Updates the allowlisted base-profile fields of the authenticated user.
     * Fields absent from the payload are left untouched; privileged columns are not reachable
     * because {@link UpdateCurrentUserRequest} has no setters for them.
     */
    @Transactional
    public UserProfileResponse updateCurrentUserProfile(UUID userId, UpdateCurrentUserRequest request) {
        User user = loadActiveUser(userId);

        if (request == null || !request.hasAnyUpdate()) {
            return mapToResponse(user);
        }

        boolean changed = false;

        if (request.hasFullName()) {
            String fullName = trimToNull(request.getFullName());
            if (fullName == null) {
                throw new IllegalArgumentException("fullName: must not be blank");
            }
            if (!fullName.equals(user.getFullName())) {
                user.setFullName(fullName);
                changed = true;
            }
        }

        if (request.hasPhone()) {
            String phone = trimToNull(request.getPhone());
            if (!java.util.Objects.equals(phone, user.getPhone())) {
                user.setPhone(phone);
                changed = true;
            }
        }

        if (request.hasAvatarUrl()) {
            String avatarUrl = trimToNull(request.getAvatarUrl());
            if (!java.util.Objects.equals(avatarUrl, user.getAvatarUrl())) {
                user.setAvatarUrl(avatarUrl);
                changed = true;
            }
        }

        if (request.hasTimezone()) {
            String timezone = trimToNull(request.getTimezone());
            if (timezone == null) {
                throw new IllegalArgumentException("timezone: must not be blank");
            }
            try {
                ZoneId.of(timezone);
            } catch (DateTimeException ex) {
                throw new IllegalArgumentException("timezone: unknown IANA timezone '" + timezone + "'");
            }
            if (!timezone.equals(user.getTimezone())) {
                user.setTimezone(timezone);
                changed = true;
            }
        }

        if (changed) {
            user = userRepository.save(user);
            log.info("Updated base profile for user {}", user.getId());
        }

        return mapToResponse(user);
    }

    private User loadActiveUser(UUID userId) {
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

        return user;
    }

    private UserProfileResponse mapToResponse(User user) {
        String roleUpper = user.getRole() != null ? user.getRole().toUpperCase(Locale.ROOT) : "CANDIDATE";

        List<CompanySummaryResponse> companies = Collections.emptyList();
        if ("employer".equalsIgnoreCase(user.getRole())) {
            List<CompanySummaryResponse> activeCompanies = companyMemberRepository.findActiveCompanySummariesByUserId(user.getId());
            companies = activeCompanies != null ? activeCompanies : Collections.emptyList();
        }

        log.debug("Mapped profile for user: {}, role: {}, companies count: {}", user.getId(), roleUpper, companies.size());

        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .timezone(user.getTimezone())
                .role(roleUpper)
                .status(user.getStatus())
                .isVerified(user.getIsVerified())
                .companies(companies)
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
