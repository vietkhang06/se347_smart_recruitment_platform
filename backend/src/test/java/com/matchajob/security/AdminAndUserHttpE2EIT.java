package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.admin.dto.AdminUserSummaryResponse;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.user.dto.UpdateCurrentUserRequest;
import com.matchajob.user.dto.UserProfileResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MatchaJobApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("End-to-end real HTTP integration tests")
public class AdminAndUserHttpE2EIT {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID adminId;
    private UUID candidateId;
    private String adminToken;
    private String candidateToken;

    @BeforeEach
    void setUp() {
        cleanUp();

        // Use JDK HttpClient which natively supports PATCH
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());

        adminId = UUID.randomUUID();
        candidateId = UUID.randomUUID();

        jdbcClient.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified)
                VALUES (?, ?, 'hash', 'Test Admin E2E', 'admin', 'active', true)
                """).params(adminId, "e2e.admin." + adminId + "@example.com").update();

        jdbcClient.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified)
                VALUES (?, ?, 'hash', 'Test Candidate E2E', 'candidate', 'active', true)
                """).params(candidateId, "e2e.cand." + candidateId + "@example.com").update();

        adminToken = jwtTokenProvider.generateToken(adminId, "e2e.admin." + adminId + "@example.com", "ROLE_ADMIN");
        candidateToken = jwtTokenProvider.generateToken(candidateId, "e2e.cand." + candidateId + "@example.com", "ROLE_CANDIDATE");
    }

    @AfterEach
    void tearDown() {
        cleanUp();
    }

    private void cleanUp() {
        jdbcClient.sql("""
                DELETE FROM audit_logs
                WHERE actor_id IN (
                    SELECT id FROM users WHERE email LIKE 'e2e.%'
                ) OR target_id IN (
                    SELECT id::text FROM users WHERE email LIKE 'e2e.%'
                )
                """).update();
        jdbcClient.sql("DELETE FROM users WHERE email LIKE 'e2e.%'").update();
    }

    private String baseUrl(String path) {
        return "http://localhost:" + port + "/api" + path;
    }

    @Test
    @DisplayName("E2E: Candidate updates profile via PATCH /v1/users/me")
    void candidateCanUpdateOwnProfile() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(candidateToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        UpdateCurrentUserRequest updateReq = new UpdateCurrentUserRequest();
        updateReq.setFullName("Candidate Updated Name");
        updateReq.setPhone("+84987654321");
        updateReq.setTimezone("Asia/Bangkok");
        updateReq.setAvatarUrl("https://example.com/new-avatar.png");

        HttpEntity<UpdateCurrentUserRequest> requestEntity = new HttpEntity<>(updateReq, headers);

        ResponseEntity<UserProfileResponse> response = restTemplate.exchange(
                baseUrl("/v1/users/me"),
                HttpMethod.PATCH,
                requestEntity,
                UserProfileResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFullName()).isEqualTo("Candidate Updated Name");
        assertThat(response.getBody().getPhone()).isEqualTo("+84987654321");
        assertThat(response.getBody().getTimezone()).isEqualTo("Asia/Bangkok");
        assertThat(response.getBody().getAvatarUrl()).isEqualTo("https://example.com/new-avatar.png");
    }

    @Test
    @DisplayName("E2E: Admin suspends candidate account via PATCH /v1/admin/users/{id}/status")
    void adminCanSuspendUserAccount() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        UpdateUserStatusRequest updateReq = UpdateUserStatusRequest.builder()
                .status("suspended")
                .reason("Terms of service violation")
                .build();

        HttpEntity<UpdateUserStatusRequest> requestEntity = new HttpEntity<>(updateReq, headers);

        ResponseEntity<AdminUserSummaryResponse> response = restTemplate.exchange(
                baseUrl("/v1/admin/users/" + candidateId + "/status"),
                HttpMethod.PATCH,
                requestEntity,
                AdminUserSummaryResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("suspended");

        // Now candidate token should be rejected with 401 Unauthorized because user is suspended
        HttpHeaders candHeaders = new HttpHeaders();
        candHeaders.setBearerAuth(candidateToken);
        ResponseEntity<String> meResponse = restTemplate.exchange(
                baseUrl("/v1/users/me"),
                HttpMethod.GET,
                new HttpEntity<>(candHeaders),
                String.class
        );
        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(meResponse.getHeaders().getContentType()).isNotNull();
        assertThat(meResponse.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)).isTrue();
        assertThat(meResponse.getBody())
                .contains("\"status\":401")
                .contains("\"title\":\"Unauthorized\"")
                .contains("\"type\":\"https://matchajob.com/errors/unauthorized\"")
                .contains("\"detail\":\"Full authentication is required to access this resource\"");
    }
}
