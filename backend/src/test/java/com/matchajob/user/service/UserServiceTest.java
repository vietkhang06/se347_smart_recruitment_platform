package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountNotActivatedException;
import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.matchajob.user.repository.CompanyMemberRepository companyMemberRepository;

    private UserService userServiceWithVerification;
    private UserService userServiceWithoutVerification;

    @BeforeEach
    void setUp() {
        userServiceWithVerification = new UserService(userRepository, companyMemberRepository, true);
        userServiceWithoutVerification = new UserService(userRepository, companyMemberRepository, false);
    }

    @Test
    @DisplayName("1. Successfully retrieves Candidate profile and maps fields correctly")
    void getCurrentUserProfile_candidateSuccess() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .passwordHash("secret_hash")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(userId);
        assertThat(response.getEmail()).isEqualTo("candidate@example.com");
        assertThat(response.getFullName()).isEqualTo("Candidate User");
        assertThat(response.getRole()).isEqualTo("CANDIDATE");
        assertThat(response.getStatus()).isEqualTo("active");
        assertThat(response.getIsVerified()).isTrue();

        // Verify zero write operations on repository
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, never()).save(any());
        verify(userRepository, never()).delete(any());
    }

    @Test
    @DisplayName("2. Successfully retrieves Employer profile with uppercase role convention")
    void getCurrentUserProfile_employerSuccess() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("hr@company.com")
                .fullName("Employer User")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getRole()).isEqualTo("EMPLOYER");
    }

    @Test
    @DisplayName("3. Throws UserNotFoundException when user ID does not exist in database")
    void getCurrentUserProfile_notFound_throwsUserNotFoundException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(userId))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User not found with id: " + userId);
    }

    @Test
    @DisplayName("4. Throws UserNotFoundException when user ID is null")
    void getCurrentUserProfile_nullUserId_throwsUserNotFoundException() {
        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(null))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User ID cannot be null");

        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("5. Throws UserNotFoundException when user has been soft-deleted")
    void getCurrentUserProfile_softDeleted_throwsUserNotFoundException() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("deleted@example.com")
                .fullName("Deleted User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .deletedAt(Instant.now())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(userId))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User has been deleted");
    }

    @Test
    @DisplayName("6. Throws AccountSuspendedException when user status is suspended")
    void getCurrentUserProfile_suspended_throwsAccountSuspendedException() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("suspended@example.com")
                .fullName("Suspended User")
                .role("candidate")
                .status("suspended")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Suspended is rejected under both verification=true and verification=false configurations
        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(userId))
                .isInstanceOf(AccountSuspendedException.class)
                .hasMessage("Account has been suspended");

        assertThatThrownBy(() -> userServiceWithoutVerification.getCurrentUserProfile(userId))
                .isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    @DisplayName("7. Throws AccountNotActivatedException when unverified and verification is enabled")
    void getCurrentUserProfile_unverifiedWithVerificationEnabled_throwsAccountNotActivated() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("unverified@example.com")
                .fullName("Unverified User")
                .role("candidate")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(userId))
                .isInstanceOf(AccountNotActivatedException.class)
                .hasMessage("Account is pending email verification");
    }

    @Test
    @DisplayName("8. Succeeds for unverified user when email verification is disabled in dev/test")
    void getCurrentUserProfile_unverifiedWithVerificationDisabled_returnsProfile() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("dev_unverified@example.com")
                .fullName("Dev User")
                .role("candidate")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserProfileResponse response = userServiceWithoutVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(userId);
        assertThat(response.getIsVerified()).isFalse();
    }

    @Test
    @DisplayName("9. Database exception during retrieval propagates without being swallowed")
    void getCurrentUserProfile_dbError_propagatesException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenThrow(new QueryTimeoutException("Database timeout"));

        assertThatThrownBy(() -> userServiceWithVerification.getCurrentUserProfile(userId))
                .isInstanceOf(QueryTimeoutException.class)
                .hasMessageContaining("Database timeout");
    }

    @Test
    @DisplayName("10. Candidate profile always returns companies as empty list, never null")
    void getCurrentUserProfile_candidate_returnsEmptyCompaniesList() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getCompanies()).isNotNull().isEmpty();
        verifyNoInteractions(companyMemberRepository);
    }

    @Test
    @DisplayName("11. Employer profile retrieves active companies and maps membership_role correctly")
    void getCurrentUserProfile_employer_returnsActiveCompanies() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("employer@example.com")
                .fullName("Employer User")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        UUID companyId = UUID.randomUUID();
        com.matchajob.user.dto.CompanySummaryResponse companySummary =
                new com.matchajob.user.dto.CompanySummaryResponse(companyId, "Matcha Solutions Corp", "owner");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(companyMemberRepository.findActiveCompanySummariesByUserId(userId))
                .thenReturn(java.util.List.of(companySummary));

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getCompanies()).isNotNull().hasSize(1);
        assertThat(response.getCompanies().get(0).getId()).isEqualTo(companyId);
        assertThat(response.getCompanies().get(0).getName()).isEqualTo("Matcha Solutions Corp");
        assertThat(response.getCompanies().get(0).getMembershipRole()).isEqualTo("owner");
    }

    @Test
    @DisplayName("12. Employer with multiple companies returns all active company memberships")
    void getCurrentUserProfile_employerWithMultipleCompanies_returnsAll() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("employer@example.com")
                .fullName("Employer User")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        UUID c1 = UUID.randomUUID();
        UUID c2 = UUID.randomUUID();
        var list = java.util.List.of(
                new com.matchajob.user.dto.CompanySummaryResponse(c1, "Company One", "owner"),
                new com.matchajob.user.dto.CompanySummaryResponse(c2, "Company Two", "admin")
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(companyMemberRepository.findActiveCompanySummariesByUserId(userId)).thenReturn(list);

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getCompanies()).hasSize(2);
        assertThat(response.getCompanies().get(0).getMembershipRole()).isEqualTo("owner");
        assertThat(response.getCompanies().get(1).getMembershipRole()).isEqualTo("admin");
    }

    @Test
    @DisplayName("13. Employer with zero companies returns companies as empty list, never null")
    void getCurrentUserProfile_employerZeroCompanies_returnsEmptyList() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("new_employer@example.com")
                .fullName("New Employer")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(companyMemberRepository.findActiveCompanySummariesByUserId(userId))
                .thenReturn(java.util.Collections.emptyList());

        UserProfileResponse response = userServiceWithVerification.getCurrentUserProfile(userId);

        assertThat(response).isNotNull();
        assertThat(response.getCompanies()).isNotNull().isEmpty();
    }
}
