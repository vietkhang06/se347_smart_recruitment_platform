package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.application.dto.InterviewCreateRequest;
import com.matchajob.application.dto.InterviewResponse;
import com.matchajob.application.dto.InterviewStatusUpdateRequest;
import com.matchajob.application.dto.InterviewUpdateRequest;
import com.matchajob.application.service.InterviewService;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Interview Management RBAC and Negative Security Tests")
class InterviewSecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private InterviewService interviewService;

    @MockBean
    private UserRepository userRepository;

    private User createActiveUser(UUID userId, String email, String role) {
        User user = User.builder()
                .id(userId)
                .email(email)
                .fullName("Test " + role)
                .role(role.toLowerCase())
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return user;
    }

    private String generateBearerToken(UUID userId, String email, String role) {
        createActiveUser(userId, email, role);
        return "Bearer " + jwtTokenProvider.generateToken(userId);
    }

    // =========================================================================
    // 1. ANONYMOUS ACCESS (401 Unauthorized)
    // =========================================================================
    @Nested
    @DisplayName("1. Anonymous Access Rejection (401)")
    class AnonymousAccess {

        @Test
        @DisplayName("GET /v1/interviews without token returns 401 Unauthorized")
        void getInterviews_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/interviews"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.title").value("Unauthorized"));
        }

        @Test
        @DisplayName("GET /v1/interviews/{id} without token returns 401 Unauthorized")
        void getInterviewById_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/interviews/" + UUID.randomUUID()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("POST /v1/interviews without token returns 401 Unauthorized")
        void createInterview_anonymous_returns401() throws Exception {
            InterviewCreateRequest request = InterviewCreateRequest.builder()
                    .applicationId(UUID.randomUUID().toString())
                    .scheduledAt(Instant.now().plusSeconds(86400))
                    .build();

            mockMvc.perform(post("/v1/interviews")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("PUT /v1/interviews/{id} without token returns 401 Unauthorized")
        void updateInterview_anonymous_returns401() throws Exception {
            InterviewUpdateRequest request = InterviewUpdateRequest.builder()
                    .note("Updated note")
                    .build();

            mockMvc.perform(put("/v1/interviews/" + UUID.randomUUID())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("PATCH /v1/interviews/{id}/status without token returns 401 Unauthorized")
        void updateStatus_anonymous_returns401() throws Exception {
            InterviewStatusUpdateRequest request = InterviewStatusUpdateRequest.builder()
                    .status("confirmed")
                    .build();

            mockMvc.perform(patch("/v1/interviews/" + UUID.randomUUID() + "/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("GET /v1/employer/interviews without token returns 401 Unauthorized")
        void getEmployerInterviews_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/employer/interviews"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }
    }

    // =========================================================================
    // 2. ROLE RESTRICTION (403 Forbidden for CANDIDATE)
    // =========================================================================
    @Nested
    @DisplayName("2. Role Enforcement (CANDIDATE is Forbidden)")
    class RoleEnforcement {

        @Test
        @DisplayName("Candidate GET /v1/interviews returns 403 Forbidden")
        void getInterviews_candidate_returns403() throws Exception {
            String token = generateBearerToken(UUID.randomUUID(), "cand@test.com", "candidate");

            mockMvc.perform(get("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));

            verify(interviewService, never()).getEmployerInterviews(any(), any(), any());
        }

        @Test
        @DisplayName("Candidate POST /v1/interviews returns 403 Forbidden")
        void createInterview_candidate_returns403() throws Exception {
            String token = generateBearerToken(UUID.randomUUID(), "cand@test.com", "candidate");

            InterviewCreateRequest request = InterviewCreateRequest.builder()
                    .applicationId(UUID.randomUUID().toString())
                    .build();

            mockMvc.perform(post("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));

            verify(interviewService, never()).createInterview(any(), any());
        }

        @Test
        @DisplayName("Candidate PATCH /v1/interviews/{id}/status returns 403 Forbidden")
        void updateStatus_candidate_returns403() throws Exception {
            String token = generateBearerToken(UUID.randomUUID(), "cand@test.com", "candidate");

            InterviewStatusUpdateRequest request = InterviewStatusUpdateRequest.builder()
                    .status("completed")
                    .build();

            mockMvc.perform(patch("/v1/interviews/" + UUID.randomUUID() + "/status")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));

            verify(interviewService, never()).updateInterviewStatus(any(), any(), any(), any());
        }
    }

    // =========================================================================
    // 3. CROSS-TENANT / IDOR PROTECTION
    // =========================================================================
    @Nested
    @DisplayName("3. Cross-Tenant IDOR Protection (Employer vs Employer)")
    class CrossTenantProtection {

        @Test
        @DisplayName("Employer A scheduling interview for Employer B application returns 403 Forbidden")
        void createInterview_unownedApplication_returns403() throws Exception {
            UUID employerAId = UUID.randomUUID();
            String token = generateBearerToken(employerAId, "employerA@test.com", "employer");

            UUID unownedAppId = UUID.randomUUID();
            InterviewCreateRequest request = InterviewCreateRequest.builder()
                    .applicationId(unownedAppId.toString())
                    .build();

            when(interviewService.createInterview(eq(employerAId), any(InterviewCreateRequest.class)))
                    .thenThrow(new AccessDeniedException("Access is denied: You do not have permission to manage this job"));

            mockMvc.perform(post("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Employer A querying interviews for Employer B company returns 403 Forbidden")
        void getInterviews_unownedCompany_returns403() throws Exception {
            UUID employerAId = UUID.randomUUID();
            String token = generateBearerToken(employerAId, "employerA@test.com", "employer");
            UUID companyBId = UUID.randomUUID();

            when(interviewService.getEmployerInterviews(eq(employerAId), eq(companyBId), any()))
                    .thenThrow(new AccessDeniedException("Access is denied: You do not have permission to manage this company"));

            mockMvc.perform(get("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .param("companyId", companyBId.toString()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Employer A updating unowned interview returns 403 Forbidden")
        void updateInterview_unowned_returns403() throws Exception {
            UUID employerAId = UUID.randomUUID();
            String token = generateBearerToken(employerAId, "employerA@test.com", "employer");
            UUID interviewBId = UUID.randomUUID();

            InterviewUpdateRequest request = InterviewUpdateRequest.builder()
                    .note("Tampered note")
                    .build();

            when(interviewService.updateInterview(eq(employerAId), eq(interviewBId), any(InterviewUpdateRequest.class)))
                    .thenThrow(new AccessDeniedException("Access is denied: You do not have permission to manage this job"));

            mockMvc.perform(put("/v1/interviews/" + interviewBId)
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        @DisplayName("Employer A updating status of unowned interview returns 403 Forbidden")
        void updateInterviewStatus_unowned_returns403() throws Exception {
            UUID employerAId = UUID.randomUUID();
            String token = generateBearerToken(employerAId, "employerA@test.com", "employer");
            UUID interviewBId = UUID.randomUUID();

            InterviewStatusUpdateRequest request = InterviewStatusUpdateRequest.builder()
                    .status("cancelled")
                    .reason("Malicious cancellation")
                    .build();

            when(interviewService.updateInterviewStatus(eq(employerAId), eq(interviewBId), eq("cancelled"), any()))
                    .thenThrow(new AccessDeniedException("Access is denied: You do not have permission to manage this job"));

            mockMvc.perform(patch("/v1/interviews/" + interviewBId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }
    }

    // =========================================================================
    // 4. POSITIVE ACCESS
    // =========================================================================
    @Nested
    @DisplayName("4. Legitimate Employer Access")
    class LegitimateAccess {

        @Test
        @DisplayName("Employer successfully creates interview for owned application (201 Created)")
        void createInterview_ownedApplication_returns201() throws Exception {
            UUID employerId = UUID.randomUUID();
            String token = generateBearerToken(employerId, "employer@test.com", "employer");
            UUID appId = UUID.randomUUID();

            InterviewCreateRequest request = InterviewCreateRequest.builder()
                    .applicationId(appId.toString())
                    .scheduledAt(Instant.now().plusSeconds(86400))
                    .durationMin(45)
                    .interviewType("Technical Interview")
                    .build();

            InterviewResponse mockResponse = InterviewResponse.builder()
                    .id(UUID.randomUUID())
                    .applicationId(appId)
                    .interviewType("Technical Interview")
                    .status("pending_confirm")
                    .build();

            when(interviewService.createInterview(eq(employerId), any(InterviewCreateRequest.class)))
                    .thenReturn(mockResponse);

            mockMvc.perform(post("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.applicationId").value(appId.toString()))
                    .andExpect(jsonPath("$.interviewType").value("Technical Interview"));
        }

        @Test
        @DisplayName("Employer successfully lists interviews for owned company (200 OK)")
        void listInterviews_ownedCompany_returns200() throws Exception {
            UUID employerId = UUID.randomUUID();
            String token = generateBearerToken(employerId, "employer@test.com", "employer");
            UUID companyId = UUID.randomUUID();

            InterviewResponse mockResponse = InterviewResponse.builder()
                    .id(UUID.randomUUID())
                    .applicationId(UUID.randomUUID())
                    .companyName("Employer Company")
                    .status("confirmed")
                    .build();

            when(interviewService.getEmployerInterviews(eq(employerId), eq(companyId), any()))
                    .thenReturn(List.of(mockResponse));

            mockMvc.perform(get("/v1/interviews")
                            .header(HttpHeaders.AUTHORIZATION, token)
                            .param("companyId", companyId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].companyName").value("Employer Company"));
        }
    }
}
