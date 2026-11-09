package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security tests for admin account management against a real database and
 * the real Spring Security filter chain.
 *
 * <p>The decisive case is test 5: once an admin suspends an account, that account's
 * already-issued JWT must stop working immediately, because
 * {@link JwtAuthenticationFilter} re-reads the user row on every request.</p>
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Admin account status management security")
class AdminUserSecurityIT {

    private static final String BCRYPT_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMye.I5tL2a44p1h7rYqZ2j8qW1aF1v1W1q";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcClient jdbcClient;

    private User seedUser(String role, String status, boolean verified) {
        String email = role + "." + UUID.randomUUID() + "@example.com";
        User user = userRepository.save(User.builder()
                .email(email)
                .fullName("Test " + role)
                .passwordHash(BCRYPT_HASH)
                .role(role)
                .status(status)
                .isVerified(verified)
                .build());
        // The audit entry is written through JdbcClient, whose INSERT references
        // audit_logs.actor_id -> users(id). Without a flush the seeded rows are still
        // pending in the persistence context and the raw statement violates that FK.
        userRepository.flush();
        return user;
    }

    private String bearer(User user) {
        String role = user.getRole().toUpperCase(Locale.ROOT);
        return "Bearer " + jwtTokenProvider.generateToken(user.getId(), user.getEmail(), role);
    }

    @Test
    @DisplayName("1. Anonymous GET /v1/admin/users is rejected with 401")
    void listUsers_anonymous_401() throws Exception {
        mockMvc.perform(get("/v1/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    @Test
    @DisplayName("2. Candidate GET /v1/admin/users is rejected with 403")
    void listUsers_candidate_403() throws Exception {
        User candidate = seedUser("candidate", "active", true);

        mockMvc.perform(get("/v1/admin/users").header("Authorization", bearer(candidate)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("3. Employer GET /v1/admin/users is rejected with 403")
    void listUsers_employer_403() throws Exception {
        User employer = seedUser("employer", "active", true);

        mockMvc.perform(get("/v1/admin/users").header("Authorization", bearer(employer)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Admin GET /v1/admin/users returns 200")
    void listUsers_admin_200() throws Exception {
        User admin = seedUser("admin", "active", true);

        mockMvc.perform(get("/v1/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0));
    }

    @Test
    @DisplayName("5. Suspending an account invalidates its existing token on the next request")
    void suspendAccount_oldTokenBecomes401() throws Exception {
        User admin = seedUser("admin", "active", true);
        User candidate = seedUser("candidate", "active", true);

        // The candidate's token works before the suspension.
        mockMvc.perform(get("/v1/users/me").header("Authorization", bearer(candidate)))
                .andExpect(status().isOk());

        // Admin suspends the candidate.
        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidate.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\",\"reason\":\"policy violation\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        // The very same token is now rejected by the authentication filter.
        mockMvc.perform(get("/v1/users/me").header("Authorization", bearer(candidate)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        // Reactivation restores access with the old token.
        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidate.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"));

        mockMvc.perform(get("/v1/users/me").header("Authorization", bearer(candidate)))
                .andExpect(status().isOk());

        // Both transitions are attributed in audit_logs.
        Integer audited = jdbcClient.sql(
                        "SELECT COUNT(*) FROM audit_logs WHERE target_id = ? "
                                + "AND action IN ('SUSPEND_USER', 'ACTIVATE_USER')")
                .param(candidate.getId().toString())
                .query(Integer.class)
                .single();
        assertThat(audited).isEqualTo(2);
    }

    @Test
    @DisplayName("6. An admin cannot suspend their own account")
    void selfSuspend_400() throws Exception {
        User admin = seedUser("admin", "active", true);

        mockMvc.perform(patch("/v1/admin/users/{id}/status", admin.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SELF_SUSPEND_NOT_ALLOWED"));
    }

    @Test
    @DisplayName("7. An invalid status value is rejected with 400 before reaching the service")
    void invalidStatus_400() throws Exception {
        User admin = seedUser("admin", "active", true);
        User candidate = seedUser("candidate", "active", true);

        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidate.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("8. A reason with quotes and control characters is stored without corrupting jsonb")
    void suspendAccount_reasonWithSpecialCharacters_isPersisted() throws Exception {
        User admin = seedUser("admin", "active", true);
        User candidate = seedUser("candidate", "active", true);

        String body = "{\"status\":\"suspended\",\"reason\":\"quote \\\" tab\\t backslash\\\\ end\"}";

        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidate.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        String storedReason = jdbcClient.sql(
                        "SELECT metadata ->> 'reason' FROM audit_logs "
                                + "WHERE target_id = ? AND action = 'SUSPEND_USER'")
                .param(candidate.getId().toString())
                .query(String.class)
                .single();

        assertThat(storedReason).contains("quote \"");
        assertThat(storedReason).contains("tab\t");
    }
}
