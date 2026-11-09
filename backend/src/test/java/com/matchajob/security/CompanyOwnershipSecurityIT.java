package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.CompanyMember;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cross-tenant ownership tests for company management, exercised through the real
 * filter chain and the real database.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Company ownership security")
class CompanyOwnershipSecurityIT {

    private static final String BCRYPT_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMye.I5tL2a44p1h7rYqZ2j8qW1aF1v1W1q";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CompanyMemberRepository companyMemberRepository;

    private User employerA;
    private User employerB;
    private User candidate;
    private Company companyA;
    private Company companyB;

    @BeforeEach
    void setUp() {
        employerA = seedUser("employer");
        employerB = seedUser("employer");
        candidate = seedUser("candidate");

        companyA = seedCompany(employerA, "Company A");
        companyB = seedCompany(employerB, "Company B");
    }

    private User seedUser(String role) {
        User user = userRepository.save(User.builder()
                .email(role + "." + UUID.randomUUID() + "@example.com")
                .fullName("Test " + role)
                .passwordHash(BCRYPT_HASH)
                .role(role)
                .status("active")
                .isVerified(true)
                .build());
        userRepository.flush();
        return user;
    }

    private Company seedCompany(User owner, String name) {
        Company company = companyRepository.save(Company.builder()
                .ownerId(owner.getId())
                .name(name)
                .industry("Information Technology")
                .isVerified(false)
                .build());
        companyRepository.flush();

        companyMemberRepository.save(CompanyMember.builder()
                .companyId(company.getId())
                .userId(owner.getId())
                .role("owner")
                .build());
        // ResourceOwnershipService resolves ownership with raw SQL, so the membership
        // must be visible in the database, not merely pending in the persistence context.
        companyMemberRepository.flush();

        return company;
    }

    private String bearer(User user) {
        String role = user.getRole().toUpperCase(Locale.ROOT);
        return "Bearer " + jwtTokenProvider.generateToken(user.getId(), user.getEmail(), role);
    }

    @Test
    @DisplayName("1. Anonymous GET /v1/companies is rejected with 401")
    void listCompanies_anonymous_401() throws Exception {
        mockMvc.perform(get("/v1/companies"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("2. Candidate GET /v1/companies is rejected with 403")
    void listCompanies_candidate_403() throws Exception {
        mockMvc.perform(get("/v1/companies").header("Authorization", bearer(candidate)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("3. Employer GET /v1/companies only sees their own companies")
    void listCompanies_employer_scopedToOwnership() throws Exception {
        mockMvc.perform(get("/v1/companies").header("Authorization", bearer(employerA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(companyA.getId().toString()))
                .andExpect(jsonPath("$[0].membership_role").value("owner"));
    }

    @Test
    @DisplayName("4. Employer A cannot update Employer B's company (403)")
    void updateCompany_crossTenant_403() throws Exception {
        mockMvc.perform(put("/v1/companies/{id}", companyB.getId())
                        .header("Authorization", bearer(employerA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hijacked Company\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("5. Employer A cannot patch Employer B's company (403)")
    void patchCompany_crossTenant_403() throws Exception {
        mockMvc.perform(patch("/v1/companies/{id}", companyB.getId())
                        .header("Authorization", bearer(employerA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hijacked Company\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. An employer can update their own company (200)")
    void updateCompany_owner_200() throws Exception {
        mockMvc.perform(put("/v1/companies/{id}", companyA.getId())
                        .header("Authorization", bearer(employerA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Company A Renamed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Company A Renamed"));
    }
}
