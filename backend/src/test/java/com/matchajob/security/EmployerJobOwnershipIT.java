package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.api.recruitment.dto.JobCreateRequest;
import com.matchajob.api.recruitment.dto.JobStatusUpdateRequest;
import com.matchajob.api.recruitment.dto.JobUpdateRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 4B-2: End-to-end Integration Tests for EmployerJobController Ownership & Security.
 * Tested against real Spring Security filter chain, real controllers, real services, and real PostgreSQL database.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 4B-2: EmployerJobController Ownership & Security Integration Tests")
public class EmployerJobOwnershipIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID userCandidateId;
    private UUID userEmployerAId;
    private UUID userEmployerBId;
    private UUID userEmployerMultiId;
    private UUID userEmployerNoCompanyId;
    private UUID userOwnerCId;

    private UUID companyAId;
    private UUID companyBId;
    private UUID companyCId;

    private UUID jobAId;
    private UUID jobBId;

    private String tokenCandidate;
    private String tokenEmployerA;
    private String tokenEmployerB;
    private String tokenEmployerMulti;
    private String tokenEmployerNoCompany;

    @BeforeEach
    void setupFixtures() {
        userCandidateId = UUID.randomUUID();
        userEmployerAId = UUID.randomUUID();
        userEmployerBId = UUID.randomUUID();
        userEmployerMultiId = UUID.randomUUID();
        userEmployerNoCompanyId = UUID.randomUUID();
        userOwnerCId = UUID.randomUUID();

        companyAId = UUID.randomUUID();
        companyBId = UUID.randomUUID();
        companyCId = UUID.randomUUID();

        jobAId = UUID.randomUUID();
        jobBId = UUID.randomUUID();

        // 1. Create Users
        insertUser(userCandidateId, "candidate-" + userCandidateId + "@test.com", "CANDIDATE");
        insertUser(userEmployerAId, "employer-a-" + userEmployerAId + "@test.com", "EMPLOYER");
        insertUser(userEmployerBId, "employer-b-" + userEmployerBId + "@test.com", "EMPLOYER");
        insertUser(userEmployerMultiId, "employer-multi-" + userEmployerMultiId + "@test.com", "EMPLOYER");
        insertUser(userEmployerNoCompanyId, "employer-none-" + userEmployerNoCompanyId + "@test.com", "EMPLOYER");
        insertUser(userOwnerCId, "owner-c-" + userOwnerCId + "@test.com", "EMPLOYER");

        // 2. Create Companies
        insertCompany(companyAId, userEmployerAId, "Company Alpha");
        insertCompany(companyBId, userEmployerBId, "Company Beta");
        insertCompany(companyCId, userOwnerCId, "Company Gamma");

        // 3. Add Memberships
        // userEmployerA is owner of companyA
        // userEmployerB is owner of companyB
        // userEmployerMulti is member of companyA and companyC
        insertCompanyMember(companyAId, userEmployerMultiId, "member");
        insertCompanyMember(companyCId, userEmployerMultiId, "admin");

        // 4. Create Jobs
        insertJob(jobAId, companyAId, userEmployerAId, "Backend Engineer Alpha", "backend-alpha-" + jobAId, "active");
        insertJob(jobBId, companyBId, userEmployerBId, "Frontend Engineer Beta", "frontend-beta-" + jobBId, "active");

        // 5. Generate JWTs
        tokenCandidate = jwtTokenProvider.generateToken(userCandidateId);
        tokenEmployerA = jwtTokenProvider.generateToken(userEmployerAId);
        tokenEmployerB = jwtTokenProvider.generateToken(userEmployerBId);
        tokenEmployerMulti = jwtTokenProvider.generateToken(userEmployerMultiId);
        tokenEmployerNoCompany = jwtTokenProvider.generateToken(userEmployerNoCompanyId);
    }

    @AfterEach
    void cleanupFixtures() {
        jdbcClient.sql("DELETE FROM job_skills WHERE job_id IN (?, ?)").params(jobAId, jobBId).update();
        jdbcClient.sql("DELETE FROM applications WHERE job_id IN (?, ?)").params(jobAId, jobBId).update();
        jdbcClient.sql("DELETE FROM jobs WHERE id IN (?, ?) OR company_id IN (?, ?, ?)").params(jobAId, jobBId, companyAId, companyBId, companyCId).update();
        jdbcClient.sql("DELETE FROM company_members WHERE company_id IN (?, ?, ?) OR user_id IN (?, ?, ?, ?, ?, ?)").params(companyAId, companyBId, companyCId, userCandidateId, userEmployerAId, userEmployerBId, userEmployerMultiId, userEmployerNoCompanyId, userOwnerCId).update();
        jdbcClient.sql("DELETE FROM companies WHERE id IN (?, ?, ?)").params(companyAId, companyBId, companyCId).update();
        jdbcClient.sql("DELETE FROM users WHERE id IN (?, ?, ?, ?, ?, ?)").params(userCandidateId, userEmployerAId, userEmployerBId, userEmployerMultiId, userEmployerNoCompanyId, userOwnerCId).update();
    }

    private void insertUser(UUID id, String email, String role) {
        jdbcClient.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified, created_at, updated_at)
                VALUES (?, ?, '$2a$10$dummyHashDummyHashDummyHashDummyHashDummyHashDummyHash', ?, ?, 'active', true, now(), now())
                """)
                .params(id, email, "Test " + role, role.toLowerCase())
                .update();
    }

    private void insertCompany(UUID id, UUID ownerId, String name) {
        jdbcClient.sql("""
                INSERT INTO companies (id, owner_id, name, created_at, updated_at)
                VALUES (?, ?, ?, now(), now())
                """)
                .params(id, ownerId, name)
                .update();
    }

    private void insertCompanyMember(UUID companyId, UUID userId, String role) {
        jdbcClient.sql("""
                INSERT INTO company_members (company_id, user_id, role, joined_at)
                VALUES (?, ?, ?, now())
                ON CONFLICT (company_id, user_id) DO NOTHING
                """)
                .params(companyId, userId, role)
                .update();
    }

    private void insertJob(UUID id, UUID companyId, UUID createdBy, String title, String slug, String status) {
        jdbcClient.sql("""
                INSERT INTO jobs (id, company_id, created_by, title, slug, work_type, salary_mode, status, applicant_count, view_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'full_time', 'negotiable', ?, 0, 0, now(), now())
                """)
                .params(id, companyId, createdBy, title, slug, status)
                .update();
    }

    // =========================================================================
    // 1. ROUTE SECURITY & ROLE ENFORCEMENT
    // =========================================================================

    @Nested
    @DisplayName("1. Route Security (401 Anonymous & 403 Candidate)")
    class RouteSecurityTests {

        @Test
        @DisplayName("Requests without JWT return 401 Unauthorized")
        void anonymousRequests_return401() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/v1/employer/jobs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Java Dev\"}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(put("/v1/employer/jobs/" + jobAId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Updated\"}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(patch("/v1/employer/jobs/" + jobAId + "/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"paused\"}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(delete("/v1/employer/jobs/" + jobAId))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Requests with CANDIDATE role return 403 Forbidden")
        void candidateRole_returns403() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenCandidate))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenCandidate)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Java Dev\"}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(put("/v1/employer/jobs/" + jobAId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenCandidate)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Updated\"}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/v1/employer/jobs/" + jobAId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenCandidate)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"paused\"}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/v1/employer/jobs/" + jobAId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenCandidate))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // 2. POST /v1/employer/jobs (CREATE JOB)
    // =========================================================================

    @Nested
    @DisplayName("2. POST /v1/employer/jobs (Ownership & Identity)")
    class CreateJobTests {

        @Test
        @DisplayName("Employer creates job for own company -> 201 Created; created_by is principal")
        void createJob_ownCompany_succeedsWithPrincipalAsCreatedBy() throws Exception {
            JobCreateRequest request = JobCreateRequest.builder()
                    .companyId(companyAId)
                    .title("Senior Cloud Architect")
                    .department("Cloud Platform")
                    .level("senior")
                    .workType("full_time")
                    .location("Ho Chi Minh City")
                    .salaryMode("negotiable")
                    .status("active")
                    .deadline(LocalDate.now().plusDays(30))
                    .build();

            String responseJson = mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Senior Cloud Architect"))
                    .andExpect(jsonPath("$.companyId").value(companyAId.toString()))
                    .andExpect(jsonPath("$.createdBy").value(userEmployerAId.toString()))
                    .andReturn().getResponse().getContentAsString();

            UUID createdJobId = UUID.fromString(objectMapper.readTree(responseJson).get("id").asText());

            // Verify in DB directly
            var jobRow = jdbcClient.sql("SELECT created_by, company_id, status FROM jobs WHERE id = ?")
                    .param(createdJobId)
                    .query((rs, rowNum) -> new Object[]{
                            rs.getObject("created_by", UUID.class),
                            rs.getObject("company_id", UUID.class),
                            rs.getString("status")
                    })
                    .single();

            assertThat(jobRow[0]).isEqualTo(userEmployerAId);
            assertThat(jobRow[1]).isEqualTo(companyAId);
            assertThat(jobRow[2]).isEqualTo("active");

            // Cleanup created job
            jdbcClient.sql("DELETE FROM jobs WHERE id = ?").param(createdJobId).update();
        }

        @Test
        @DisplayName("Employer sends forged createdBy in body -> principal overrides it; DB stores principal")
        void createJob_forgedCreatedBy_overriddenByPrincipal() throws Exception {
            UUID forgedUserId = UUID.randomUUID();
            JobCreateRequest request = JobCreateRequest.builder()
                    .companyId(companyAId)
                    .createdBy(forgedUserId) // Attempt to forge another user
                    .title("Security Analyst")
                    .department("Cybersecurity")
                    .workType("full_time")
                    .salaryMode("negotiable")
                    .build();

            String responseJson = mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.createdBy").value(userEmployerAId.toString()))
                    .andReturn().getResponse().getContentAsString();

            UUID createdJobId = UUID.fromString(objectMapper.readTree(responseJson).get("id").asText());

            UUID dbCreatedBy = jdbcClient.sql("SELECT created_by FROM jobs WHERE id = ?")
                    .param(createdJobId)
                    .query(UUID.class)
                    .single();

            assertThat(dbCreatedBy).isEqualTo(userEmployerAId);
            assertThat(dbCreatedBy).isNotEqualTo(forgedUserId);

            jdbcClient.sql("DELETE FROM jobs WHERE id = ?").param(createdJobId).update();
        }

        @Test
        @DisplayName("Employer creates job for unowned company -> 403 Forbidden; no row inserted")
        void createJob_unownedCompany_rejectedWith403() throws Exception {
            int countBefore = jdbcClient.sql("SELECT COUNT(*) FROM jobs").query(Integer.class).single();

            JobCreateRequest request = JobCreateRequest.builder()
                    .companyId(companyBId) // userEmployerA does NOT belong to companyB
                    .title("Hacker Job")
                    .build();

            mockMvc.perform(post("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());

            int countAfter = jdbcClient.sql("SELECT COUNT(*) FROM jobs").query(Integer.class).single();
            assertThat(countAfter).isEqualTo(countBefore);
        }
    }

    // =========================================================================
    // 3. PUT /v1/employer/jobs/{id} (UPDATE JOB)
    // =========================================================================

    @Nested
    @DisplayName("3. PUT /v1/employer/jobs/{id} (Update Job)")
    class UpdateJobTests {

        @Test
        @DisplayName("Employer updates job of own company -> 200 OK; DB updated")
        void updateJob_ownCompany_succeeds() throws Exception {
            JobUpdateRequest request = JobUpdateRequest.builder()
                    .title("Updated Alpha Engineer")
                    .department("Core Platform")
                    .build();

            mockMvc.perform(put("/v1/employer/jobs/" + jobAId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Alpha Engineer"))
                    .andExpect(jsonPath("$.department").value("Core Platform"));

            String dbTitle = jdbcClient.sql("SELECT title FROM jobs WHERE id = ?").param(jobAId).query(String.class).single();
            assertThat(dbTitle).isEqualTo("Updated Alpha Engineer");
        }

        @Test
        @DisplayName("Employer updates job of other company -> 403 Forbidden; DB unchanged")
        void updateJob_otherCompany_rejectedWith403() throws Exception {
            JobUpdateRequest request = JobUpdateRequest.builder()
                    .title("Malicious Title")
                    .build();

            mockMvc.perform(put("/v1/employer/jobs/" + jobBId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA) // Employer A tries to edit Job B
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());

            String dbTitle = jdbcClient.sql("SELECT title FROM jobs WHERE id = ?").param(jobBId).query(String.class).single();
            assertThat(dbTitle).isEqualTo("Frontend Engineer Beta");
        }

        @Test
        @DisplayName("Employer updates nonexistent job -> 404 Not Found")
        void updateJob_nonexistentJob_returns404() throws Exception {
            UUID nonexistentJobId = UUID.randomUUID();
            JobUpdateRequest request = JobUpdateRequest.builder().title("Nonexistent").build();

            mockMvc.perform(put("/v1/employer/jobs/" + nonexistentJobId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    // =========================================================================
    // 4. PATCH /v1/employer/jobs/{id}/status (UPDATE STATUS)
    // =========================================================================

    @Nested
    @DisplayName("4. PATCH /v1/employer/jobs/{id}/status (Update Status)")
    class UpdateJobStatusTests {

        @Test
        @DisplayName("Employer updates status of own job -> 200 OK; DB updated")
        void updateJobStatus_ownCompany_succeeds() throws Exception {
            JobStatusUpdateRequest request = new JobStatusUpdateRequest("paused");

            mockMvc.perform(patch("/v1/employer/jobs/" + jobAId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("paused"));

            String dbStatus = jdbcClient.sql("SELECT status FROM jobs WHERE id = ?").param(jobAId).query(String.class).single();
            assertThat(dbStatus).isEqualTo("paused");
        }

        @Test
        @DisplayName("Employer updates status of other company's job -> 403 Forbidden; DB unchanged")
        void updateJobStatus_otherCompany_rejectedWith403() throws Exception {
            JobStatusUpdateRequest request = new JobStatusUpdateRequest("closed");

            mockMvc.perform(patch("/v1/employer/jobs/" + jobBId + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());

            String dbStatus = jdbcClient.sql("SELECT status FROM jobs WHERE id = ?").param(jobBId).query(String.class).single();
            assertThat(dbStatus).isEqualTo("active");
        }

        @Test
        @DisplayName("Employer updates status of nonexistent job -> 404 Not Found")
        void updateJobStatus_nonexistentJob_returns404() throws Exception {
            JobStatusUpdateRequest request = new JobStatusUpdateRequest("closed");

            mockMvc.perform(patch("/v1/employer/jobs/" + UUID.randomUUID() + "/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================================
    // 5. DELETE /v1/employer/jobs/{id} (DELETE JOB)
    // =========================================================================

    @Nested
    @DisplayName("5. DELETE /v1/employer/jobs/{id} (Delete Job)")
    class DeleteJobTests {

        @Test
        @DisplayName("Employer deletes own job -> 204 No Content; soft deleted in DB")
        void deleteJob_ownCompany_succeeds() throws Exception {
            mockMvc.perform(delete("/v1/employer/jobs/" + jobAId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA))
                    .andExpect(status().isNoContent());

            Instant deletedAt = jdbcClient.sql("SELECT deleted_at FROM jobs WHERE id = ?").param(jobAId).query(Instant.class).single();
            assertThat(deletedAt).isNotNull();
        }

        @Test
        @DisplayName("Employer deletes other company's job -> 403 Forbidden; deleted_at is null")
        void deleteJob_otherCompany_rejectedWith403() throws Exception {
            mockMvc.perform(delete("/v1/employer/jobs/" + jobBId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA))
                    .andExpect(status().isForbidden());

            Instant deletedAt = jdbcClient.sql("SELECT deleted_at FROM jobs WHERE id = ?").param(jobBId).query(Instant.class).optional().orElse(null);
            assertThat(deletedAt).isNull();
        }

        @Test
        @DisplayName("Employer deletes nonexistent job -> 404 Not Found")
        void deleteJob_nonexistentJob_returns404() throws Exception {
            mockMvc.perform(delete("/v1/employer/jobs/" + UUID.randomUUID())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================================
    // 6. GET /v1/employer/jobs (LIST JOBS & MULTI-COMPANY)
    // =========================================================================

    @Nested
    @DisplayName("6. GET /v1/employer/jobs (List & Multi-Company)")
    class GetEmployerJobsTests {

        @Test
        @DisplayName("GET with companyId owned by caller -> 200 OK with jobs")
        void getEmployerJobs_withOwnedCompanyId_succeeds() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .param("companyId", companyAId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].id").value(jobAId.toString()))
                    .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        @DisplayName("GET with companyId NOT owned by caller -> 403 Forbidden")
        void getEmployerJobs_withUnownedCompanyId_returns403() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerA)
                            .param("companyId", companyBId.toString()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET without companyId for employer in multiple companies -> returns jobs from all their companies")
        void getEmployerJobs_multiCompanyUser_returnsJobsFromBothCompanies() throws Exception {
            // Insert job in Company C
            UUID jobCId = UUID.randomUUID();
            insertJob(jobCId, companyCId, userEmployerMultiId, "Data Scientist Gamma", "data-scientist-" + jobCId, "active");

            try {
                mockMvc.perform(get("/v1/employer/jobs")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerMulti))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalElements").value(2));
            } finally {
                jdbcClient.sql("DELETE FROM jobs WHERE id = ?").param(jobCId).update();
            }
        }

        @Test
        @DisplayName("GET without companyId for employer with no companies -> returns empty page (0 elements)")
        void getEmployerJobs_noCompanyUser_returnsEmptyPage() throws Exception {
            mockMvc.perform(get("/v1/employer/jobs")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerNoCompany))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0))
                    .andExpect(jsonPath("$.content").isEmpty());
        }

        @Test
        @DisplayName("Employer with role 'member' can manage company jobs")
        void companyMemberRole_canManageJobs() throws Exception {
            // userEmployerMulti has role 'member' in Company A
            JobUpdateRequest request = JobUpdateRequest.builder()
                    .title("Member Updated Title")
                    .build();

            mockMvc.perform(put("/v1/employer/jobs/" + jobAId)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenEmployerMulti)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            String dbTitle = jdbcClient.sql("SELECT title FROM jobs WHERE id = ?").param(jobAId).query(String.class).single();
            assertThat(dbTitle).isEqualTo("Member Updated Title");
        }
    }
}
