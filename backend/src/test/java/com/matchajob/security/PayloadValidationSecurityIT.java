package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.api.recruitment.dto.JobCreateRequest;
import com.matchajob.api.recruitment.dto.JobStatusUpdateRequest;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Payload Validation and Negative API Security Tests")
class PayloadValidationSecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JobService jobService;

    @MockBean
    private UserRepository userRepository;

    private String createEmployerToken() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("employer@test.com")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return "Bearer " + jwtTokenProvider.generateToken(userId);
    }

    private String createCandidateToken() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("candidate@test.com")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return "Bearer " + jwtTokenProvider.generateToken(userId);
    }

    @Test
    @DisplayName("1. Malformed JSON body returns 400 ProblemDetail with VALIDATION_ERROR code")
    void malformedJson_returns400ProblemDetail() throws Exception {
        String token = createEmployerToken();
        String brokenJson = "{\"title\": \"Unclosed Json String, ";

        mockMvc.perform(post("/v1/employer/jobs")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(brokenJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Malformed Request"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("2. Empty body on POST /v1/employer/jobs returns 400 ProblemDetail")
    void emptyBody_returns400ProblemDetail() throws Exception {
        String token = createEmployerToken();

        mockMvc.perform(post("/v1/employer/jobs")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Malformed Request"));
    }

    @Test
    @DisplayName("3. JobCreateRequest with missing companyId and blank title returns 400 with field errors")
    void jobCreate_missingRequiredFields_returns400WithErrors() throws Exception {
        String token = createEmployerToken();
        JobCreateRequest request = JobCreateRequest.builder()
                .title("   ")
                .companyId(null)
                .build();

        mockMvc.perform(post("/v1/employer/jobs")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.companyId").exists());
    }

    @Test
    @DisplayName("4. JobStatusUpdateRequest with invalid status pattern returns 400 with field error")
    void jobStatusUpdate_invalidStatus_returns400() throws Exception {
        String token = createEmployerToken();
        JobStatusUpdateRequest request = JobStatusUpdateRequest.builder()
                .status("MALICIOUS_STATUS")
                .build();

        mockMvc.perform(patch("/v1/employer/jobs/" + UUID.randomUUID() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.status").value("Status must be draft, active, paused, or closed"));
    }

    @Test
    @DisplayName("5. Candidate profile update with negative experience years returns 400")
    void updateCandidateProfile_negativeExperience_returns400() throws Exception {
        String token = createCandidateToken();
        String payload = "{\"experienceYears\": -5}";

        mockMvc.perform(patch("/v1/candidates/profile")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
