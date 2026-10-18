package com.matchajob.application.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.application.dto.*;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicationController Web Layer Tests")
class ApplicationControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ApplicationService applicationService;

    @Mock
    private ResourceOwnershipService resourceOwnershipService;

    @InjectMocks
    private ApplicationController applicationController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final UUID userId = UUID.randomUUID();
    private final UUID candidateId = UUID.randomUUID();
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(applicationController).build();
        authentication = new UsernamePasswordAuthenticationToken(userId, "n/a", List.of());
    }

    // =========================================================================
    // POST /v1/applications
    // =========================================================================

    @Test
    @DisplayName("POST /v1/applications returns 201 Created on valid submission")
    void submitApplication_success_returns201() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();
        UUID createdAppId = UUID.randomUUID();

        when(resourceOwnershipService.getRequiredCandidateProfileId(userId)).thenReturn(candidateId);

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .coverLetter("Excited to apply!")
                .build();

        ApplicationResponse response = ApplicationResponse.builder()
                .applicationId(createdAppId)
                .candidateId(candidateId)
                .jobId(jobId)
                .stage("new")
                .appliedAt(Instant.now())
                .message("Application submitted successfully. AI matching has been queued.")
                .build();

        when(applicationService.applyForJob(eq(candidateId), eq(userId), any(ApplicationApplyRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/v1/applications")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationId").value(createdAppId.toString()))
                .andExpect(jsonPath("$.candidateId").value(candidateId.toString()))
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.stage").value("new"))
                .andExpect(jsonPath("$.message").value("Application submitted successfully. AI matching has been queued."));
    }

    @Test
    @DisplayName("POST /v1/applications returns 409 Conflict when duplicate application is submitted")
    void submitApplication_duplicate_returns409() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        when(resourceOwnershipService.getRequiredCandidateProfileId(userId)).thenReturn(candidateId);
        when(applicationService.applyForJob(eq(candidateId), eq(userId), any(ApplicationApplyRequest.class)))
                .thenThrow(new ApplicationService.DuplicateApplicationException("You have already applied for this job."));

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .coverLetter("Duplicate")
                .build();

        mockMvc.perform(post("/v1/applications")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Duplicate Application"))
                .andExpect(jsonPath("$.detail").value("You have already applied for this job."));
    }

    @Test
    @DisplayName("POST /v1/applications returns 400 Bad Request when job is closed")
    void submitApplication_closedJob_returns400() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();

        when(resourceOwnershipService.getRequiredCandidateProfileId(userId)).thenReturn(candidateId);
        when(applicationService.applyForJob(eq(candidateId), eq(userId), any(ApplicationApplyRequest.class)))
                .thenThrow(new IllegalStateException("Job is not accepting applications (status: closed)."));

        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .coverLetter("Closed job attempt")
                .build();

        mockMvc.perform(post("/v1/applications")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid Operation"))
                .andExpect(jsonPath("$.detail").value("Job is not accepting applications (status: closed)."));
    }

    @Test
    @DisplayName("POST /v1/applications returns 400 Bad Request on validation failure (missing jobId)")
    void submitApplication_missingJobId_returns400() throws Exception {
        ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                .cvVersionId(UUID.randomUUID())
                .coverLetter("Missing jobId")
                .build();

        mockMvc.perform(post("/v1/applications")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // GET /v1/applications (Candidate list)
    // =========================================================================

    @Test
    @DisplayName("GET /v1/applications returns 200 OK with paginated list")
    void getMyApplications_returns200() throws Exception {
        when(resourceOwnershipService.getRequiredCandidateProfileId(userId)).thenReturn(candidateId);

        ApplicationListResponse listResponse = ApplicationListResponse.builder()
                .items(List.of(
                        ApplicationDetailResponse.builder()
                                .applicationId(UUID.randomUUID())
                                .candidateId(candidateId)
                                .jobId(UUID.randomUUID())
                                .jobTitle("Backend Engineer")
                                .companyName("Tech Corp")
                                .stage("new")
                                .build()
                ))
                .totalItems(1)
                .page(0)
                .size(10)
                .totalPages(1)
                .build();

        when(applicationService.getMyApplications(eq(candidateId), eq(userId), eq(0), eq(10), eq("new")))
                .thenReturn(listResponse);

        mockMvc.perform(get("/v1/applications")
                        .principal(authentication)
                        .param("page", "0")
                        .param("size", "10")
                        .param("stage", "new"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.items[0].jobTitle").value("Backend Engineer"))
                .andExpect(jsonPath("$.items[0].companyName").value("Tech Corp"));
    }

    // =========================================================================
    // GET /v1/applications/{applicationId} (Detail)
    // =========================================================================

    @Test
    @DisplayName("GET /v1/applications/{id} returns 200 OK with application detail")
    void getApplicationDetail_returns200() throws Exception {
        UUID appId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        ApplicationDetailResponse detail = ApplicationDetailResponse.builder()
                .applicationId(appId)
                .candidateId(candidateId)
                .candidateName("Nguyen Van A")
                .jobId(jobId)
                .jobTitle("Fullstack Developer")
                .companyName("Matcha Inc")
                .stage("interview")
                .coverLetter("My cover letter")
                .cvSnapshotUrl("https://storage/snapshot.pdf")
                .build();

        when(applicationService.getApplicationDetail(eq(appId), eq(userId))).thenReturn(detail);

        mockMvc.perform(get("/v1/applications/{applicationId}", appId)
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationId").value(appId.toString()))
                .andExpect(jsonPath("$.candidateName").value("Nguyen Van A"))
                .andExpect(jsonPath("$.jobTitle").value("Fullstack Developer"))
                .andExpect(jsonPath("$.stage").value("interview"));
    }

    @Test
    @DisplayName("GET /v1/applications/{id} returns 404 when application does not exist")
    void getApplicationDetail_notFound_returns404() throws Exception {
        UUID appId = UUID.randomUUID();

        when(applicationService.getApplicationDetail(eq(appId), eq(userId)))
                .thenThrow(new IllegalArgumentException("Application not found: " + appId));

        mockMvc.perform(get("/v1/applications/{applicationId}", appId)
                        .principal(authentication))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // GET /v1/jobs/{jobId}/applications (Employer list)
    // =========================================================================

    @Test
    @DisplayName("GET /v1/jobs/{jobId}/applications returns 200 OK with applications list")
    void getJobApplications_returns200() throws Exception {
        UUID jobId = UUID.randomUUID();

        ApplicationListResponse listResponse = ApplicationListResponse.builder()
                .items(List.of(
                        ApplicationDetailResponse.builder()
                                .applicationId(UUID.randomUUID())
                                .candidateId(UUID.randomUUID())
                                .candidateName("Candidate 1")
                                .jobId(jobId)
                                .jobTitle("Senior Architect")
                                .companyName("Matcha Inc")
                                .stage("screening")
                                .build()
                ))
                .totalItems(1)
                .page(0)
                .size(10)
                .totalPages(1)
                .build();

        when(applicationService.getJobApplications(eq(jobId), eq(userId), eq(0), eq(10), eq(null)))
                .thenReturn(listResponse);

        mockMvc.perform(get("/v1/jobs/{jobId}/applications", jobId)
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].candidateName").value("Candidate 1"))
                .andExpect(jsonPath("$.items[0].stage").value("screening"));
    }

    // =========================================================================
    // PATCH /v1/applications/{applicationId}/stage
    // =========================================================================

    @Test
    @DisplayName("PATCH /v1/applications/{id}/stage returns 200 OK on valid transition")
    void updateApplicationStage_returns200() throws Exception {
        UUID appId = UUID.randomUUID();

        ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                .toStage("screening")
                .reason("Resume looks promising")
                .build();

        StageUpdateResponse response = StageUpdateResponse.builder()
                .applicationId(appId)
                .previousStage("new")
                .currentStage("screening")
                .updatedAt(Instant.now())
                .build();

        when(applicationService.updateStage(eq(appId), eq(userId), any(ApplicationStageUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/v1/applications/{applicationId}/stage", appId)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationId").value(appId.toString()))
                .andExpect(jsonPath("$.previousStage").value("new"))
                .andExpect(jsonPath("$.currentStage").value("screening"));
    }

    @Test
    @DisplayName("PATCH /v1/applications/{id}/stage returns 400 Bad Request on invalid transition")
    void updateApplicationStage_invalidTransition_returns400() throws Exception {
        UUID appId = UUID.randomUUID();

        ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                .toStage("offer")
                .build();

        when(applicationService.updateStage(eq(appId), eq(userId), any(ApplicationStageUpdateRequest.class)))
                .thenThrow(new IllegalStateException("Invalid stage transition: new -> offer."));

        mockMvc.perform(patch("/v1/applications/{applicationId}/stage", appId)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // GET /v1/applications/{applicationId}/history
    // =========================================================================

    @Test
    @DisplayName("GET /v1/applications/{id}/history returns 200 OK with history records")
    void getApplicationHistory_returns200() throws Exception {
        UUID appId = UUID.randomUUID();

        List<ApplicationHistoryResponse> historyList = List.of(
                ApplicationHistoryResponse.builder()
                        .id(UUID.randomUUID())
                        .fromStage(null)
                        .toStage("new")
                        .changedBy(userId)
                        .reason("Application submitted")
                        .createdAt(Instant.now())
                        .build()
        );

        when(applicationService.getApplicationHistory(eq(appId), eq(userId))).thenReturn(historyList);

        mockMvc.perform(get("/v1/applications/{applicationId}/history", appId)
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].toStage").value("new"))
                .andExpect(jsonPath("$[0].reason").value("Application submitted"));
    }
}
