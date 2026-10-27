package com.matchajob.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.auth.dto.*;
import com.matchajob.auth.exception.*;
import com.matchajob.auth.service.AuthService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest
@ContextConfiguration(classes = AuthControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=dGhpc19pc19hX3Zlcnlfc2VjdXJlX2p3dF9zZWNyZXRfa2V5X2Zvcl9tYXRjaGFqb2JfZGV2XzIwMjY=",
        "app.auth.require-email-verification=true"
})
class AuthControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public AuthController authController(AuthService authService) {
            return new AuthController(authService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserRepository userRepository;

    // ==========================================
    // REGISTER ENDPOINT TESTS
    // ==========================================

    @Test
    @DisplayName("1. POST /v1/auth/register permits anonymous request and returns 201 Created")
    void register_anonymousPermitted_returns201() throws Exception {
        UUID userId = UUID.randomUUID();
        RegisterResponse serviceResponse = RegisterResponse.builder()
                .id(userId)
                .email("candidate@example.com")
                .fullName("candidate")
                .role("CANDIDATE")
                .status("pending_verification")
                .isVerified(false)
                .message("User registered successfully")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(serviceResponse);

        RegisterRequest request = RegisterRequest.builder()
                .email("candidate@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("candidate@example.com"))
                .andExpect(jsonPath("$.full_name").value("candidate"))
                .andExpect(jsonPath("$.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.status").value("pending_verification"))
                .andExpect(jsonPath("$.is_verified").value(false))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist());
    }

    @Test
    @DisplayName("2. POST /v1/auth/register with invalid email returns 400 VALIDATION_ERROR")
    void register_invalidEmail_returns400() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email-format")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.title").value("Validation Error"));
    }

    @Test
    @DisplayName("3. POST /v1/auth/register with short password returns 400 VALIDATION_ERROR")
    void register_shortPassword_returns400() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("user@example.com")
                .password("short")
                .role("CANDIDATE")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("4. POST /v1/auth/register with ADMIN role returns 400 INVALID_REGISTRATION_ROLE")
    void register_adminRole_returns400() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new InvalidRegistrationRoleException("Only CANDIDATE and EMPLOYER roles are permitted for public registration"));

        RegisterRequest request = RegisterRequest.builder()
                .email("admin@example.com")
                .password("StrongPassword123!")
                .role("ADMIN")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_REGISTRATION_ROLE"))
                .andExpect(jsonPath("$.title").value("Invalid Registration Role"))
                .andExpect(jsonPath("$.detail").value("Only CANDIDATE and EMPLOYER roles are permitted for public registration"));
    }

    @Test
    @DisplayName("5. POST /v1/auth/register with existing email returns 409 EMAIL_ALREADY_EXISTS")
    void register_duplicateEmail_returns409() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new EmailAlreadyExistsException("Email is already registered"));

        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@example.com")
                .password("StrongPassword123!")
                .role("CANDIDATE")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.title").value("Email Already Exists"))
                .andExpect(jsonPath("$.detail").value("Email is already registered"));
    }

    // ==========================================
    // LOGIN ENDPOINT TESTS
    // ==========================================

    @Test
    @DisplayName("6. POST /v1/auth/login permits anonymous request and returns 200 OK with token")
    void login_validCredentials_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        LoginResponse serviceResponse = LoginResponse.builder()
                .accessToken("mock.jwt.token.string")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .user(UserSummaryDto.builder()
                        .id(userId)
                        .email("user@example.com")
                        .fullName("Test User")
                        .role("CANDIDATE")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(serviceResponse);

        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("StrongPassword123!")
                .build();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").value("mock.jwt.token.string"))
                .andExpect(jsonPath("$.token_type").value("Bearer"))
                .andExpect(jsonPath("$.expires_in").value(3600))
                .andExpect(jsonPath("$.user.id").value(userId.toString()))
                .andExpect(jsonPath("$.user.email").value("user@example.com"))
                .andExpect(jsonPath("$.user.full_name").value("Test User"))
                .andExpect(jsonPath("$.user.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("7. POST /v1/auth/login with invalid credentials returns 401 INVALID_CREDENTIALS")
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new InvalidCredentialsException("Invalid email or password"));

        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.title").value("Invalid Credentials"))
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    @DisplayName("8. POST /v1/auth/login with suspended account returns 403 ACCOUNT_SUSPENDED")
    void login_suspendedAccount_returns403() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AccountSuspendedException("Account has been suspended"));

        LoginRequest request = LoginRequest.builder()
                .email("suspended@example.com")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"))
                .andExpect(jsonPath("$.title").value("Account Suspended"))
                .andExpect(jsonPath("$.detail").value("Account has been suspended"));
    }

    @Test
    @DisplayName("9. POST /v1/auth/login with unactivated account returns 403 ACCOUNT_NOT_ACTIVATED")
    void login_unactivatedAccount_returns403() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AccountNotActivatedException("Account is pending email verification"));

        LoginRequest request = LoginRequest.builder()
                .email("unactivated@example.com")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVATED"))
                .andExpect(jsonPath("$.title").value("Account Not Activated"))
                .andExpect(jsonPath("$.detail").value("Account is pending email verification"));
    }
}
