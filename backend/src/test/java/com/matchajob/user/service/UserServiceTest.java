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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyMemberRepository companyMemberRepository;

    private UserService userService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, companyMemberRepository, true);
        userId = UUID.randomUUID();
    }

    private User candidate() {
        return User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .timezone("Asia/Ho_Chi_Minh")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private User employer() {
        return User.builder()
                .id(userId)
                .email("employer@example.com")
                .fullName("Employer Name")
                .role("employer")
                .status("active")
                .isVerified(true)
                .timezone("Asia/Ho_Chi_Minh")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("getCurrentUserProfile: candidate gets an empty companies list")
    void getProfile_candidate_emptyCompanies() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(candidate()));

        UserProfileResponse response = userService.getCurrentUserProfile(userId);

        assertThat(response.getRole()).isEqualTo("CANDIDATE");
        assertThat(response.getCompanies()).isEmpty();
        verifyNoInteractions(companyMemberRepository);
    }

    @Test
    @DisplayName("getCurrentUserProfile: employer gets the companies they belong to")
    void getProfile_employer_companiesPopulated() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(employer()));
        when(companyMemberRepository.findActiveCompanySummariesByUserId(userId))
                .thenReturn(List.of(new CompanySummaryResponse(companyId, "Company A", "owner")));

        UserProfileResponse response = userService.getCurrentUserProfile(userId);

        assertThat(response.getRole()).isEqualTo("EMPLOYER");
        assertThat(response.getCompanies()).hasSize(1);
        assertThat(response.getCompanies().get(0).getId()).isEqualTo(companyId);
    }

    @Test
    @DisplayName("getCurrentUserProfile: missing user is a 404")
    void getProfile_missingUser_notFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUserProfile(userId))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    @DisplayName("getCurrentUserProfile: soft-deleted user is a 404")
    void getProfile_softDeleted_notFound() {
        User user = candidate();
        user.setDeletedAt(Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.getCurrentUserProfile(userId))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    @DisplayName("getCurrentUserProfile: suspended account is rejected")
    void getProfile_suspended_rejected() {
        User user = candidate();
        user.setStatus("suspended");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.getCurrentUserProfile(userId))
                .isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    @DisplayName("getCurrentUserProfile: unverified account is rejected when verification is required")
    void getProfile_unverified_rejected() {
        User user = candidate();
        user.setIsVerified(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.getCurrentUserProfile(userId))
                .isInstanceOf(AccountNotActivatedException.class);
    }

    @Test
    @DisplayName("updateCurrentUserProfile: writes allowlisted fields")
    void updateProfile_writesAllowlistedFields() {
        User user = candidate();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCurrentUserRequest request = new UpdateCurrentUserRequest();
        request.setFullName("  New Name  ");
        request.setPhone("+84901234567");
        request.setAvatarUrl("https://cdn.example.com/a.png");
        request.setTimezone("Europe/Paris");

        UserProfileResponse response = userService.updateCurrentUserProfile(userId, request);

        assertThat(response.getFullName()).isEqualTo("New Name");
        assertThat(response.getPhone()).isEqualTo("+84901234567");
        assertThat(response.getAvatarUrl()).isEqualTo("https://cdn.example.com/a.png");
        assertThat(response.getTimezone()).isEqualTo("Europe/Paris");
        assertThat(response.getRole()).isEqualTo("CANDIDATE");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateCurrentUserProfile: blank fullName is rejected")
    void updateProfile_blankFullName_rejected() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(candidate()));

        UpdateCurrentUserRequest request = new UpdateCurrentUserRequest();
        request.setFullName("   ");

        assertThatThrownBy(() -> userService.updateCurrentUserProfile(userId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fullName");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateCurrentUserProfile: unknown timezone is rejected")
    void updateProfile_invalidTimezone_rejected() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(candidate()));

        UpdateCurrentUserRequest request = new UpdateCurrentUserRequest();
        request.setTimezone("Mars/Base");

        assertThatThrownBy(() -> userService.updateCurrentUserProfile(userId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("timezone");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateCurrentUserProfile: blank phone clears the column")
    void updateProfile_blankPhone_clearsValue() {
        User user = candidate();
        user.setPhone("+84901234567");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCurrentUserRequest request = new UpdateCurrentUserRequest();
        request.setPhone("  ");

        UserProfileResponse response = userService.updateCurrentUserProfile(userId, request);

        assertThat(response.getPhone()).isNull();
    }

    @Test
    @DisplayName("updateCurrentUserProfile: an empty payload is a no-op")
    void updateProfile_emptyPayload_noWrite() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(candidate()));

        userService.updateCurrentUserProfile(userId, new UpdateCurrentUserRequest());

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateCurrentUserProfile: a suspended account cannot self-update")
    void updateProfile_suspended_rejected() {
        User user = candidate();
        user.setStatus("suspended");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UpdateCurrentUserRequest request = new UpdateCurrentUserRequest();
        request.setFullName("Hacked");

        assertThatThrownBy(() -> userService.updateCurrentUserProfile(userId, request))
                .isInstanceOf(AccountSuspendedException.class);

        verify(userRepository, never()).save(any());
    }
}
