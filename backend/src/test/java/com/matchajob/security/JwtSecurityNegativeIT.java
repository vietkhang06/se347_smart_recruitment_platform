package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.fixture.UserFixture;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("JWT Security Negative Integration Tests")
class JwtSecurityNegativeIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    private static final String FOREIGN_SECRET = "Zm9yZWlnbl9zZWNyZXRfa2V5X2Zvcl90ZXN0aW5nX2p3dF92YWxpZGF0aW9uXzIwMjY=";

    @Test
    @DisplayName("1. Anonymous request to protected resource returns 401 ProblemDetail")
    void anonymousRequest_returns401ProblemDetail() throws Exception {
        mockMvc.perform(get("/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.type").value("https://matchajob.com/errors/unauthorized"));
    }

    @Test
    @DisplayName("2. Malformed token returns 401 Unauthorized")
    void malformedToken_returns401() throws Exception {
        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-malformed-token-content"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("3. Expired token returns 401 Unauthorized")
    void expiredToken_returns401() throws Exception {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET, -60000L);
        UUID userId = UUID.randomUUID();
        String expiredToken = expiredProvider.generateToken(userId);

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("4. Token signed with foreign key returns 401 Unauthorized")
    void foreignSecretToken_returns401() throws Exception {
        JwtTokenProvider foreignProvider = new JwtTokenProvider(FOREIGN_SECRET, 3600000L);
        UUID userId = UUID.randomUUID();
        String forgedToken = foreignProvider.generateToken(userId);

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + forgedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("5. Token with alg 'none' or unsigned token returns 401 Unauthorized")
    void unsignedToken_returns401() throws Exception {
        // Construct an unsigned/tampered token header.payload.
        String unsignedToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkxMjMifQ.";

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + unsignedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("6. User with suspended status returns 401 Unauthorized on next request")
    void suspendedUser_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId);

        User suspendedUser = UserFixture.createCandidateUser(userId, "suspended@test.com");
        suspendedUser.setStatus("suspended");
        when(userRepository.findById(userId)).thenReturn(Optional.of(suspendedUser));

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("7. User with banned status returns 401 Unauthorized on next request")
    void bannedUser_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId);

        User bannedUser = UserFixture.createCandidateUser(userId, "banned@test.com");
        bannedUser.setStatus("banned");
        when(userRepository.findById(userId)).thenReturn(Optional.of(bannedUser));

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("8. User with inactive status returns 401 Unauthorized on next request")
    void inactiveUser_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId);

        User inactiveUser = UserFixture.createCandidateUser(userId, "inactive@test.com");
        inactiveUser.setStatus("inactive");
        when(userRepository.findById(userId)).thenReturn(Optional.of(inactiveUser));

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("9. Soft-deleted user (deleted_at != null) returns 401 Unauthorized on next request")
    void softDeletedUser_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId);

        User deletedUser = UserFixture.createCandidateUser(userId, "deleted@test.com");
        deletedUser.setDeletedAt(Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(deletedUser));

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("10. Token for non-existent user returns 401 Unauthorized")
    void nonExistentUser_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }
}
