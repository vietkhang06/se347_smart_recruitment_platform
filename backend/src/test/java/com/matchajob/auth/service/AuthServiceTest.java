package com.matchajob.auth.service;

import com.matchajob.auth.dto.LoginRequest;
import com.matchajob.auth.dto.LoginResponse;
import com.matchajob.auth.dto.RegisterRequest;
import com.matchajob.auth.dto.RegisterResponse;
import com.matchajob.auth.exception.*;
import com.matchajob.security.JwtTokenProvider;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AuthService authServiceWithVerification;
    private AuthService authServiceWithoutVerification;

    @BeforeEach
    void setUp() {
        authServiceWithVerification = new AuthService(
                userRepository,
                candidateProfileRepository,
                passwordEncoder,
                jwtTokenProvider,
                true // requireEmailVerification = true
        );

        authServiceWithoutVerification = new AuthService(
                userRepository,
                candidateProfileRepository,
                passwordEncoder,
                jwtTokenProvider,
                false // requireEmailVerification = false
        );
    }

    // ==========================================
    // REGISTER TESTS
    // ==========================================

    @Test
    @DisplayName("1. Register Candidate creates User and CandidateProfile atomically")
    void register_candidate_createsUserAndProfile() {
        RegisterRequest request = RegisterRequest.builder()
                .email("Candidate@Example.Com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("candidate@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongPassword123!")).thenReturn("hashed_password");

        UUID generatedId = UUID.randomUUID();
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(generatedId);
            return u;
        });

        RegisterResponse response = authServiceWithVerification.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(generatedId);
        assertThat(response.getEmail()).isEqualTo("candidate@example.com");
        assertThat(response.getFullName()).isEqualTo("candidate");
        assertThat(response.getRole()).isEqualTo("CANDIDATE");
        assertThat(response.getStatus()).isEqualTo("pending_verification");
        assertThat(response.getIsVerified()).isFalse();

        // Verify CandidateProfile creation
        ArgumentCaptor<CandidateProfile> profileCaptor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository, times(1)).saveAndFlush(profileCaptor.capture());
        assertThat(profileCaptor.getValue().getUserId()).isEqualTo(generatedId);
    }

    @Test
    @DisplayName("2. Register Employer creates User only without CandidateProfile")
    void register_employer_doesNotCreateCandidateProfile() {
        RegisterRequest request = RegisterRequest.builder()
                .email("employer@company.com")
                .password("StrongPassword123!")
                .role("EMPLOYER")
                .build();

        when(userRepository.existsByEmail("employer@company.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RegisterResponse response = authServiceWithVerification.register(request);

        assertThat(response.getRole()).isEqualTo("EMPLOYER");
        verify(candidateProfileRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("3. Register normalizes email with trim and lowercase")
    void register_normalizesEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .email("   JoHn.DoE@ExAmPlE.CoM   ")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pwd");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RegisterResponse response = authServiceWithVerification.register(request);

        assertThat(response.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(response.getFullName()).isEqualTo("john.doe");
    }

    @Test
    @DisplayName("4. Register rejects malformed email")
    void register_rejectsMalformedEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .email("not-an-email")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(AuthValidationException.class)
                .hasMessageContaining("Email must be a valid email address");
    }

    @Test
    @DisplayName("5. Register rejects short password less than 8 characters")
    void register_rejectsShortPassword() {
        RegisterRequest request = RegisterRequest.builder()
                .email("user@example.com")
                .password("short")
                .role("CANDIDATE")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(AuthValidationException.class)
                .hasMessageContaining("Password must be at least 8 characters");
    }

    @Test
    @DisplayName("6. Register rejects password exceeding 72 UTF-8 bytes without truncation")
    void register_rejectsPasswordExceeding72Bytes() {
        // Create 73-byte UTF-8 string
        String longPassword = "A".repeat(73);
        assertThat(longPassword.getBytes(StandardCharsets.UTF_8).length).isEqualTo(73);

        RegisterRequest request = RegisterRequest.builder()
                .email("user@example.com")
                .password(longPassword)
                .role("CANDIDATE")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(AuthValidationException.class)
                .hasMessageContaining("Password must not exceed 72 bytes UTF-8");

        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("7. Register rejects ADMIN role and unknown roles")
    void register_rejectsAdminAndUnknownRoles() {
        RegisterRequest adminRequest = RegisterRequest.builder()
                .email("admin@example.com")
                .password("StrongPassword123!")
                .role("ADMIN")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.register(adminRequest))
                .isInstanceOf(InvalidRegistrationRoleException.class)
                .hasMessageContaining("Only CANDIDATE and EMPLOYER roles are permitted for public registration");

        RegisterRequest invalidRoleRequest = RegisterRequest.builder()
                .email("hacker@example.com")
                .password("StrongPassword123!")
                .role("ROOT_USER")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.register(invalidRoleRequest))
                .isInstanceOf(InvalidRegistrationRoleException.class)
                .hasMessageContaining("Only CANDIDATE and EMPLOYER roles are permitted for public registration");
    }

    @Test
    @DisplayName("8. Register rejects email already registered with 409")
    void register_rejectsExistingEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .email("existing@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("Email is already registered");

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("9. Register handles database unique email race condition with 409")
    void register_handlesUniqueEmailRaceCondition() {
        RegisterRequest request = RegisterRequest.builder()
                .email("race@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("race@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"uq_users_email\""));

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("Email is already registered");
    }

    @Test
    @DisplayName("10. Register does not mask unrelated data integrity violations as duplicate email")
    void register_doesNotMaskUnrelatedIntegrityViolations() {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("valid@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("check constraint check_something_else violated"));

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(DataIntegrityViolationException.class)
                .isNotInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    @DisplayName("11. Register rolls back if CandidateProfile creation fails")
    void register_candidateProfileFailure_throwsException() {
        RegisterRequest request = RegisterRequest.builder()
                .email("candidate@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("candidate@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(candidateProfileRepository.saveAndFlush(any(CandidateProfile.class)))
                .thenThrow(new RuntimeException("Candidate profile table locked"));

        assertThatThrownBy(() -> authServiceWithVerification.register(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Candidate profile table locked");
    }

    @Test
    @DisplayName("12. Register creates active and verified user when email verification is disabled")
    void register_verificationDisabled_createsActiveUser() {
        RegisterRequest request = RegisterRequest.builder()
                .email("dev@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        when(userRepository.existsByEmail("dev@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RegisterResponse response = authServiceWithoutVerification.register(request);

        assertThat(response.getStatus()).isEqualTo("active");
        assertThat(response.getIsVerified()).isTrue();
    }

    // ==========================================
    // LOGIN TESTS
    // ==========================================

    @Test
    @DisplayName("13. Login success updates last_login_at and generates JWT")
    void login_success_generatesTokenAndUpdatesLastLogin() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("user@example.com")
                .passwordHash("hashed_password")
                .fullName("Test User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(userId)).thenReturn("mock.jwt.token");
        when(jwtTokenProvider.getExpirationSeconds()).thenReturn(3600L);

        LoginRequest request = LoginRequest.builder()
                .email("USER@EXAMPLE.COM")
                .password("Password123!")
                .build();

        LoginResponse response = authServiceWithVerification.login(request);

        assertThat(response.getAccessToken()).isEqualTo("mock.jwt.token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getExpiresIn()).isEqualTo(3600L);
        assertThat(response.getUser().getId()).isEqualTo(userId);
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
        assertThat(response.getUser().getFullName()).isEqualTo("Test User");
        assertThat(response.getUser().getRole()).isEqualTo("CANDIDATE");

        // Verify last_login_at updated
        verify(userRepository, times(1)).save(user);
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    @Test
    @DisplayName("14. Login with non-existent email throws InvalidCredentialsException")
    void login_emailNotFound_throwsInvalidCredentials() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        LoginRequest request = LoginRequest.builder()
                .email("unknown@example.com")
                .password("Password123!")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(jwtTokenProvider, never()).generateToken(any());
    }

    @Test
    @DisplayName("15. Login with wrong password throws same InvalidCredentialsException message")
    void login_wrongPassword_throwsSameInvalidCredentials() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("hashed_password")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "hashed_password")).thenReturn(false);

        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("WrongPassword")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @DisplayName("16. Login with soft-deleted user throws InvalidCredentialsException")
    void login_softDeletedUser_throwsInvalidCredentials() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("deleted@example.com")
                .passwordHash("hashed_password")
                .status("active")
                .isVerified(true)
                .deletedAt(Instant.now())
                .build();

        when(userRepository.findByEmail("deleted@example.com")).thenReturn(Optional.of(user));

        LoginRequest request = LoginRequest.builder()
                .email("deleted@example.com")
                .password("Password123!")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @DisplayName("17. Login with suspended account throws AccountSuspendedException")
    void login_suspendedAccount_throwsAccountSuspended() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("suspended@example.com")
                .passwordHash("hashed_password")
                .status("suspended")
                .isVerified(true)
                .build();

        when(userRepository.findByEmail("suspended@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);

        LoginRequest request = LoginRequest.builder()
                .email("suspended@example.com")
                .password("Password123!")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(AccountSuspendedException.class)
                .hasMessage("Account has been suspended");

        // Suspended is also blocked when verification is disabled
        assertThatThrownBy(() -> authServiceWithoutVerification.login(request))
                .isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    @DisplayName("18. Login with unverified account throws AccountNotActivatedException when verification enabled")
    void login_unverifiedAccount_throwsAccountNotActivated() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("unverified@example.com")
                .passwordHash("hashed_password")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findByEmail("unverified@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);

        LoginRequest request = LoginRequest.builder()
                .email("unverified@example.com")
                .password("Password123!")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(AccountNotActivatedException.class)
                .hasMessage("Account is pending email verification");
    }

    @Test
    @DisplayName("19. Login with unverified account succeeds when verification is disabled")
    void login_unverifiedAccount_succeedsWhenVerificationDisabled() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("dev_unverified@example.com")
                .passwordHash("hashed_password")
                .fullName("Dev User")
                .role("employer")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findByEmail("dev_unverified@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(userId)).thenReturn("mock.jwt.token");
        when(jwtTokenProvider.getExpirationSeconds()).thenReturn(3600L);

        LoginRequest request = LoginRequest.builder()
                .email("dev_unverified@example.com")
                .password("Password123!")
                .build();

        LoginResponse response = authServiceWithoutVerification.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock.jwt.token");
    }

    @Test
    @DisplayName("20. Database failure updating last_login_at propagates DataAccessException")
    void login_lastLoginAtDbError_propagatesException() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("user@example.com")
                .passwordHash("hashed_password")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenThrow(new QueryTimeoutException("DB connection dropped"));

        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("Password123!")
                .build();

        assertThatThrownBy(() -> authServiceWithVerification.login(request))
                .isInstanceOf(QueryTimeoutException.class)
                .hasMessageContaining("DB connection dropped");

        verify(jwtTokenProvider, never()).generateToken(any());
    }
}
