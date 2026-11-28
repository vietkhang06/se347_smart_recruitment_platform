package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.security.seed.DemoAuthDataSeeder;
import com.matchajob.security.seed.DemoSeedProperties;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("RBAC Wrong-Role Matrix & Privilege Escalation Regression Tests")
class RbacAuthorizationRegressionIT {

    private static final String ADMIN_PASS = "DemoAdmin#2026!Safe";
    private static final String EMPLOYER_PASS = "DemoEmployer#2026!Safe";
    private static final String CANDIDATE_PASS = "DemoCandidate#2026!Safe";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    private User employerUser;
    private User candidateUser;
    private String adminBearer;
    private String employerBearer;
    private String candidateBearer;

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
        employerUser = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_EMPLOYER_1_EMAIL).orElseThrow();
        candidateUser = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL).orElseThrow();

        adminBearer = "Bearer " + jwtTokenProvider.generateToken(adminUser.getId());
        employerBearer = "Bearer " + jwtTokenProvider.generateToken(employerUser.getId());
        candidateBearer = "Bearer " + jwtTokenProvider.generateToken(candidateUser.getId());
    }

    @Test
    @DisplayName("1. CANDIDATE calling Employer and Admin endpoints is rejected with 403 FORBIDDEN")
    void candidate_callingEmployerAndAdminRoutes_returns403() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/v1/companies").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(get("/v1/companies/me").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/employer/jobs").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/interviews").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/v1/applications/{id}/stage", randomId)
                        .header(HttpHeaders.AUTHORIZATION, candidateBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"toStage\":\"screening\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/admin/users").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/admin/stats/jobs").header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories")
                        .header(HttpHeaders.AUTHORIZATION, candidateBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Unauthorized Cat\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/recruitment/taxonomies/categories/{id}", randomId)
                        .header(HttpHeaders.AUTHORIZATION, candidateBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("2. EMPLOYER calling Candidate and Admin endpoints is rejected with 403 FORBIDDEN")
    void employer_callingCandidateAndAdminRoutes_returns403() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/v1/candidates/profile").header(HttpHeaders.AUTHORIZATION, employerBearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header(HttpHeaders.AUTHORIZATION, employerBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\":\"Spoofed\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/v1/applications")
                        .header(HttpHeaders.AUTHORIZATION, employerBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + randomId + "\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/applications").header(HttpHeaders.AUTHORIZATION, employerBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/candidates/{id}/cv", randomId).header(HttpHeaders.AUTHORIZATION, employerBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/admin/users").header(HttpHeaders.AUTHORIZATION, employerBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/admin/stats/jobs").header(HttpHeaders.AUTHORIZATION, employerBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("3. ADMIN calling Candidate-only and Employer-only business endpoints is rejected with 403 FORBIDDEN")
    void admin_callingTenantOnlyRoutes_returns403() throws Exception {
        mockMvc.perform(get("/v1/candidates/profile").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(get("/v1/applications").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/companies/me").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/employer/jobs").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/interviews").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isForbidden());

        // Admin CAN access admin endpoints
        mockMvc.perform(get("/v1/admin/users").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isOk());
        mockMvc.perform(get("/v1/admin/stats/jobs").header(HttpHeaders.AUTHORIZATION, adminBearer))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("4. Privilege escalation attempts via register, PATCH /v1/users/me, and POST /v1/companies are blocked")
    void privilegeEscalation_attemptsAreRejectedOrIgnored() throws Exception {
        // 4a. Public self-registration as ADMIN rejected with 400 INVALID_REGISTRATION_ROLE
        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"escalate@example.com\",\"password\":\"StrongPass#2026!\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REGISTRATION_ROLE"));

        // 4b. PATCH /v1/users/me with privileged fields (role, status, isVerified, email) ignores them completely
        mockMvc.perform(patch("/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, candidateBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Safe Updated Candidate",
                                  "role": "admin",
                                  "status": "suspended",
                                  "isVerified": false,
                                  "email": "hijacked@matchajob.vn"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.full_name").value("Safe Updated Candidate"))
                .andExpect(jsonPath("$.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.email").value(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL));

        User reloaded = userRepository.findById(candidateUser.getId()).orElseThrow();
        assertThat(reloaded.getRole()).isEqualTo("candidate");
        assertThat(reloaded.getStatus()).isEqualTo("active");
        assertThat(reloaded.getIsVerified()).isTrue();
        assertThat(reloaded.getEmail()).isEqualTo(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL);

        // 4c. POST /v1/companies ignores forged ownerId and isVerified=true
        String uniqueTaxCode = "0399" + String.valueOf(Math.abs(UUID.randomUUID().hashCode())).substring(0, 6);
        String createdJson = mockMvc.perform(post("/v1/companies")
                        .header(HttpHeaders.AUTHORIZATION, employerBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Escalation Check Corp",
                                  "tax_code": "%s",
                                  "owner_id": "%s",
                                  "is_verified": true
                                }
                                """.formatted(uniqueTaxCode, adminUser.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID newCompanyId = UUID.fromString(objectMapper.readTree(createdJson).get("id").asText());
        Company savedCompany = companyRepository.findById(newCompanyId).orElseThrow();
        assertThat(savedCompany.getOwnerId()).isEqualTo(employerUser.getId());
        assertThat(savedCompany.getOwnerId()).isNotEqualTo(adminUser.getId());
        assertThat(savedCompany.getIsVerified()).isFalse();
    }
}
