package com.matchajob.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.exception.DuplicateTaxCodeException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import com.matchajob.user.service.CompanyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = CompanyControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class CompanyControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public CompanyController companyController(CompanyService companyService) {
            return new CompanyController(companyService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CompanyService companyService;

    @MockBean
    private UserRepository userRepository;

    private UUID employerId;
    private UUID candidateId;
    private UUID adminId;

    private String employerToken;
    private String candidateToken;
    private String adminToken;

    private User employerUser;
    private User candidateUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        employerId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        adminId = UUID.randomUUID();

        employerUser = User.builder()
                .id(employerId)
                .email("employer@matchajob.com")
                .fullName("Employer Manager")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        candidateUser = User.builder()
                .id(candidateId)
                .email("candidate@matchajob.com")
                .fullName("Candidate JobSeeker")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        adminUser = User.builder()
                .id(adminId)
                .email("admin@matchajob.com")
                .fullName("System Admin")
                .role("admin")
                .status("active")
                .isVerified(true)
                .build();

        employerToken = jwtTokenProvider.generateToken(employerId, "employer@matchajob.com", "EMPLOYER");
        candidateToken = jwtTokenProvider.generateToken(candidateId, "candidate@matchajob.com", "CANDIDATE");
        adminToken = jwtTokenProvider.generateToken(adminId, "admin@matchajob.com", "ADMIN");

        when(userRepository.findById(employerId)).thenReturn(Optional.of(employerUser));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidateUser));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
    }

    @Test
    @DisplayName("1. Anonymous request to POST /v1/companies without token is rejected with 401")
    void createCompany_anonymous_rejectedWith401() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Acme Corp")
                .build();

        mockMvc.perform(post("/v1/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"));

        verifyNoInteractions(companyService);
    }

    @Test
    @DisplayName("2. CANDIDATE role calling POST /v1/companies is rejected with 403 Forbidden")
    void createCompany_candidateRole_rejectedWith403() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Candidate Enterprise")
                .build();

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(companyService);
    }

    @Test
    @DisplayName("3. ADMIN role calling POST /v1/companies is rejected with 403 Forbidden")
    void createCompany_adminRole_rejectedWith403() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Admin Enterprise")
                .build();

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(companyService);
    }

    @Test
    @DisplayName("4. EMPLOYER role successfully creates company and receives 201 Created")
    void createCompany_employerRole_returns201() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Matcha Solutions Corp")
                .shortName("MatchaCorp")
                .taxCode("0312345678")
                .size("50-150")
                .industry("IT")
                .build();

        UUID companyId = UUID.randomUUID();
        CompanyResponse mockResponse = CompanyResponse.builder()
                .id(companyId)
                .ownerId(employerId)
                .name("Matcha Solutions Corp")
                .shortName("MatchaCorp")
                .taxCode("0312345678")
                .size("50-150")
                .industry("IT")
                .isVerified(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(companyService.createCompany(eq(employerId), any(CreateCompanyRequest.class)))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + employerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(companyId.toString()))
                .andExpect(jsonPath("$.owner_id").value(employerId.toString()))
                .andExpect(jsonPath("$.name").value("Matcha Solutions Corp"))
                .andExpect(jsonPath("$.tax_code").value("0312345678"))
                .andExpect(jsonPath("$.is_verified").value(false));

        verify(companyService).createCompany(eq(employerId), any(CreateCompanyRequest.class));
    }

    @Test
    @DisplayName("5. Missing required name in request body returns 400 Bad Request")
    void createCompany_missingName_returns400() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("")
                .build();

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + employerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.name").exists());

        verifyNoInteractions(companyService);
    }

    @Test
    @DisplayName("6. Invalid size value outside allowed CHECK set returns 400 Bad Request")
    void createCompany_invalidSize_returns400() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Valid Company")
                .size("unknown-size")
                .build();

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + employerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.size").exists());

        verifyNoInteractions(companyService);
    }

    @Test
    @DisplayName("7. Duplicate tax code returns 409 Conflict with DUPLICATE_TAX_CODE error code")
    void createCompany_duplicateTaxCode_returns409() throws Exception {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name("Matcha Solutions Corp")
                .taxCode("0312345678")
                .build();

        when(companyService.createCompany(eq(employerId), any(CreateCompanyRequest.class)))
                .thenThrow(new DuplicateTaxCodeException("Company with tax code 0312345678 already exists"));

        mockMvc.perform(post("/v1/companies")
                        .header("Authorization", "Bearer " + employerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("DUPLICATE_TAX_CODE"))
                .andExpect(jsonPath("$.title").value("Conflict"));
    }
}
