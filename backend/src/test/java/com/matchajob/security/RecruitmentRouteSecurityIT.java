package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.service.CategoryService;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.api.recruitment.service.SkillService;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 4B-1: HTTP Integration Tests for Recruitment Module Routes and Spring Security Filter Chain.
 *
 * Verifies real controllers:
 * - CategoryController (GET /v1/categories)
 * - SkillController (GET /v1/skills)
 * - JobController (GET /v1/jobs, GET /v1/jobs/{id})
 * - EmployerJobController (/v1/employer/jobs)
 *
 * NOTE: Ownership enforcement (companyId / createdBy validation and IDOR prevention)
 * for EmployerJobController is explicitly OUT OF SCOPE for Phase 4B-1 and will be
 * implemented in Phase 4B-2. These tests verify HTTP security route policies only.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RecruitmentRouteSecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JobService jobService;

    @MockBean
    private CategoryService categoryService;

    @MockBean
    private SkillService skillService;

    private String createTokenForRole(String role) {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email(role.toLowerCase() + "@example.com")
                .role(role.toLowerCase())
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return jwtTokenProvider.generateToken(userId);
    }

    // =========================================================================
    // 1. PUBLIC RECRUITMENT ENDPOINTS
    // =========================================================================

    @Nested
    @DisplayName("1. Public Recruitment Endpoints (Anonymous Access Allowed)")
    class PublicEndpoints {

        @Test
        @DisplayName("GET /v1/jobs without authentication is permitted (200 OK)")
        void getJobs_anonymous_permitted() throws Exception {
            PageResponse<JobSummaryResponse> emptyPage = PageResponse.<JobSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .page(0)
                    .size(10)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();
            when(jobService.searchJobs(any())).thenReturn(emptyPage);

            mockMvc.perform(get("/v1/jobs"))
                    .andExpect(status().isOk())
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(403));

            verify(jobService, times(1)).searchJobs(any());
        }

        @Test
        @DisplayName("GET /v1/categories without authentication is permitted (200 OK)")
        void getCategories_anonymous_permitted() throws Exception {
            when(categoryService.getAllCategories()).thenReturn(List.of(
                    CategoryResponse.builder().id(UUID.randomUUID()).name("Engineering").build()
            ));

            mockMvc.perform(get("/v1/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("Engineering"))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(403));

            verify(categoryService, times(1)).getAllCategories();
        }

        @Test
        @DisplayName("GET /v1/skills without authentication is permitted (200 OK)")
        void getSkills_anonymous_permitted() throws Exception {
            when(skillService.getSkills(any(), any())).thenReturn(List.of(
                    SkillResponse.builder().id(UUID.randomUUID()).name("Java").build()
            ));

            mockMvc.perform(get("/v1/skills"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("Java"))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401))
                    .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(403));

            verify(skillService, times(1)).getSkills(any(), any());
        }
    }

    // =========================================================================
    // 2. JOB DETAIL ENDPOINT POLICY
    // =========================================================================

    @Nested
    @DisplayName("2. Job Detail Endpoint Policy (GET /v1/jobs/{id})")
    class JobDetailPolicy {

        @Test
        @DisplayName("GET /v1/jobs/{id} without authentication is rejected with 401 Unauthorized per project owner decision")
        void getJobDetail_anonymous_rejectedWith401() throws Exception {
            UUID jobId = UUID.randomUUID();

            mockMvc.perform(get("/v1/jobs/" + jobId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("GET /v1/jobs/{id} with valid JWT (Candidate) is permitted (200 OK)")
        void getJobDetail_authenticatedCandidate_permitted() throws Exception {
            UUID jobId = UUID.randomUUID();
            JobDetailResponse jobDetail = JobDetailResponse.builder()
                    .id(jobId)
                    .title("Senior Backend Engineer")
                    .status("active")
                    .build();
            when(jobService.getJobDetail(jobId)).thenReturn(jobDetail);

            String token = createTokenForRole("CANDIDATE");

            mockMvc.perform(get("/v1/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(jobId.toString()))
                    .andExpect(jsonPath("$.title").value("Senior Backend Engineer"));

            verify(jobService, times(1)).getJobDetail(jobId);
        }

        @Test
        @DisplayName("GET /v1/jobs/{id} with valid JWT (Employer) is permitted (200 OK)")
        void getJobDetail_authenticatedEmployer_permitted() throws Exception {
            UUID jobId = UUID.randomUUID();
            JobDetailResponse jobDetail = JobDetailResponse.builder()
                    .id(jobId)
                    .title("Frontend Developer")
                    .status("active")
                    .build();
            when(jobService.getJobDetail(jobId)).thenReturn(jobDetail);

            String token = createTokenForRole("EMPLOYER");

            mockMvc.perform(get("/v1/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(jobId.toString()))
                    .andExpect(jsonPath("$.title").value("Frontend Developer"));

            verify(jobService, times(1)).getJobDetail(jobId);
        }
    }

    // =========================================================================
    // 3. NORMALIZED PREFIX AND LEGACY PREFIX BEHAVIOR
    // =========================================================================

    @Nested
    @DisplayName("3. Legacy /api/v1 Prefix Normalization")
    class LegacyPrefixNormalization {

        @Test
        @DisplayName("Anonymous request to legacy prefix /api/v1/jobs is rejected with 401 Unauthorized (Deny-by-default)")
        void legacyPrefixJobs_anonymous_rejectedWith401() throws Exception {
            mockMvc.perform(get("/api/v1/jobs"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("Authenticated request to legacy prefix /api/v1/jobs passes security but returns 404 Not Found (controller moved to /v1)")
        void legacyPrefixJobs_authenticated_returns404NotFound() throws Exception {
            String token = createTokenForRole("CANDIDATE");

            mockMvc.perform(get("/api/v1/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isNotFound());

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("Anonymous request to legacy prefix /api/v1/categories is rejected with 401 Unauthorized")
        void legacyPrefixCategories_anonymous_rejectedWith401() throws Exception {
            mockMvc.perform(get("/api/v1/categories"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(categoryService);
        }
    }

    // =========================================================================
    // 4. ROLE-PROTECTED EMPLOYER ROUTES (/v1/employer/**)
    // =========================================================================

    @Nested
    @DisplayName("4. Role-Protected Employer Routes (/v1/employer/**)")
    class EmployerRouteSecurity {

        @Test
        @DisplayName("GET /v1/employer/jobs without authentication is rejected with 401 Unauthorized")
        void getEmployerJobs_anonymous_rejectedWith401() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs")
                            .param("companyId", UUID.randomUUID().toString()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("GET /v1/employer/jobs with CANDIDATE role is rejected with 403 Forbidden")
        void getEmployerJobs_candidateRole_rejectedWith403() throws Exception {
            String candidateToken = createTokenForRole("CANDIDATE");

            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .param("companyId", UUID.randomUUID().toString()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.title").value("Forbidden"));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("GET /v1/employer/jobs with EMPLOYER role passes route security (200 OK)")
        void getEmployerJobs_employerRole_passesSecurityWith200() throws Exception {
            UUID companyId = UUID.randomUUID();
            PageResponse<JobSummaryResponse> emptyPage = PageResponse.<JobSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .page(0)
                    .size(10)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();
            when(jobService.getEmployerJobs(any(), eq(companyId), any(), anyInt(), anyInt())).thenReturn(emptyPage);

            String employerToken = createTokenForRole("EMPLOYER");

            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken)
                            .param("companyId", companyId.toString()))
                    .andExpect(status().isOk());

            verify(jobService, times(1)).getEmployerJobs(any(), eq(companyId), any(), anyInt(), anyInt());
        }
    }

    // =========================================================================
    // 5. MUTATING RECRUITMENT ROUTES (POST, PUT, PATCH, DELETE)
    // =========================================================================

    @Nested
    @DisplayName("5. Mutating Employer Job Endpoints (POST / PUT / PATCH / DELETE)")
    class MutatingEmployerJobEndpoints {

        @Test
        @DisplayName("POST /v1/employer/jobs without token is rejected with 401 Unauthorized")
        void createJob_anonymous_rejectedWith401() throws Exception {
            mockMvc.perform(post("/v1/employer/jobs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Tech Lead\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("POST /v1/employer/jobs with CANDIDATE role is rejected with 403 Forbidden")
        void createJob_candidateRole_rejectedWith403() throws Exception {
            String candidateToken = createTokenForRole("CANDIDATE");

            mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Tech Lead\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("POST /v1/employer/jobs with EMPLOYER role passes route security (201 Created)")
        void createJob_employerRole_passesSecurityWith201() throws Exception {
            JobDetailResponse created = JobDetailResponse.builder()
                    .id(UUID.randomUUID())
                    .title("Tech Lead")
                    .status("draft")
                    .build();
            when(jobService.createJob(any(), any(JobCreateRequest.class))).thenReturn(created);

            String employerToken = createTokenForRole("EMPLOYER");

            mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Tech Lead\",\"companyId\":\"" + UUID.randomUUID() + "\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Tech Lead"));

            verify(jobService, times(1)).createJob(any(), any(JobCreateRequest.class));
        }

        @Test
        @DisplayName("PUT /v1/employer/jobs/{id} without token is rejected with 401 Unauthorized")
        void updateJob_anonymous_rejectedWith401() throws Exception {
            UUID jobId = UUID.randomUUID();

            mockMvc.perform(put("/v1/employer/jobs/" + jobId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Senior Tech Lead\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("PUT /v1/employer/jobs/{id} with CANDIDATE role is rejected with 403 Forbidden")
        void updateJob_candidateRole_rejectedWith403() throws Exception {
            UUID jobId = UUID.randomUUID();
            String candidateToken = createTokenForRole("CANDIDATE");

            mockMvc.perform(put("/v1/employer/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Senior Tech Lead\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("PUT /v1/employer/jobs/{id} with EMPLOYER role passes route security (200 OK)")
        void updateJob_employerRole_passesSecurityWith200() throws Exception {
            UUID jobId = UUID.randomUUID();
            JobDetailResponse updated = JobDetailResponse.builder()
                    .id(jobId)
                    .title("Senior Tech Lead")
                    .status("active")
                    .build();
            when(jobService.updateJob(any(), eq(jobId), any(JobUpdateRequest.class))).thenReturn(updated);

            String employerToken = createTokenForRole("EMPLOYER");

            mockMvc.perform(put("/v1/employer/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Senior Tech Lead\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Senior Tech Lead"));

            verify(jobService, times(1)).updateJob(any(), eq(jobId), any(JobUpdateRequest.class));
        }

        @Test
        @DisplayName("PATCH /v1/employer/jobs/{id}/status without token is rejected with 401 Unauthorized")
        void updateJobStatus_anonymous_rejectedWith401() throws Exception {
            UUID jobId = UUID.randomUUID();

            mockMvc.perform(patch("/v1/employer/jobs/" + jobId + "/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"active\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("PATCH /v1/employer/jobs/{id}/status with CANDIDATE role is rejected with 403 Forbidden")
        void updateJobStatus_candidateRole_rejectedWith403() throws Exception {
            UUID jobId = UUID.randomUUID();
            String candidateToken = createTokenForRole("CANDIDATE");

            mockMvc.perform(patch("/v1/employer/jobs/" + jobId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"active\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("PATCH /v1/employer/jobs/{id}/status with EMPLOYER role passes route security (200 OK)")
        void updateJobStatus_employerRole_passesSecurityWith200() throws Exception {
            UUID jobId = UUID.randomUUID();
            JobDetailResponse updated = JobDetailResponse.builder()
                    .id(jobId)
                    .title("Tech Lead")
                    .status("active")
                    .build();
            when(jobService.updateJobStatus(any(), eq(jobId), eq("active"))).thenReturn(updated);

            String employerToken = createTokenForRole("EMPLOYER");

            mockMvc.perform(patch("/v1/employer/jobs/" + jobId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"active\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("active"));

            verify(jobService, times(1)).updateJobStatus(any(), eq(jobId), eq("active"));
        }

        @Test
        @DisplayName("DELETE /v1/employer/jobs/{id} without token is rejected with 401 Unauthorized")
        void deleteJob_anonymous_rejectedWith401() throws Exception {
            UUID jobId = UUID.randomUUID();

            mockMvc.perform(delete("/v1/employer/jobs/" + jobId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("DELETE /v1/employer/jobs/{id} with CANDIDATE role is rejected with 403 Forbidden")
        void deleteJob_candidateRole_rejectedWith403() throws Exception {
            UUID jobId = UUID.randomUUID();
            String candidateToken = createTokenForRole("CANDIDATE");

            mockMvc.perform(delete("/v1/employer/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + candidateToken))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(jobService);
        }

        @Test
        @DisplayName("DELETE /v1/employer/jobs/{id} with EMPLOYER role passes route security (204 No Content)")
        void deleteJob_employerRole_passesSecurityWith204() throws Exception {
            UUID jobId = UUID.randomUUID();
            doNothing().when(jobService).deleteJob(any(), eq(jobId));

            String employerToken = createTokenForRole("EMPLOYER");

            mockMvc.perform(delete("/v1/employer/jobs/" + jobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + employerToken))
                    .andExpect(status().isNoContent());

            verify(jobService, times(1)).deleteJob(any(), eq(jobId));
        }
    }
}
