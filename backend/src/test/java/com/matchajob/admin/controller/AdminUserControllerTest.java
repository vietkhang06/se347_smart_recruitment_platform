package com.matchajob.admin.controller;

import com.matchajob.admin.dto.AdminUserListResponse;
import com.matchajob.admin.dto.AdminUserSummaryResponse;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.admin.exception.AdminOperationNotAllowedException;
import com.matchajob.admin.service.AdminUserService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = AdminUserControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class AdminUserControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public AdminUserController adminUserController(AdminUserService adminUserService) {
            return new AdminUserController(adminUserService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AdminUserService adminUserService;

    @MockBean
    private UserRepository userRepository;

    private UUID adminId;
    private UUID candidateId;

    private String adminToken;
    private String candidateToken;
    private String employerToken;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();

        stubActiveUser(adminId, "admin@matchajob.com", "admin");
        stubActiveUser(candidateId, "candidate@matchajob.com", "candidate");
        stubActiveUser(employerId, "employer@matchajob.com", "employer");

        adminToken = jwtTokenProvider.generateToken(adminId, "admin@matchajob.com", "ADMIN");
        candidateToken = jwtTokenProvider.generateToken(candidateId, "candidate@matchajob.com", "CANDIDATE");
        employerToken = jwtTokenProvider.generateToken(employerId, "employer@matchajob.com", "EMPLOYER");
    }

    private void stubActiveUser(UUID id, String email, String role) {
        User user = User.builder()
                .id(id)
                .email(email)
                .fullName("Test " + role)
                .role(role)
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("1. Anonymous GET /v1/admin/users is rejected with 401")
    void listUsers_anonymous_401() throws Exception {
        mockMvc.perform(get("/v1/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("2. Candidate GET /v1/admin/users is rejected with 403")
    void listUsers_candidate_403() throws Exception {
        mockMvc.perform(get("/v1/admin/users").header("Authorization", "Bearer " + candidateToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("3. Employer GET /v1/admin/users is rejected with 403")
    void listUsers_employer_403() throws Exception {
        mockMvc.perform(get("/v1/admin/users").header("Authorization", "Bearer " + employerToken))
                .andExpect(status().isForbidden());

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("4. Admin GET /v1/admin/users returns 200 with a paged payload")
    void listUsers_admin_200() throws Exception {
        AdminUserSummaryResponse row = AdminUserSummaryResponse.builder()
                .id(candidateId)
                .email("candidate@matchajob.com")
                .fullName("Test candidate")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build();
        AdminUserListResponse response = AdminUserListResponse.builder()
                .content(List.of(row))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();

        when(adminUserService.listUsers(0, 20, null, null, null)).thenReturn(response);

        mockMvc.perform(get("/v1/admin/users").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("candidate@matchajob.com"))
                .andExpect(jsonPath("$.total_elements").value(1));
    }

    @Test
    @DisplayName("5. Candidate PATCH /v1/admin/users/{id}/status is rejected with 403")
    void updateStatus_candidate_403() throws Exception {
        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidateId)
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("6. Anonymous PATCH /v1/admin/users/{id}/status is rejected with 401")
    void updateStatus_anonymous_401() throws Exception {
        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("7. Admin PATCH suspend returns 200")
    void updateStatus_adminSuspend_200() throws Exception {
        AdminUserSummaryResponse response = AdminUserSummaryResponse.builder()
                .id(candidateId)
                .email("candidate@matchajob.com")
                .role("CANDIDATE")
                .status("suspended")
                .isVerified(true)
                .build();

        when(adminUserService.updateStatus(eq(adminId), eq(candidateId), any(UpdateUserStatusRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidateId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\",\"reason\":\"spam\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));
    }

    @Test
    @DisplayName("8. Admin PUT status (frontend compatibility) returns 200")
    void replaceStatus_admin_200() throws Exception {
        AdminUserSummaryResponse response = AdminUserSummaryResponse.builder()
                .id(candidateId)
                .status("active")
                .build();

        when(adminUserService.updateStatus(eq(adminId), eq(candidateId), any(UpdateUserStatusRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/v1/admin/users/{id}/status", candidateId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("9. An invalid status value returns 400 with VALIDATION_ERROR")
    void updateStatus_invalidStatus_400() throws Exception {
        mockMvc.perform(patch("/v1/admin/users/{id}/status", candidateId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(adminUserService);
    }

    @Test
    @DisplayName("10. Self-suspension is surfaced as 400 SELF_SUSPEND_NOT_ALLOWED")
    void updateStatus_selfSuspend_400() throws Exception {
        when(adminUserService.updateStatus(eq(adminId), eq(adminId), any(UpdateUserStatusRequest.class)))
                .thenThrow(new AdminOperationNotAllowedException(
                        "SELF_SUSPEND_NOT_ALLOWED", "You cannot suspend your own admin account"));

        mockMvc.perform(patch("/v1/admin/users/{id}/status", adminId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"suspended\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SELF_SUSPEND_NOT_ALLOWED"));
    }
}
