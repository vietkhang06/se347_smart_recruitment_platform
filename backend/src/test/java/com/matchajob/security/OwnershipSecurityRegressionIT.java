package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.security.seed.DemoAuthDataSeeder;
import com.matchajob.security.seed.DemoSeedProperties;
import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CandidateProfileRepository;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real-DB (no @MockBean on ResourceOwnershipService) cross-tenant IDOR regression tests.
 * Verifies exact actual HTTP status codes (403 vs 404 vs 400) across Employer, Candidate, and Admin flows.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Real-DB Cross-Tenant Ownership & IDOR Security Regression Tests")
class OwnershipSecurityRegressionIT {

    private static final String ADMIN_PASS = "DemoAdmin#2026!Safe";
    private static final String EMPLOYER_PASS = "DemoEmployer#2026!Safe";
    private static final String CANDIDATE_PASS = "DemoCandidate#2026!Safe";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CompanyMemberRepository companyMemberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcClient jdbcClient;

    private User adminUser;
    private User emp1;
    private User emp2;
    private User cand1;
    private User cand2;

    private Company company1;
    private CandidateProfile profile1;
    private CandidateProfile profile2;

    private UUID job1Id;
    private UUID cv1SubmittedId;
    private UUID cv1UnsubmittedId;
    private UUID app1Id;
    private UUID interview1Id;
    private UUID processingJobAppId;

    private String adminBearer;
    private String emp1Bearer;
    private String emp2Bearer;
    private String cand1Bearer;
    private String cand2Bearer;

    @BeforeEach
    void setUp() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        DemoSeedProperties props = new DemoSeedProperties();
        props.setEnabled(true);
        props.setAdminPassword(ADMIN_PASS);
        props.setEmployerPassword(EMPLOYER_PASS);
        props.setCandidatePassword(CANDIDATE_PASS);

        new DemoAuthDataSeeder(
                env, props, userRepository, candidateProfileRepository,
                companyRepository, companyMemberRepository, passwordEncoder, jdbcClient
        ).seedDemoAccounts();

