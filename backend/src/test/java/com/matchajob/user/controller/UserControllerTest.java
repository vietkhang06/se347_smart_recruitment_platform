package com.matchajob.user.controller;

import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.dto.UpdateCurrentUserRequest;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import com.matchajob.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = UserControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class UserControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public UserController userController(UserService userService) {
            return new UserController(userService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserService userService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("1. Anonymous request to /v1/users/me without token is rejected with 401")
    void getCurrentUser_anonymous_rejectedWith401() throws Exception {
        mockMvc.perform(get("/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("2. Request with malformed Bearer token is rejected with 401")
    void getCurrentUser_malformedToken_rejectedWith401() throws Exception {
        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer invalid-malformed-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("3. Request with token signed by unknown secret is rejected with 401")
    void getCurrentUser_invalidSignatureToken_rejectedWith401() throws Exception {
        String altSecret = "YW5vdGhlcl92ZXJ5X3NlY3VyZV9qd3Rfc2VjcmV0X2tleV9mb3JfbWF0Y2hham9iXzIwMjZfMTIzNDU2Nzg=";
        JwtTokenProvider altProvider = new JwtTokenProvider(altSecret, 3600000L);
        String foreignToken = altProvider.generateToken(UUID.randomUUID(), "foreign@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + foreignToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("4. Request with valid token returns 200 OK with correct API contract")
    void getCurrentUser_validToken_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        User dbUser = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate Name")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build();

        when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, "candidate@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("candidate@example.com"))
                .andExpect(jsonPath("$.full_name").value("Candidate Name"))
                .andExpect(jsonPath("$.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.is_verified").value(true));

        verify(userService, times(1)).getCurrentUserProfile(userId);
    }

    @Test
    @DisplayName("5. Response strictly excludes passwords, password hashes, and deleted_at")
    void getCurrentUser_responseExcludesSensitiveFields() throws Exception {
        UUID userId = UUID.randomUUID();
        User dbUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .fullName("User Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .passwordHash("secret_bcrypt_hash")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(userId)
                .email("user@example.com")
                .fullName("User Name")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build();

        when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andExpect(jsonPath("$.deletedAt").doesNotExist())
                .andExpect(jsonPath("$.deleted_at").doesNotExist());
    }

    @Test
    @DisplayName("6. Client cannot access another user's profile via query parameters or body spoofing")
    void getCurrentUser_ignoresClientProvidedUserId() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID victimUserId = UUID.randomUUID();

        User dbUser = User.builder()
                .id(authenticatedUserId)
                .email("auth_user@example.com")
                .fullName("Auth User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(authenticatedUserId)).thenReturn(Optional.of(dbUser));

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(authenticatedUserId)
                .email("auth_user@example.com")
                .fullName("Auth User")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build();

        when(userService.getCurrentUserProfile(authenticatedUserId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(authenticatedUserId, "auth_user@example.com", "CANDIDATE");

        // Attacker attempts to pass victimUserId in query string and content body
        mockMvc.perform(get("/v1/users/me")
                        .param("userId", victimUserId.toString())
                        .param("email", "victim@example.com")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + victimUserId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(authenticatedUserId.toString()))
                .andExpect(jsonPath("$.email").value("auth_user@example.com"));

        // Strictly verify service was called with authenticated user ID, never the victim ID
        verify(userService, times(1)).getCurrentUserProfile(authenticatedUserId);
        verify(userService, never()).getCurrentUserProfile(victimUserId);
    }

    // =========================================================================
    // PATCH /v1/users/me — allowlisted base-profile update
    // =========================================================================

    @Test
    @DisplayName("14. Anonymous PATCH /v1/users/me is rejected with 401")
    void updateCurrentUser_anonymous_401() throws Exception {
        mockMvc.perform(patch("/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Name\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("15. Candidate PATCH /v1/users/me updates allowlisted fields")
    void updateCurrentUser_validPayload_200() throws Exception {
        UUID userId = UUID.randomUUID();
        User dbUser = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Old Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        UserProfileResponse response = UserProfileResponse.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("New Name")
                .phone("+84901234567")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build();
        when(userService.updateCurrentUserProfile(eq(userId), any(UpdateCurrentUserRequest.class)))
                .thenReturn(response);

        String token = jwtTokenProvider.generateToken(userId, "candidate@example.com", "CANDIDATE");

        mockMvc.perform(patch("/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Name\",\"phone\":\"+84901234567\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.full_name").value("New Name"))
                .andExpect(jsonPath("$.phone").value("+84901234567"));
    }

    @Test
    @DisplayName("16. PATCH /v1/users/me silently drops privileged fields (role/status/is_verified/email)")
    void updateCurrentUser_privilegedFieldsIgnored() throws Exception {
        UUID userId = UUID.randomUUID();
        User dbUser = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Old Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        ArgumentCaptor<UpdateCurrentUserRequest> captor =
                ArgumentCaptor.forClass(UpdateCurrentUserRequest.class);

        when(userService.updateCurrentUserProfile(eq(userId), captor.capture()))
                .thenReturn(UserProfileResponse.builder()
                        .id(userId)
                        .email("candidate@example.com")
                        .fullName("New Name")
                        .role("CANDIDATE")
                        .status("active")
                        .isVerified(true)
                        .build());

        String token = jwtTokenProvider.generateToken(userId, "candidate@example.com", "CANDIDATE");

        mockMvc.perform(patch("/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Name\",\"role\":\"ADMIN\",\"status\":\"suspended\","
                                + "\"is_verified\":false,\"email\":\"attacker@evil.com\"}"))
                .andExpect(status().isOk());

        // The privileged keys never reach the service: the DTO has no setter for them,
        // so Jackson drops them and only fullName is marked as present.
        UpdateCurrentUserRequest forwarded = captor.getValue();
        assertThat(forwarded.hasFullName()).isTrue();
        assertThat(forwarded.getFullName()).isEqualTo("New Name");
        assertThat(forwarded.hasPhone()).isFalse();
        assertThat(forwarded.hasAvatarUrl()).isFalse();
        assertThat(forwarded.hasTimezone()).isFalse();
    }

    @Test
    @DisplayName("17. Invalid timezone is rejected with 400")
    void updateCurrentUser_invalidTimezone_400() throws Exception {
        UUID userId = UUID.randomUUID();
        User dbUser = User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Old Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));
        when(userService.updateCurrentUserProfile(eq(userId), any(UpdateCurrentUserRequest.class)))
                .thenThrow(new IllegalArgumentException("timezone: unknown IANA timezone 'Mars/Base'"));

        String token = jwtTokenProvider.generateToken(userId, "candidate@example.com", "CANDIDATE");

        mockMvc.perform(patch("/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timezone\":\"Mars/Base\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("18. Suspended account PATCH /v1/users/me is rejected with 401")
    void updateCurrentUser_suspended_401() throws Exception {
        UUID userId = UUID.randomUUID();
        User suspended = User.builder()
                .id(userId)
                .email("suspended@example.com")
                .role("candidate")
                .status("suspended")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(suspended));

        String token = jwtTokenProvider.generateToken(userId, "suspended@example.com", "CANDIDATE");

        mockMvc.perform(patch("/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Hacked\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("7. Token of suspended account is rejected by security filter with 401")
    void getCurrentUser_suspendedAccount_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        User suspendedUser = User.builder()
                .id(userId)
                .email("suspended@example.com")
                .role("candidate")
                .status("suspended")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(suspendedUser));

        String token = jwtTokenProvider.generateToken(userId, "suspended@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("8. Token of unverified account is rejected with 401 when email verification is required")
    void getCurrentUser_unverifiedAccount_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        User unverifiedUser = User.builder()
                .id(userId)
                .email("unverified@example.com")
                .role("candidate")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(unverifiedUser));

        String token = jwtTokenProvider.generateToken(userId, "unverified@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("9. Token of soft-deleted account is rejected with 401")
    void getCurrentUser_softDeletedAccount_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        User deletedUser = User.builder()
                .id(userId)
                .email("deleted@example.com")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .deletedAt(Instant.now())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(deletedUser));

        String token = jwtTokenProvider.generateToken(userId, "deleted@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("10. Token for non-existent user in database is rejected with 401")
    void getCurrentUser_userNotFoundInDb_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        String token = jwtTokenProvider.generateToken(userId, "nonexistent@example.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("11. GET /v1/users/me for employer returns companies array with membership_role")
    void getCurrentUser_employerWithCompanies_returnsCompaniesArray() throws Exception {
        UUID userId = UUID.randomUUID();
        User employerUser = User.builder()
                .id(userId)
                .email("employer@matchajob.com")
                .fullName("Employer Name")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        UUID companyId = UUID.randomUUID();
        var companySummary = new com.matchajob.user.dto.CompanySummaryResponse(companyId, "Matcha Solutions Corp", "owner");

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(userId)
                .email("employer@matchajob.com")
                .fullName("Employer Name")
                .role("EMPLOYER")
                .status("active")
                .isVerified(true)
                .companies(java.util.List.of(companySummary))
                .build();

        when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, "employer@matchajob.com", "EMPLOYER");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.role").value("EMPLOYER"))
                .andExpect(jsonPath("$.companies").isArray())
                .andExpect(jsonPath("$.companies[0].id").value(companyId.toString()))
                .andExpect(jsonPath("$.companies[0].name").value("Matcha Solutions Corp"))
                .andExpect(jsonPath("$.companies[0].membership_role").value("owner"));
    }

    @Test
    @DisplayName("12. GET /v1/users/me for candidate returns companies as empty array []")
    void getCurrentUser_candidate_returnsEmptyCompaniesArray() throws Exception {
        UUID userId = UUID.randomUUID();
        User candidateUser = User.builder()
                .id(userId)
                .email("candidate@matchajob.com")
                .fullName("Candidate Name")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(candidateUser));

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(userId)
                .email("candidate@matchajob.com")
                .fullName("Candidate Name")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .companies(java.util.Collections.emptyList())
                .build();

        when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, "candidate@matchajob.com", "CANDIDATE");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companies").isArray())
                .andExpect(jsonPath("$.companies").isEmpty());
    }

    @Test
    @DisplayName("13. GET /v1/users/me for employer without company returns companies as empty array []")
    void getCurrentUser_employerWithoutCompanies_returnsEmptyCompaniesArray() throws Exception {
        UUID userId = UUID.randomUUID();
        User employerUser = User.builder()
                .id(userId)
                .email("employer_new@matchajob.com")
                .fullName("New Employer")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(userId)
                .email("employer_new@matchajob.com")
                .fullName("New Employer")
                .role("EMPLOYER")
                .status("active")
                .isVerified(true)
                .companies(java.util.Collections.emptyList())
                .build();

        when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, "employer_new@matchajob.com", "EMPLOYER");

        mockMvc.perform(get("/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companies").isArray())
                .andExpect(jsonPath("$.companies").isEmpty());
    }
}
