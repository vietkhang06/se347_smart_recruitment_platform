package com.matchajob.security;


import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@org.springframework.test.context.ContextConfiguration(classes = SecurityFilterChainMockMvcTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class SecurityFilterChainMockMvcTest {

    @org.springframework.context.annotation.Configuration
    @org.springframework.web.servlet.config.annotation.EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
    static class TestConfig {
        @org.springframework.web.bind.annotation.RestController
        @org.springframework.web.bind.annotation.RequestMapping("/test/protected")
        static class TestProtectedController {
            @org.springframework.web.bind.annotation.GetMapping
            public org.springframework.http.ResponseEntity<String> getProtected() {
                return org.springframework.http.ResponseEntity.ok("ok");
            }
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("1. Anonymous request to protected business endpoint is rejected with 401")
    void anonymousRequestToProtectedEndpoint_returns401() throws Exception {
        mockMvc.perform(get("/test/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Full authentication is required to access this resource"));
    }

    @Test
    @DisplayName("2. Permitted Auth endpoint does not return 401 when accessed anonymously")
    void permitAllAuthEndpoint_allowsAnonymousAccess() throws Exception {
        // /v1/auth/register is permitAll in SecurityConfig. Since Phase 3 controller is not implemented yet,
        // it must pass security and return 404 (Not Found) rather than 401 (Unauthorized).
        mockMvc.perform(post("/v1/auth/register"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("3. Valid Bearer token with active user authenticates through filter chain (200 OK)")
    void validBearerToken_activeUser_authenticatesSuccessfully() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "employer@example.com", "employer");

        User activeUser = User.builder()
                .id(userId)
                .email("employer@example.com")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));

        mockMvc.perform(get("/test/protected")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("4. Invalid or expired token is rejected with 401")
    void invalidOrExpiredToken_returns401() throws Exception {
        // Malformed / invalid token
        mockMvc.perform(get("/test/protected")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());

        // Expired token
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET, -5000L);
        String expiredToken = expiredProvider.generateToken(UUID.randomUUID(), "expired@example.com", "candidate");

        mockMvc.perform(get("/test/protected")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("5. Database exception during user lookup returns HTTP 500 Problem JSON and is not masked as 401/403")
    void databaseException_returns500ProblemJson() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        when(userRepository.findById(userId)).thenThrow(new QueryTimeoutException("Database connection timed out"));

        mockMvc.perform(get("/test/protected")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.detail").value("Authentication service database is temporarily unavailable"));
    }

    @Test
    @DisplayName("6. Health endpoint is permitted anonymously and not blocked with 401")
    void healthEndpoint_permittedAnonymously() throws Exception {
        // Health check endpoint is permitted without authentication
        mockMvc.perform(get("/actuator/health"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    @Test
    @DisplayName("7. Sensitive actuator endpoints are rejected with 401 when accessed anonymously")
    void sensitiveActuatorEndpoints_rejectedAnonymouslyWith401() throws Exception {
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("8. Public Taxonomy GET endpoint is permitted anonymously and does not return 401")
    void taxonomyEndpoint_permittedAnonymously() throws Exception {
        mockMvc.perform(get("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    @Test
    @DisplayName("9. Non-GET or arbitrary recruitment endpoint is rejected with 401 when accessed anonymously")
    void nonGetRecruitmentEndpoint_rejectedAnonymouslyWith401() throws Exception {
        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }
}