        adminUser = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_ADMIN_EMAIL).orElseThrow();
        emp1 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_EMPLOYER_1_EMAIL).orElseThrow();
        emp2 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_EMPLOYER_2_EMAIL).orElseThrow();
        cand1 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL).orElseThrow();
        cand2 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_2_EMAIL).orElseThrow();

        company1 = companyRepository.findByOwnerId(emp1.getId()).get(0);
        profile1 = candidateProfileRepository.findByUserId(cand1.getId()).orElseThrow();
        profile2 = candidateProfileRepository.findByUserId(cand2.getId()).orElseThrow();

        adminBearer = "Bearer " + jwtTokenProvider.generateToken(adminUser.getId());
        emp1Bearer = "Bearer " + jwtTokenProvider.generateToken(emp1.getId());
        emp2Bearer = "Bearer " + jwtTokenProvider.generateToken(emp2.getId());
        cand1Bearer = "Bearer " + jwtTokenProvider.generateToken(cand1.getId());
        cand2Bearer = "Bearer " + jwtTokenProvider.generateToken(cand2.getId());

        // Seed Job 1 owned by Employer 1 / Company 1
        job1Id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO jobs (id, company_id, created_by, title, slug, work_type, salary_mode, status, applicant_count, view_count, created_at, updated_at)
                VALUES (?, ?, ?, 'Ownership Regression Job', ?, 'full_time', 'negotiable', 'active', 1, 10, now(), now())
                """)
                .params(job1Id, company1.getId(), emp1.getId(), "ownership-reg-job-" + job1Id)
                .update();

        // Seed 2 CVs for Candidate 1: cv1SubmittedId is attached to app1; cv1UnsubmittedId is private/unsubmitted
        cv1SubmittedId = UUID.randomUUID();
        cv1UnsubmittedId = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO cv_versions (id, candidate_id, file_path, file_name, file_size_bytes, mime_type, sha256_hash, status, is_active, created_at, updated_at)
                VALUES (?, ?, 'candidates/submitted.pdf', 'submitted.pdf', 1024, 'application/pdf', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001', 'extracted', false, now() - interval '2 hours', now())
                """)
                .params(cv1SubmittedId, profile1.getId())
                .update();
        jdbcClient.sql("""
                INSERT INTO cv_versions (id, candidate_id, file_path, file_name, file_size_bytes, mime_type, sha256_hash, status, is_active, created_at, updated_at)
                VALUES (?, ?, 'candidates/private_new.pdf', 'private_new.pdf', 2048, 'application/pdf', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60002', 'extracted', true, now(), now())
                """)
                .params(cv1UnsubmittedId, profile1.getId())
                .update();

        // Seed Application 1 (Candidate 1 -> Job 1) + immutable CV snapshot referencing cv1SubmittedId
        app1Id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO applications (id, candidate_id, job_id, cover_letter, stage, applied_at, updated_at)
                VALUES (?, ?, ?, 'Cover letter for Job 1', 'new', now(), now())
                """)
                .params(app1Id, profile1.getId(), job1Id)
                .update();
        jdbcClient.sql("""
                INSERT INTO application_cv_snapshots (id, application_id, cv_version_id, created_at)
                VALUES (?, ?, ?, now())
                """)
                .params(UUID.randomUUID(), app1Id, cv1SubmittedId)
                .update();

        // Seed Interview 1 for Application 1
        interview1Id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO interviews (id, application_id, interview_type, interview_mode, scheduled_at, duration_min, status, created_at, updated_at)
                VALUES (?, ?, 'Technical', 'online', ?, 60, 'scheduled', now(), now())
                """)
                .params(interview1Id, app1Id, java.sql.Timestamp.from(Instant.now().plus(2, ChronoUnit.DAYS)))
                .update();

        // Seed ProcessingJob for Application 1
        processingJobAppId = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO processing_jobs (id, job_type, entity_type, entity_id, status, attempt_count, max_attempts, idempotency_key, created_at, updated_at)
                VALUES (?, 'APPLICATION_MATCHING', 'application', ?, 'COMPLETED', 1, 3, ?, now(), now())
                """)
                .params(processingJobAppId, app1Id, "idem-" + processingJobAppId)
                .update();
    }

    @Test
    @DisplayName("1. Cross-Employer IDOR: Employer 2 is blocked (403) from Employer 1 company, job, applications, ranking, stage, and interview")
    void crossEmployer_idorBlockedWithActualStatusCodes() throws Exception {
        // Company PUT/PATCH -> 403 (both unowned and nonexistent return 403 by design)
        mockMvc.perform(put("/v1/companies/{id}", company1.getId())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hijacked\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/v1/companies/{id}", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nonexistent\"}"))
                .andExpect(status().isForbidden());

        // Job PUT/DELETE -> 403 on unowned; 404 on nonexistent
        mockMvc.perform(delete("/v1/employer/jobs/{id}", job1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/v1/employer/jobs/{id}", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isNotFound());

        // Job applications & ranking -> 403 on unowned job
        mockMvc.perform(get("/v1/jobs/{jobId}/applications", job1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/jobs/{jobId}/applications/ranking", job1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isForbidden());

        // Application stage update -> 403 on unowned; 404 on nonexistent
        mockMvc.perform(patch("/v1/applications/{id}/stage", app1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"toStage\":\"screening\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/v1/applications/{id}/stage", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"toStage\":\"screening\"}"))
                .andExpect(status().isNotFound());

        // Interview GET/PUT/PATCH/DELETE -> 403 on unowned; nonexistent GET -> 404, PUT -> 400 (actual controller behavior)
        mockMvc.perform(get("/v1/interviews/{id}", interview1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/v1/interviews/{id}/status", interview1Id)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"cancelled\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/interviews/{id}", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/v1/interviews/{id}", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Missing\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("2. Cross-Candidate IDOR: Candidate 2 is blocked (403) from Candidate 1 CVs, application, match, and processing job")
    void crossCandidate_idorBlockedWithActualStatusCodes() throws Exception {
        // List CVs / active CV / activate CV of Candidate 1 -> 403
        mockMvc.perform(get("/v1/candidates/{cid}/cv", profile1.getId())
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/candidates/{cid}/cv/active", profile1.getId())
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/v1/candidates/{cid}/cv/{vid}/active", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());

        // Specific CV metadata of Candidate 1 (even random nonexistent cvId) -> 403 (prevents existence enumeration)
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());

        // Candidate 1's own nonexistent CV -> 404
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, cand1Bearer))
                .andExpect(status().isNotFound());

        // Application detail, history, match, processing job -> 403 for Candidate 2; 200 for Candidate 1
        mockMvc.perform(get("/v1/applications/{id}", app1Id)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/applications/{id}/history", app1Id)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/applications/{id}/match", app1Id)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/v1/processing-jobs/{id}", processingJobAppId)
                        .header(HttpHeaders.AUTHORIZATION, cand2Bearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/processing-jobs/{id}", processingJobAppId)
                        .header(HttpHeaders.AUTHORIZATION, cand1Bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        mockMvc.perform(get("/v1/processing-jobs/{id}", UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, cand1Bearer))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("3. Snapshot-scoped Employer CV access & Audited Admin CV read")
    void cvSnapshotAccess_andAdminAuditTrail() throws Exception {
        // Employer 1 CAN read the exact CV version submitted in application_cv_snapshots (200)
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, emp1Bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(cv1SubmittedId.toString()))
                .andExpect(jsonPath("$.file_name").value("submitted.pdf"));

        // Employer 1 CANNOT read Candidate 1's newer unsubmitted CV version (403)
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), cv1UnsubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, emp1Bearer))
                .andExpect(status().isForbidden());

        // Employer 2 CANNOT read either CV version of Candidate 1 (403)
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, emp2Bearer))
                .andExpect(status().isForbidden());

        // Admin CAN read specific CV metadata (200) and an audit_logs entry is recorded
        mockMvc.perform(get("/v1/candidates/{cid}/cv/{vid}", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(cv1SubmittedId.toString()));

        Integer auditCount = jdbcClient.sql("""
                        SELECT COUNT(*) FROM audit_logs
                        WHERE actor_id = ? AND target_id = ? AND action = 'VIEW_CV_METADATA'
                        """)
                .params(adminUser.getId(), cv1SubmittedId.toString())
                .query(Integer.class)
                .single();
        assertThat(auditCount).isEqualTo(1);

        // Admin CANNOT mutate active CV selection (403)
        mockMvc.perform(put("/v1/candidates/{cid}/cv/{vid}/active", profile1.getId(), cv1SubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden());
    }
}
