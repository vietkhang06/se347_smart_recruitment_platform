package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.auth.dto.LoginRequest;
import com.matchajob.auth.dto.LoginResponse;
import com.matchajob.auth.dto.RegisterRequest;
import com.matchajob.auth.dto.RegisterResponse;
import com.matchajob.auth.dto.UserSummaryDto;
import com.matchajob.auth.service.AuthService;
import com.matchajob.user.dto.CandidateProfileResponse;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.dto.UpdateCandidateProfileRequest;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import com.matchajob.user.service.CandidateProfileService;
import com.matchajob.user.service.CompanyService;
import com.matchajob.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 3: Comprehensive HTTP Integration Tests for REAL routes and Spring Security Filter Chain.
 *
 * Verifies real controllers (AuthController, UserController, CompanyController, CandidateProfileController)
 * without dummy/test controller substitutions.
 *
 * Verifies:
 * - Public routes: login, register, health, OpenAPI docs
 * - Protected authenticated routes: /v1/users/me, unknown endpoints (deny-by-default)
 * - Role-protected routes: /v1/companies (EMPLOYER only), /v1/candidates/profile (CANDIDATE only)
 * - Error behaviors: 401 Unauthorized ProblemDetail, 403 Forbidden ProblemDetail
 * - Token edge cases: expired, malformed, foreign secret
 * - CORS preflight OPTIONS handling from frontend origins
 *
 * Note on Recruitment endpoints:
 * Routes under com.matchajob.api.recruitment (JobController, EmployerJobController, CategoryController, SkillController)
 * are excluded from component scan via MatchaJobApplication's excludeFilters. Per Phase 3 rules,
 * security route rules are defined in SecurityConfig but cannot be tested via HTTP without dummy controllers
 * or altering component scan.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityRouteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private CompanyService companyService;

    @MockBean
    private CandidateProfileService candidateProfileService;

    @MockBean
    private UserRepository userRepository;

    // =========================================================================
    // 1. PUBLIC AUTHENTICATION ENDPOINTS
    // =========================================================================

    @Nested
    @DisplayName("1. Public Authentication Endpoints (Real AuthController)")
    class PublicAuthEndpoints {

        @Test
        @DisplayName("POST /v1/auth/login permits anonymous access and reaches real AuthController")
        void login_anonymous_reachesControllerAndReturns200() throws Exception {
            UUID userId = UUID.randomUUID();
            LoginResponse loginResponse = LoginResponse.builder()
                    .accessToken("mocked.valid.jwt.token")
                    .tokenType("Bearer")
                    .expiresIn(3600L)
                    .user(UserSummaryDto.builder()
                            .id(userId)
                            .email("candidate@example.com")
                            .fullName("Test Candidate")
                            .role("CANDIDATE")
                            .build())
                    .build();

            when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

            LoginRequest loginRequest = LoginRequest.builder()
                    .email("candidate@example.com")
                    .password("Password123!")
                    .build();

            mockMvc.perform(post("/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.access_token").value("mocked.valid.jwt.token"))
                    .andExpect(jsonPath("$.token_type").value("Bearer"))
                    .andExpect(jsonPath("$.expires_in").value(3600))
                    .andExpect(jsonPath("$.user.id").value(userId.toString()))
                    .andExpect(jsonPath("$.user.email").value("candidate@example.com"))
                    .andExpect(jsonPath("$.user.role").value("CANDIDATE"));

            verify(authService, times(1)).login(any(LoginRequest.class));
        }

        @Test
        @DisplayName("POST /v1/auth/register permits anonymous access and reaches real AuthController")
        void register_anonymous_reachesControllerAndReturns201() throws Exception {
            UUID userId = UUID.randomUUID();
            RegisterResponse registerResponse = RegisterResponse.builder()
                    .id(userId)
                    .email("employer@matchajob.com")
                    .fullName("Employer Name")
                    .role("EMPLOYER")
                    .status("pending_verification")
                    .isVerified(false)
                    .message("User registered successfully")
                    .build();

            when(authService.register(any(RegisterRequest.class))).thenReturn(registerResponse);

            RegisterRequest registerRequest = RegisterRequest.builder()
                    .email("employer@matchajob.com")
                    .password("StrongPassword123!")
                    .role("EMPLOYER")
                    .build();

            mockMvc.perform(post("/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(userId.toString()))
                    .andExpect(jsonPath("$.email").value("employer@matchajob.com"))
                    .andExpect(jsonPath("$.role").value("EMPLOYER"))
                    .andExpect(jsonPath("$.status").value("pending_verification"));

            verify(authService, times(1)).register(any(RegisterRequest.class));
        }

        @Test
        @DisplayName("POST /v1/auth/login with valid Bearer token is still accessible")
        void login_withBearerToken_accessibleAndReturns200() throws Exception {
            UUID userId = UUID.randomUUID();
            String token = jwtTokenProvider.generateToken(userId);

            User activeUser = User.builder()
                    .id(userId)
                    .email("user@example.com")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));

            LoginResponse loginResponse = LoginResponse.builder()
                    .accessToken("new.token")
                    .tokenType("Bearer")
                    .expiresIn(3600L)
                    .user(UserSummaryDto.builder()
                            .id(userId)
                            .email("user@example.com")
                            .fullName("Test User")
                            .role("CANDIDATE")
                            .build())
                    .build();
            when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

            LoginRequest loginRequest = LoginRequest.builder()
                    .email("user@example.com")
                    .password("Password123!")
                    .build();

            mockMvc.perform(post("/v1/auth/login")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.access_token").value("new.token"));
        }
    }

    // =========================================================================
    // 2. AUTHENTICATED ENDPOINTS & TOKEN VALIDATION
    // =========================================================================

    @Nested
    @DisplayName("2. Authenticated Endpoints (Real UserController /v1/users/me)")
    class AuthenticatedEndpoints {

        @Test
        @DisplayName("GET /v1/users/me without token is rejected with 401 Unauthorized ProblemDetail")
        void getCurrentUser_anonymous_returns401ProblemDetail() throws Exception {
            mockMvc.perform(get("/v1/users/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/problem+json"))
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.title").value("Unauthorized"))
                    .andExpect(jsonPath("$.detail").value("Full authentication is required to access this resource"));

            verifyNoInteractions(userService);
        }

        @Test
        @DisplayName("GET /v1/users/me with malformed Bearer token is rejected with 401")
        void getCurrentUser_malformedToken_returns401() throws Exception {
            mockMvc.perform(get("/v1/users/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-jwt-token"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(userService);
        }

        @Test
        @DisplayName("GET /v1/users/me with expired token is rejected with 401")
        void getCurrentUser_expiredToken_returns401() throws Exception {
            JwtTokenProvider expiredProvider = new JwtTokenProvider(SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET, -60000L);
            String expiredToken = expiredProvider.generateToken(UUID.randomUUID());

            mockMvc.perform(get("/v1/users/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(userService);
        }

        @Test
        @DisplayName("GET /v1/users/me with invalid signature (foreign secret) is rejected with 401")
        void getCurrentUser_foreignSecretToken_returns401() throws Exception {
            String foreignSecret = "YW5vdGhlcl92ZXJ5X3NlY3VyZV9qd3Rfc2VjcmV0X2tleV9mb3JfbWF0Y2hham9iXzIwMjZfMTIzNDU2Nzg=";
            JwtTokenProvider foreignProvider = new JwtTokenProvider(foreignSecret, 3600000L);
            String foreignToken = foreignProvider.generateToken(UUID.randomUUID());

            mockMvc.perform(get("/v1/users/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + foreignToken))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(userService);
        }

        @Test
        @DisplayName("GET /v1/users/me with valid JWT token reaches real UserController and returns 200 OK")
        void getCurrentUser_validToken_reachesControllerAndReturns200() throws Exception {
            UUID userId = UUID.randomUUID();
            User activeUser = User.builder()
                    .id(userId)
                    .email("cand@example.com")
                    .fullName("Candidate User")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));

            UserProfileResponse profileResponse = UserProfileResponse.builder()
                    .id(userId)
                    .email("cand@example.com")
                    .fullName("Candidate User")
                    .role("CANDIDATE")
                    .status("active")
                    .isVerified(true)
                    .build();
            when(userService.getCurrentUserProfile(userId)).thenReturn(profileResponse);

            String token = jwtTokenProvider.generateToken(userId);

            mockMvc.perform(get("/v1/users/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(userId.toString()))
                    .andExpect(jsonPath("$.email").value("cand@example.com"))
                    .andExpect(jsonPath("$.role").value("CANDIDATE"))
                    .andExpect(jsonPath("$.status").value("active"));

            verify(userService, times(1)).getCurrentUserProfile(userId);
        }
    }

    // =========================================================================
    // 3. ROLE-PROTECTED ENDPOINTS: EMPLOYER (Real CompanyController)
    // =========================================================================

    @Nested
    @DisplayName("3. Role-Protected Endpoints: Employer (/v1/companies)")
    class RoleProtectedEmployerEndpoints {

        @Test
        @DisplayName("POST /v1/companies without token is rejected with 401 Unauthorized")
        void createCompany_anonymous_returns401() throws Exception {
            CreateCompanyRequest request = CreateCompanyRequest.builder()
                    .name("Matcha Tech Corp")
                    .taxCode("0312345678")
                    .build();

            mockMvc.perform(post("/v1/companies")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(companyService);
        }

        @Test
        @DisplayName("POST /v1/companies with CANDIDATE role is rejected with 403 Forbidden")
        void createCompany_candidateRole_rejectedWith403() throws Exception {
            UUID candidateId = UUID.randomUUID();
            User candidateUser = User.builder()
                    .id(candidateId)
                    .email("candidate@example.com")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidateUser));
            String candidateToken = jwtTokenProvider.generateToken(candidateId);

            CreateCompanyRequest request = CreateCompanyRequest.builder()
                    .name("Unauthorized Company")
                    .taxCode("0312345678")
                    .build();

            mockMvc.perform(post("/v1/companies")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.title").value("Forbidden"));

            verifyNoInteractions(companyService);
        }

        @Test
        @DisplayName("POST /v1/companies with EMPLOYER role reaches real CompanyController and returns 201 Created")
        void createCompany_employerRole_reachesControllerAndReturns201() throws Exception {
            UUID employerId = UUID.randomUUID();
            User employerUser = User.builder()
                    .id(employerId)
                    .email("employer@example.com")
                    .role("employer")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(employerId)).thenReturn(Optional.of(employerUser));
            String employerToken = jwtTokenProvider.generateToken(employerId);

            UUID companyId = UUID.randomUUID();
            CompanyResponse response = CompanyResponse.builder()
                    .id(companyId)
                    .name("Matcha Solutions Ltd")
                    .taxCode("0312345678")
                    .isVerified(true)
                    .build();

            when(companyService.createCompany(eq(employerId), any(CreateCompanyRequest.class))).thenReturn(response);

            CreateCompanyRequest request = CreateCompanyRequest.builder()
                    .name("Matcha Solutions Ltd")
                    .taxCode("0312345678")
                    .size("50-150")
                    .build();

            mockMvc.perform(post("/v1/companies")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(companyId.toString()))
                    .andExpect(jsonPath("$.name").value("Matcha Solutions Ltd"))
                    .andExpect(jsonPath("$.tax_code").value("0312345678"));

            verify(companyService, times(1)).createCompany(eq(employerId), any(CreateCompanyRequest.class));
        }
    }

    // =========================================================================
    // 4. ROLE-PROTECTED ENDPOINTS: CANDIDATE (Real CandidateProfileController)
    // =========================================================================

    @Nested
    @DisplayName("4. Role-Protected Endpoints: Candidate (/v1/candidates/profile)")
    class RoleProtectedCandidateEndpoints {

        @Test
        @DisplayName("GET /v1/candidates/profile without token is rejected with 401 Unauthorized")
        void getProfile_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/candidates/profile"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(candidateProfileService);
        }

        @Test
        @DisplayName("GET /v1/candidates/profile with EMPLOYER role is rejected with 403 Forbidden")
        void getProfile_employerRole_rejectedWith403() throws Exception {
            UUID employerId = UUID.randomUUID();
            User employerUser = User.builder()
                    .id(employerId)
                    .email("employer@example.com")
                    .role("employer")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(employerId)).thenReturn(Optional.of(employerUser));
            String employerToken = jwtTokenProvider.generateToken(employerId);

            mockMvc.perform(get("/v1/candidates/profile")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.title").value("Forbidden"));

            verifyNoInteractions(candidateProfileService);
        }

        @Test
        @DisplayName("GET /v1/candidates/profile with CANDIDATE role reaches real CandidateProfileController and returns 200 OK")
        void getProfile_candidateRole_reachesControllerAndReturns200() throws Exception {
            UUID candidateId = UUID.randomUUID();
            User candidateUser = User.builder()
                    .id(candidateId)
                    .email("candidate@example.com")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidateUser));
            String candidateToken = jwtTokenProvider.generateToken(candidateId);

            UUID profileId = UUID.randomUUID();
            CandidateProfileResponse profileResponse = CandidateProfileResponse.builder()
                    .id(profileId)
                    .userId(candidateId)
                    .headline("Senior Java Engineer")
                    .bio("Experienced backend developer")
                    .experienceYears((short) 5)
                    .location("Ho Chi Minh City")
                    .build();

            when(candidateProfileService.getProfile(candidateId)).thenReturn(profileResponse);

            mockMvc.perform(get("/v1/candidates/profile")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(profileId.toString()))
                    .andExpect(jsonPath("$.headline").value("Senior Java Engineer"))
                    .andExpect(jsonPath("$.experience_years").value(5));

            verify(candidateProfileService, times(1)).getProfile(candidateId);
        }

        @Test
        @DisplayName("PATCH /v1/candidates/profile with CANDIDATE role reaches controller and returns 200 OK")
        void updateProfile_candidateRole_reachesControllerAndReturns200() throws Exception {
            UUID candidateId = UUID.randomUUID();
            User candidateUser = User.builder()
                    .id(candidateId)
                    .email("candidate@example.com")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidateUser));
            String candidateToken = jwtTokenProvider.generateToken(candidateId);

            CandidateProfileResponse updatedResponse = CandidateProfileResponse.builder()
                    .id(UUID.randomUUID())
                    .userId(candidateId)
                    .headline("Principal Architect")
                    .experienceYears((short) 10)
                    .build();

            when(candidateProfileService.updateProfile(eq(candidateId), any(UpdateCandidateProfileRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(patch("/v1/candidates/profile")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"headline\":\"Principal Architect\",\"experience_years\":10}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.headline").value("Principal Architect"))
                    .andExpect(jsonPath("$.experience_years").value(10));

            verify(candidateProfileService, times(1)).updateProfile(eq(candidateId), any(UpdateCandidateProfileRequest.class));
        }
    }

    // =========================================================================
    // 5. DENY-BY-DEFAULT FOR UNKNOWN ROUTES
    // =========================================================================

    @Nested
    @DisplayName("5. Deny-By-Default Verification")
    class DenyByDefault {

        @Test
        @DisplayName("Anonymous request to unknown/unmapped route is rejected with 401 Unauthorized (Deny-by-default)")
        void unknownRoute_anonymous_rejectedWith401() throws Exception {
            mockMvc.perform(get("/v1/non-existent-secret-resource"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.title").value("Unauthorized"));
        }

        @Test
        @DisplayName("Authenticated request to unknown route passes security and returns 404 Not Found")
        void unknownRoute_authenticated_passesSecurityAndReturns404() throws Exception {
            UUID userId = UUID.randomUUID();
            User activeUser = User.builder()
                    .id(userId)
                    .email("user@example.com")
                    .role("candidate")
                    .status("active")
                    .isVerified(true)
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));
            String token = jwtTokenProvider.generateToken(userId);

            mockMvc.perform(get("/v1/non-existent-resource-12345")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================================
    // 6. CORS PREFLIGHT OPTIONS HANDLING
    // =========================================================================

    @Nested
    @DisplayName("6. CORS Preflight OPTIONS Handling")
    class CorsPreflightHandling {

        @Test
        @DisplayName("Preflight OPTIONS request from frontend origin (http://localhost:5173) is permitted with 200 OK and CORS headers")
        void preflightOptions_fromFrontendOrigin_permittedWith200() throws Exception {
            mockMvc.perform(options("/v1/auth/login")
                            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization"))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
                    .andExpect(header().exists(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS));
        }

        @Test
        @DisplayName("Preflight OPTIONS on protected route from frontend origin is not blocked with 401/403")
        void preflightOptions_onProtectedRoute_permittedWith200() throws Exception {
            mockMvc.perform(options("/v1/companies")
                            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization"))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        }
    }

    // =========================================================================
    // 7. PUBLIC ACTUATOR & OPENAPI ENDPOINTS
    // =========================================================================

    @Nested
    @DisplayName("7. Public Actuator & OpenAPI Endpoints")
    class PublicSystemEndpoints {

        @Test
        @DisplayName("GET /actuator/health is permitted anonymously without 401/403")
        void healthCheck_anonymous_permittedWithout401() throws Exception {
            mockMvc.perform(get("/actuator/health"))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(403));
        }

        @Test
        @DisplayName("GET /v3/api-docs is permitted anonymously in test profile where springdoc is enabled")
        void apiDocs_anonymous_permittedWhenSpringdocEnabled() throws Exception {
            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.openapi").exists());
        }
    }
}
