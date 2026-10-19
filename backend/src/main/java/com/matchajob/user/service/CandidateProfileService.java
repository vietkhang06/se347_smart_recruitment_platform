package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountNotActivatedException;
import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.user.dto.CandidateProfileResponse;
import com.matchajob.user.dto.UpdateCandidateProfileRequest;
import com.matchajob.user.exception.CandidateProfileNotFoundException;
import com.matchajob.user.exception.CandidateRoleRequiredException;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CandidateProfileRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;
import java.util.function.Consumer;

@Slf4j
@Service
public class CandidateProfileService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final boolean requireEmailVerification;

    public CandidateProfileService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            @Value("${app.auth.require-email-verification:true}") boolean requireEmailVerification
    ) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.requireEmailVerification = requireEmailVerification;
    }

    @Transactional(readOnly = true)
    public CandidateProfileResponse getProfile(UUID userId) {
        User user = validateCandidateUser(userId);

        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new CandidateProfileNotFoundException("Candidate profile not found for user: " + userId));

        if (profile.getDeletedAt() != null) {
            throw new CandidateProfileNotFoundException("Candidate profile has been deleted");
        }

        return mapToResponse(profile);
    }

    @Transactional
    public CandidateProfileResponse updateProfile(UUID userId, UpdateCandidateProfileRequest request) {
        User user = validateCandidateUser(userId);

        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new CandidateProfileNotFoundException("Candidate profile not found for user: " + userId));

        if (profile.getDeletedAt() != null) {
            throw new CandidateProfileNotFoundException("Candidate profile has been deleted");
        }

        boolean hasChanged = false;
        if (request != null) {
            if (applyStringUpdate(request.hasHeadline(), request.getHeadline(), profile.getHeadline(), profile::setHeadline)) {
                hasChanged = true;
            }
            if (applyStringUpdate(request.hasBio(), request.getBio(), profile.getBio(), profile::setBio)) {
                hasChanged = true;
            }
            if (applyExperienceYearsUpdate(request.hasExperienceYears(), request.getExperienceYears(), profile.getExperienceYears(), profile::setExperienceYears)) {
                hasChanged = true;
            }
            if (applyStringUpdate(request.hasEducation(), request.getEducation(), profile.getEducation(), profile::setEducation)) {
                hasChanged = true;
            }
            if (applyStringUpdate(request.hasLocation(), request.getLocation(), profile.getLocation(), profile::setLocation)) {
                hasChanged = true;
            }
            if (applyStringUpdate(request.hasAddress(), request.getAddress(), profile.getAddress(), profile::setAddress)) {
                hasChanged = true;
            }
        }

        if (hasChanged) {
            profile = candidateProfileRepository.save(profile);
            log.info("Updated candidate profile {} for user {}", profile.getId(), userId);
        }

        return mapToResponse(profile);
    }

    private boolean applyStringUpdate(boolean hasField, String input, String currentValue, Consumer<String> setter) {
        if (!hasField || input == null) {
            return false;
        }
        String trimmed = input.trim();
        String target = trimmed.isEmpty() ? null : trimmed;
        if (!Objects.equals(currentValue, target)) {
            setter.accept(target);
            return true;
        }
        return false;
    }

    private boolean applyExperienceYearsUpdate(boolean hasField, Short input, Short currentValue, Consumer<Short> setter) {
        if (!hasField || input == null) {
            return false;
        }
        if (!Objects.equals(currentValue, input)) {
            setter.accept(input);
            return true;
        }
        return false;
    }

    private User validateCandidateUser(UUID userId) {
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

        if (!"candidate".equalsIgnoreCase(user.getRole())) {
            throw new CandidateRoleRequiredException("Only candidates can access candidate profile");
        }

        return user;
    }

    private CandidateProfileResponse mapToResponse(CandidateProfile profile) {
        return CandidateProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .headline(profile.getHeadline())
                .bio(profile.getBio())
                .experienceYears(profile.getExperienceYears())
                .education(profile.getEducation())
                .location(profile.getLocation())
                .address(profile.getAddress())
                .cvUrl(profile.getCvUrl())
                .aiCvScore(profile.getAiCvScore())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
