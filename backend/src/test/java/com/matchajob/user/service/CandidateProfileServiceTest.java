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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    private CandidateProfileService serviceWithVerification;
    private CandidateProfileService serviceWithoutVerification;

    @BeforeEach
    void setUp() {
        serviceWithVerification = new CandidateProfileService(userRepository, candidateProfileRepository, true);
        serviceWithoutVerification = new CandidateProfileService(userRepository, candidateProfileRepository, false);
    }

    private User createCandidateUser(UUID userId) {
        return User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
    }

    private CandidateProfile createProfile(UUID userId) {
        return CandidateProfile.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("Software Engineer")
                .bio("Existing bio")
                .experienceYears((short) 3)
                .education("B.S. Computer Science")
                .location("Ho Chi Minh City")
                .address("District 1")
                .cvUrl("https://storage.matchajob.com/cv/123.pdf")
                .aiCvScore((short) 85)
                .createdAt(Instant.now().minusSeconds(86400))
                .updatedAt(Instant.now().minusSeconds(3600))
                .build();
    }

    @Test
    @DisplayName("1. Successfully retrieves candidate profile with all fields including cv_url and ai_cv_score")
    void getProfile_success() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        CandidateProfileResponse response = serviceWithVerification.getProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(profile.getId());
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getHeadline()).isEqualTo("Software Engineer");
        assertThat(response.getBio()).isEqualTo("Existing bio");
        assertThat(response.getExperienceYears()).isEqualTo((short) 3);
        assertThat(response.getEducation()).isEqualTo("B.S. Computer Science");
        assertThat(response.getLocation()).isEqualTo("Ho Chi Minh City");
        assertThat(response.getAddress()).isEqualTo("District 1");
        assertThat(response.getCvUrl()).isEqualTo("https://storage.matchajob.com/cv/123.pdf");
        assertThat(response.getAiCvScore()).isEqualTo((short) 85);

        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("2. Throws UserNotFoundException when user does not exist")
    void getProfile_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User not found with id: " + userId);

        verify(candidateProfileRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("3. Throws UserNotFoundException when user is soft-deleted")
    void getProfile_userSoftDeleted_throwsException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        user.setDeletedAt(Instant.now());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User has been deleted");

        verify(candidateProfileRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("4. Throws AccountSuspendedException when user status is suspended")
    void getProfile_userSuspended_throwsException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        user.setStatus("suspended");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(AccountSuspendedException.class)
                .hasMessage("Account has been suspended");

        verify(candidateProfileRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("5. Throws AccountNotActivatedException when user is unverified and verification is required")
    void getProfile_userUnverified_throwsException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        user.setIsVerified(false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(AccountNotActivatedException.class)
                .hasMessage("Account is pending email verification");

        verify(candidateProfileRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("6. Throws CandidateRoleRequiredException when user role is not CANDIDATE (e.g. EMPLOYER or ADMIN)")
    void getProfile_employerRole_throwsCandidateRoleRequiredException() {
        UUID userId = UUID.randomUUID();
        User employer = createCandidateUser(userId);
        employer.setRole("employer");

        when(userRepository.findById(userId)).thenReturn(Optional.of(employer));

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(CandidateRoleRequiredException.class)
                .hasMessageContaining("Only candidates can access candidate profile");

        verify(candidateProfileRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("7. Throws CandidateProfileNotFoundException when candidate profile is missing in DB (never auto-creates)")
    void getProfile_profileMissing_throwsCandidateProfileNotFoundException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(CandidateProfileNotFoundException.class)
                .hasMessageContaining("Candidate profile not found for user: " + userId);

        // Strictly verify repository save is NEVER invoked
        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("8. Throws CandidateProfileNotFoundException when candidate profile has been soft-deleted")
    void getProfile_profileSoftDeleted_throwsException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);
        profile.setDeletedAt(Instant.now());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> serviceWithVerification.getProfile(userId))
                .isInstanceOf(CandidateProfileNotFoundException.class)
                .hasMessageContaining("Candidate profile has been deleted");
    }

    @Test
    @DisplayName("9. Successfully updates all allowed fields via PATCH")
    void updateProfile_allAllowedFields_success() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("Lead Architect");
        request.setBio("Updated comprehensive biography");
        request.setExperienceYears((short) 10);
        request.setEducation("M.S. in Computer Science");
        request.setLocation("Da Nang, Vietnam");
        request.setAddress("Hai Chau District");

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getHeadline()).isEqualTo("Lead Architect");
        assertThat(response.getBio()).isEqualTo("Updated comprehensive biography");
        assertThat(response.getExperienceYears()).isEqualTo((short) 10);
        assertThat(response.getEducation()).isEqualTo("M.S. in Computer Science");
        assertThat(response.getLocation()).isEqualTo("Da Nang, Vietnam");
        assertThat(response.getAddress()).isEqualTo("Hai Chau District");

        // Verify entity state saved to repository
        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).save(captor.capture());
        CandidateProfile saved = captor.getValue();
        assertThat(saved.getHeadline()).isEqualTo("Lead Architect");
        assertThat(saved.getCvUrl()).isEqualTo("https://storage.matchajob.com/cv/123.pdf"); // Untouched
        assertThat(saved.getAiCvScore()).isEqualTo((short) 85); // Untouched
    }

    @Test
    @DisplayName("10. Partially updates only provided fields while strictly keeping omitted fields untouched")
    void updateProfile_partialUpdate_keepsOmittedFields() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Request only supplies headline and location
        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("New Headline Only");
        request.setLocation("Hanoi, Vietnam");

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        // Updated
        assertThat(response.getHeadline()).isEqualTo("New Headline Only");
        assertThat(response.getLocation()).isEqualTo("Hanoi, Vietnam");

        // Omitted must remain exact previous values
        assertThat(response.getBio()).isEqualTo("Existing bio");
        assertThat(response.getExperienceYears()).isEqualTo((short) 3);
        assertThat(response.getEducation()).isEqualTo("B.S. Computer Science");
        assertThat(response.getAddress()).isEqualTo("District 1");
        assertThat(response.getCvUrl()).isEqualTo("https://storage.matchajob.com/cv/123.pdf");
        assertThat(response.getAiCvScore()).isEqualTo((short) 85);
    }

    @Test
    @DisplayName("11. Explicit null value for string field keeps existing value")
    void updateProfile_explicitNull_keepsExistingValue() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Explicitly set bio to null and update headline
        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("Updated Headline");
        request.setBio(null);

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getHeadline()).isEqualTo("Updated Headline");
        assertThat(response.getBio()).isEqualTo("Existing bio"); // null keeps existing value

        // Omitted fields remain untouched
        assertThat(response.getExperienceYears()).isEqualTo((short) 3);
        assertThat(response.getEducation()).isEqualTo("B.S. Computer Science");
        assertThat(response.getLocation()).isEqualTo("Ho Chi Minh City");
        assertThat(response.getAddress()).isEqualTo("District 1");

        verify(candidateProfileRepository, times(1)).save(any(CandidateProfile.class));
    }

    @Test
    @DisplayName("12. Empty PATCH request makes zero modifications and skips saving")
    void updateProfile_emptyRequest_noChanges() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        UpdateCandidateProfileRequest emptyRequest = new UpdateCandidateProfileRequest();

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, emptyRequest);

        assertThat(response).isNotNull();
        assertThat(response.getHeadline()).isEqualTo("Software Engineer");

        // Verify repository save was not called since there were no changes
        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("13. PATCH throws CandidateProfileNotFoundException if profile does not exist (never auto-creates)")
    void updateProfile_profileMissing_throwsException() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("New Headline");

        assertThatThrownBy(() -> serviceWithVerification.updateProfile(userId, request))
                .isInstanceOf(CandidateProfileNotFoundException.class)
                .hasMessageContaining("Candidate profile not found for user: " + userId);

        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("14. PATCH throws CandidateRoleRequiredException if caller is not a candidate")
    void updateProfile_employerRole_throwsException() {
        UUID userId = UUID.randomUUID();
        User employer = createCandidateUser(userId);
        employer.setRole("employer");

        when(userRepository.findById(userId)).thenReturn(Optional.of(employer));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("Trying to update");

        assertThatThrownBy(() -> serviceWithVerification.updateProfile(userId, request))
                .isInstanceOf(CandidateRoleRequiredException.class)
                .hasMessageContaining("Only candidates can access candidate profile");

        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("15. Empty string field clears value to NULL")
    void updateProfile_emptyString_clearsToNull() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setBio("");

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getBio()).isNull();
        assertThat(response.getHeadline()).isEqualTo("Software Engineer"); // Untouched

        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getBio()).isNull();
    }

    @Test
    @DisplayName("16. Whitespace-only string field clears value to NULL")
    void updateProfile_whitespaceOnlyString_clearsToNull() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setBio("   ");

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getBio()).isNull();
        assertThat(response.getHeadline()).isEqualTo("Software Engineer"); // Untouched

        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getBio()).isNull();
    }

    @Test
    @DisplayName("17. String field with surrounding whitespace is trimmed before saving")
    void updateProfile_stringWithWhitespaces_isTrimmed() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("   Senior Fullstack Engineer   ");
        request.setLocation("  Da Nang  ");

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getHeadline()).isEqualTo("Senior Fullstack Engineer");
        assertThat(response.getLocation()).isEqualTo("Da Nang");

        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getHeadline()).isEqualTo("Senior Fullstack Engineer");
        assertThat(captor.getValue().getLocation()).isEqualTo("Da Nang");
    }

    @Test
    @DisplayName("18. Payload where all fields are null makes zero modifications and skips saving")
    void updateProfile_allNullFields_skipsSaving() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline(null);
        request.setBio(null);
        request.setExperienceYears(null);
        request.setEducation(null);
        request.setLocation(null);
        request.setAddress(null);

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getHeadline()).isEqualTo("Software Engineer");
        assertThat(response.getBio()).isEqualTo("Existing bio");
        assertThat(response.getExperienceYears()).isEqualTo((short) 3);
        assertThat(response.getEducation()).isEqualTo("B.S. Computer Science");
        assertThat(response.getLocation()).isEqualTo("Ho Chi Minh City");
        assertThat(response.getAddress()).isEqualTo("District 1");

        // Verify save is never called
        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("19. Explicit null experience_years keeps existing value")
    void updateProfile_nullExperienceYears_keepsExistingValue() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Update headline but explicitly send null for experience_years
        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setHeadline("Staff Engineer");
        request.setExperienceYears(null);

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getHeadline()).isEqualTo("Staff Engineer");
        assertThat(response.getExperienceYears()).isEqualTo((short) 3); // Untouched

        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getHeadline()).isEqualTo("Staff Engineer");
        assertThat(captor.getValue().getExperienceYears()).isEqualTo((short) 3);
    }

    @Test
    @DisplayName("20. Payload containing only null experience_years makes zero modifications and skips saving")
    void updateProfile_onlyNullExperienceYears_skipsSaving() {
        UUID userId = UUID.randomUUID();
        User user = createCandidateUser(userId);
        CandidateProfile profile = createProfile(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        UpdateCandidateProfileRequest request = new UpdateCandidateProfileRequest();
        request.setExperienceYears(null);

        CandidateProfileResponse response = serviceWithVerification.updateProfile(userId, request);

        assertThat(response.getExperienceYears()).isEqualTo((short) 3);
        verify(candidateProfileRepository, never()).save(any());
    }
}
