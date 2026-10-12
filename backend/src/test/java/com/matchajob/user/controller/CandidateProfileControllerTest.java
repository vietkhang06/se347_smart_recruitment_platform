package com.matchajob.user.controller;

import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.dto.CandidateProfileResponse;
import com.matchajob.user.dto.UpdateCandidateProfileRequest;
import com.matchajob.user.exception.CandidateProfileNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import com.matchajob.user.service.CandidateProfileService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = CandidateProfileControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class CandidateProfileControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public CandidateProfileController candidateProfileController(CandidateProfileService candidateProfileService) {
            return new CandidateProfileController(candidateProfileService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CandidateProfileService candidateProfileService;

    @MockBean
    private UserRepository userRepository;

    private User mockCandidateUser(UUID userId) {
        return User.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("Candidate User")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
    }

    private User mockEmployerUser(UUID userId) {
        return User.builder()
                .id(userId)
                .email("employer@example.com")
                .fullName("Employer User")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();
    }

    private User mockAdminUser(UUID userId) {
        return User.builder()
                .id(userId)
                .email("admin@example.com")
                .fullName("Admin User")
                .role("admin")
                .status("active")
                .isVerified(true)
                .build();
    }

    @Test
    @DisplayName("1. GET without token is rejected with 401 Unauthorized")
    void getProfile_anonymous_rejectedWith401() throws Exception {
        mockMvc.perform(get("/v1/candidates/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("2. PATCH without token is rejected with 401 Unauthorized")
    void updateProfile_anonymous_rejectedWith401() throws Exception {
        mockMvc.perform(patch("/v1/candidates/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\":\"New Headline\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("3. GET with malformed token is rejected with 401 Unauthorized")
    void getProfile_malformedToken_rejectedWith401() throws Exception {
        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer invalid-jwt-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("4. GET by EMPLOYER is rejected with 403 Forbidden via method security")
    void getProfile_employerRole_rejectedWith403() throws Exception {
        UUID employerId = UUID.randomUUID();
        User employer = mockEmployerUser(employerId);
        when(userRepository.findById(employerId)).thenReturn(Optional.of(employer));

        String token = jwtTokenProvider.generateToken(employerId, employer.getEmail(), "EMPLOYER");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.title").value("Forbidden"));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("5. GET by ADMIN is rejected with 403 Forbidden")
    void getProfile_adminRole_rejectedWith403() throws Exception {
        UUID adminId = UUID.randomUUID();
        User admin = mockAdminUser(adminId);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        String token = jwtTokenProvider.generateToken(adminId, admin.getEmail(), "ADMIN");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("6. PATCH by EMPLOYER is rejected with 403 Forbidden")
    void updateProfile_employerRole_rejectedWith403() throws Exception {
        UUID employerId = UUID.randomUUID();
        User employer = mockEmployerUser(employerId);
        when(userRepository.findById(employerId)).thenReturn(Optional.of(employer));

        String token = jwtTokenProvider.generateToken(employerId, employer.getEmail(), "EMPLOYER");

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\":\"Hacking\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("7. GET by suspended account is rejected with 401 at security filter")
    void getProfile_suspendedAccount_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        User suspended = mockCandidateUser(userId);
        suspended.setStatus("suspended");
        when(userRepository.findById(userId)).thenReturn(Optional.of(suspended));

        String token = jwtTokenProvider.generateToken(userId, suspended.getEmail(), "CANDIDATE");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("8. GET by unverified account is rejected with 401 when verification is required")
    void getProfile_unverifiedAccount_rejectedWith401() throws Exception {
        UUID userId = UUID.randomUUID();
        User unverified = mockCandidateUser(userId);
        unverified.setIsVerified(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(unverified));

        String token = jwtTokenProvider.generateToken(userId, unverified.getEmail(), "CANDIDATE");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("9. GET by valid CANDIDATE returns 200 OK with full contract")
    void getProfile_validCandidate_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse profileResponse = CandidateProfileResponse.builder()
                .id(profileId)
                .userId(userId)
                .headline("Senior Java Engineer")
                .bio("Detailed bio")
                .experienceYears((short) 5)
                .education("B.S. Software Engineering")
                .location("Ho Chi Minh City")
                .address("District 1")
                .cvUrl("https://storage.matchajob.com/cv/my-cv.pdf")
                .aiCvScore((short) 92)
                .createdAt(Instant.parse("2026-10-10T12:00:00Z"))
                .updatedAt(Instant.parse("2026-10-12T00:00:00Z"))
                .build();

        when(candidateProfileService.getProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(profileId.toString()))
                .andExpect(jsonPath("$.user_id").value(userId.toString()))
                .andExpect(jsonPath("$.headline").value("Senior Java Engineer"))
                .andExpect(jsonPath("$.bio").value("Detailed bio"))
                .andExpect(jsonPath("$.experience_years").value(5))
                .andExpect(jsonPath("$.education").value("B.S. Software Engineering"))
                .andExpect(jsonPath("$.location").value("Ho Chi Minh City"))
                .andExpect(jsonPath("$.address").value("District 1"))
                .andExpect(jsonPath("$.cv_url").value("https://storage.matchajob.com/cv/my-cv.pdf"))
                .andExpect(jsonPath("$.ai_cv_score").value(92))
                .andExpect(jsonPath("$.created_at").value("2026-10-10T12:00:00Z"))
                .andExpect(jsonPath("$.updated_at").value("2026-10-12T00:00:00Z"))
                .andExpect(jsonPath("$.deleted_at").doesNotExist())
                .andExpect(jsonPath("$.deletedAt").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        verify(candidateProfileService, times(1)).getProfile(userId);
    }

    @Test
    @DisplayName("10. GET returns 404 when candidate profile does not exist in DB")
    void getProfile_missingProfile_returns404() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        when(candidateProfileService.getProfile(userId))
                .thenThrow(new CandidateProfileNotFoundException("Candidate profile not found for user: " + userId));

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(get("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("CANDIDATE_PROFILE_NOT_FOUND"));
    }

    @Test
    @DisplayName("11. PATCH updates profile successfully with 200 OK")
    void updateProfile_validRequest_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse updatedResponse = CandidateProfileResponse.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("Lead Software Architect")
                .bio("10 years building high load systems")
                .experienceYears((short) 10)
                .education("M.S. in Computer Science")
                .location("Da Nang, Vietnam")
                .address("Son Tra District")
                .cvUrl("https://storage.matchajob.com/cv/1.pdf")
                .aiCvScore((short) 90)
                .build();

        when(candidateProfileService.updateProfile(eq(userId), any(UpdateCandidateProfileRequest.class)))
                .thenReturn(updatedResponse);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        String jsonPayload = """
                {
                    "headline": "Lead Software Architect",
                    "bio": "10 years building high load systems",
                    "experience_years": 10,
                    "education": "M.S. in Computer Science",
                    "location": "Da Nang, Vietnam",
                    "address": "Son Tra District"
                }
                """;

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("Lead Software Architect"))
                .andExpect(jsonPath("$.experience_years").value(10))
                .andExpect(jsonPath("$.location").value("Da Nang, Vietnam"));

        ArgumentCaptor<UpdateCandidateProfileRequest> captor = ArgumentCaptor.forClass(UpdateCandidateProfileRequest.class);
        verify(candidateProfileService, times(1)).updateProfile(eq(userId), captor.capture());
        UpdateCandidateProfileRequest req = captor.getValue();
        assertThat(req.hasHeadline()).isTrue();
        assertThat(req.hasExperienceYears()).isTrue();
        assertThat(req.getHeadline()).isEqualTo("Lead Software Architect");
        assertThat(req.getExperienceYears()).isEqualTo((short) 10);
    }

    @Test
    @DisplayName("12. PATCH with negative experience_years fails validation with 400 Bad Request")
    void updateProfile_negativeExperienceYears_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"experience_years\": -1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("13. PATCH with experience_years > 60 fails validation with 400 Bad Request")
    void updateProfile_experienceYearsTooHigh_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"experience_years\": 61}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("14. PATCH with headline longer than 255 chars fails validation with 400 Bad Request")
    void updateProfile_headlineTooLong_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        String longHeadline = "A".repeat(256);

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\":\"" + longHeadline + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verifyNoInteractions(candidateProfileService);
    }

    @Test
    @DisplayName("15. PATCH ignores mass assignment / tampering attempts on system fields")
    void updateProfile_tamperingSystemFields_safelyIgnored() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID victimId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse response = CandidateProfileResponse.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("Legit Update")
                .cvUrl("https://storage.matchajob.com/cv/real.pdf")
                .aiCvScore((short) 75)
                .build();

        when(candidateProfileService.updateProfile(eq(userId), any(UpdateCandidateProfileRequest.class)))
                .thenReturn(response);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        // Attacker injects system fields and victim ID
        String maliciousPayload = """
                {
                    "headline": "Legit Update",
                    "id": "%s",
                    "user_id": "%s",
                    "cv_url": "https://malicious.com/fake.pdf",
                    "ai_cv_score": 100,
                    "created_at": "2000-01-01T00:00:00Z",
                    "deleted_at": "2026-10-12T00:00:00Z"
                }
                """.formatted(UUID.randomUUID(), victimId);

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("Legit Update"));

        // Verify service was strictly called with authenticated caller ID
        verify(candidateProfileService, times(1)).updateProfile(eq(userId), any());
        verify(candidateProfileService, never()).updateProfile(eq(victimId), any());
    }

    @Test
    @DisplayName("16. Spoofing user ID via query parameters is completely ignored")
    void getProfile_ignoresClientProvidedQueryParams() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID victimId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse profileResponse = CandidateProfileResponse.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("My Profile")
                .build();

        when(candidateProfileService.getProfile(userId)).thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(get("/v1/candidates/profile")
                        .param("userId", victimId.toString())
                        .param("candidateId", victimId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("My Profile"));

        verify(candidateProfileService, times(1)).getProfile(userId);
        verify(candidateProfileService, never()).getProfile(victimId);
    }

    @Test
    @DisplayName("17. PATCH with empty JSON body returns 200 OK")
    void updateProfile_emptyBody_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse profileResponse = CandidateProfileResponse.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("Unchanged Profile")
                .build();

        when(candidateProfileService.updateProfile(eq(userId), any(UpdateCandidateProfileRequest.class)))
                .thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("Unchanged Profile"));

        verify(candidateProfileService, times(1)).updateProfile(eq(userId), any());
    }

    @Test
    @DisplayName("18. PATCH with null and empty string fields passes them to service")
    void updateProfile_nullAndEmptyFields_passesToService() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mockCandidateUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CandidateProfileResponse profileResponse = CandidateProfileResponse.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .headline("Software Engineer")
                .bio(null)
                .build();

        when(candidateProfileService.updateProfile(eq(userId), any(UpdateCandidateProfileRequest.class)))
                .thenReturn(profileResponse);

        String token = jwtTokenProvider.generateToken(userId, user.getEmail(), "CANDIDATE");

        String payload = """
                {
                    "headline": null,
                    "bio": "",
                    "experience_years": null
                }
                """;

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        ArgumentCaptor<UpdateCandidateProfileRequest> captor = ArgumentCaptor.forClass(UpdateCandidateProfileRequest.class);
        verify(candidateProfileService, times(1)).updateProfile(eq(userId), captor.capture());
        UpdateCandidateProfileRequest captured = captor.getValue();
        assertThat(captured.hasHeadline()).isTrue();
        assertThat(captured.getHeadline()).isNull();
        assertThat(captured.hasBio()).isTrue();
        assertThat(captured.getBio()).isEqualTo("");
        assertThat(captured.hasExperienceYears()).isTrue();
        assertThat(captured.getExperienceYears()).isNull();
    }
}
