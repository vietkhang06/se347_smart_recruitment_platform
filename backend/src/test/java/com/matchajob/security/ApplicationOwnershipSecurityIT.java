package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.application.dto.*;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 4A: Comprehensive MockMvc Integration Tests with real Spring Security Filter Chain
 * and real controllers (ApplicationController, CvController, MatchController, ProcessingJobController).
 *
 * Verifies:
 * - Identity derivation from JWT principal (ignoring client-provided X-Candidate-Id and X-User-Id headers)
 * - Route-level role enforcement
 * - Service-level ownership enforcement
 * - 401 Unauthorized for missing JWT, nonexistent user, or null/invalid role
 * - 403 Forbidden for role mismatch and unowned resources
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 4A: Application, CV, Match, and ProcessingJob Ownership & Security Tests")
class ApplicationOwnershipSecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private ApplicationService applicationService;

    @MockBean
    private ResourceOwnershipService resourceOwnershipService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CvStorageService cvStorageService;

    @MockBean
    private CvVersionRepository cvVersionRepository;

    @MockBean
    private ProcessingJobService processingJobService;

    @MockBean
    private CvProcessingOrchestrator cvProcessingOrchestrator;

    @MockBean
    private MatchingService matchingService;

    // =========================================================================
    // Helper methods
    // =========================================================================

    private User createActiveUser(UUID userId, String email, String role) {
        User user = User.builder()
                .id(userId)
                .email(email)
                .fullName("Test " + role)
                .role(role)
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return user;
    }

    private String generateBearerToken(UUID userId, String email, String role) {
        return "Bearer " + jwtTokenProvider.generateToken(userId, email, role);
    }

    // =========================================================================
    // 1. APPLICATION SUBMISSION (POST /v1/applications)
    // =========================================================================

    @Nested
    @DisplayName("1. Application Submission (POST /v1/applications)")
    class ApplicationSubmission {

        @Test
        @DisplayName("Anonymous request without JWT returns 401")
        void submit_noJwt_returns401() throws Exception {
            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(UUID.randomUUID())
                    .cvVersionId(UUID.randomUUID())
                    .build();

            mockMvc.perform(post("/v1/applications")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("EMPLOYER JWT returns 403 Forbidden (requires CANDIDATE)")
        void submit_employerRole_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "employer@test.com", "employer");
            String authHeader = generateBearerToken(userId, "employer@test.com", "employer");

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(UUID.randomUUID())
                    .cvVersionId(UUID.randomUUID())
                    .build();

            mockMvc.perform(post("/v1/applications")
                            .header("Authorization", authHeader)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("CANDIDATE JWT derives identity from principal and ignores spoofed headers")
        void submit_candidateWithSpoofedHeaders_usesJwtPrincipal() throws Exception {
            UUID userA = UUID.randomUUID();
            UUID candidateProfileA = UUID.randomUUID();
            createActiveUser(userA, "candA@test.com", "candidate");
            String authHeader = generateBearerToken(userA, "candA@test.com", "candidate");

            UUID spoofedUserB = UUID.randomUUID();
            UUID spoofedCandidateB = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID cvId = UUID.randomUUID();

            when(resourceOwnershipService.getRequiredCandidateProfileId(userA)).thenReturn(candidateProfileA);

            ApplicationResponse mockResponse = ApplicationResponse.builder()
                    .applicationId(UUID.randomUUID())
                    .candidateId(candidateProfileA)
                    .jobId(jobId)
                    .stage("new")
                    .appliedAt(Instant.now())
                    .processingJobId(UUID.randomUUID())
                    .message("Application submitted successfully.")
                    .build();

            when(applicationService.applyForJob(eq(candidateProfileA), eq(userA), any(ApplicationApplyRequest.class)))
                    .thenReturn(mockResponse);

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(jobId)
                    .cvVersionId(cvId)
                    .coverLetter("Applying as candidate A")
                    .build();

            mockMvc.perform(post("/v1/applications")
                            .header("Authorization", authHeader)
                            .header("X-Candidate-Id", spoofedCandidateB.toString())
                            .header("X-User-Id", spoofedUserB.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.candidateId").value(candidateProfileA.toString()));

            // Verify applicationService was called with identity of User A, NOT spoofed User B
            verify(applicationService).applyForJob(eq(candidateProfileA), eq(userA), any(ApplicationApplyRequest.class));
            verify(applicationService, never()).applyForJob(eq(spoofedCandidateB), any(), any());
            verify(applicationService, never()).applyForJob(any(), eq(spoofedUserB), any());
        }

        @Test
        @DisplayName("Candidate without candidate profile returns 403")
        void submit_noCandidateProfile_returns403() throws Exception {
            UUID userA = UUID.randomUUID();
            createActiveUser(userA, "candA@test.com", "candidate");
            String authHeader = generateBearerToken(userA, "candA@test.com", "candidate");

            when(resourceOwnershipService.getRequiredCandidateProfileId(userA))
                    .thenThrow(new AccessDeniedException("candidate profile not found"));

            ApplicationApplyRequest request = ApplicationApplyRequest.builder()
                    .jobId(UUID.randomUUID())
                    .cvVersionId(UUID.randomUUID())
                    .build();

            mockMvc.perform(post("/v1/applications")
                            .header("Authorization", authHeader)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
    }

    // =========================================================================
    // 2. STAGE UPDATE (PATCH /v1/applications/{id}/stage)
    // =========================================================================

    @Nested
    @DisplayName("2. Stage Update (PATCH /v1/applications/{id}/stage)")
    class StageUpdate {

        @Test
        @DisplayName("CANDIDATE JWT returns 403 Forbidden (requires EMPLOYER)")
        void updateStage_candidateRole_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "cand@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "cand@test.com", "candidate");

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .build();

            mockMvc.perform(patch("/v1/applications/" + UUID.randomUUID() + "/stage")
                            .header("Authorization", authHeader)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("EMPLOYER JWT updating unowned application returns 403 Forbidden")
        void updateStage_employerUnownedJob_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "emp@test.com", "employer");
            String authHeader = generateBearerToken(userId, "emp@test.com", "employer");

            UUID appId = UUID.randomUUID();
            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .build();

            when(applicationService.updateStage(eq(appId), eq(userId), any(ApplicationStageUpdateRequest.class)))
                    .thenThrow(new AccessDeniedException("You do not have permission to manage this job"));

            mockMvc.perform(patch("/v1/applications/" + appId + "/stage")
                            .header("Authorization", authHeader)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("EMPLOYER JWT updating owned application succeeds and ignores spoofed X-User-Id")
        void updateStage_employerOwnedJobWithSpoofedHeader_usesJwtPrincipal() throws Exception {
            UUID employerA = UUID.randomUUID();
            UUID spoofedUserB = UUID.randomUUID();
            createActiveUser(employerA, "empA@test.com", "employer");
            String authHeader = generateBearerToken(employerA, "empA@test.com", "employer");

            UUID appId = UUID.randomUUID();
            StageUpdateResponse mockResponse = StageUpdateResponse.builder()
                    .applicationId(appId)
                    .previousStage("new")
                    .currentStage("screening")
                    .updatedAt(Instant.now())
                    .build();

            when(applicationService.updateStage(eq(appId), eq(employerA), any(ApplicationStageUpdateRequest.class)))
                    .thenReturn(mockResponse);

            ApplicationStageUpdateRequest request = ApplicationStageUpdateRequest.builder()
                    .toStage("screening")
                    .reason("Shortlisted")
                    .build();

            mockMvc.perform(patch("/v1/applications/" + appId + "/stage")
                            .header("Authorization", authHeader)
                            .header("X-User-Id", spoofedUserB.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentStage").value("screening"));

            verify(applicationService).updateStage(eq(appId), eq(employerA), any(ApplicationStageUpdateRequest.class));
            verify(applicationService, never()).updateStage(any(), eq(spoofedUserB), any());
        }
    }

    // =========================================================================
    // 3. APPLICATION RANKINGS (GET /v1/jobs/{jobId}/applications/ranking)
    // =========================================================================

    @Nested
    @DisplayName("3. Job Rankings (GET /v1/jobs/{jobId}/applications/ranking)")
    class JobRankings {

        @Test
        @DisplayName("CANDIDATE role returns 403 Forbidden")
        void ranking_candidateRole_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "cand@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "cand@test.com", "candidate");

            mockMvc.perform(get("/v1/jobs/" + UUID.randomUUID() + "/applications/ranking")
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("EMPLOYER accessing other company's job ranking returns 403 Forbidden")
        void ranking_unownedJob_returns403() throws Exception {
            UUID employerId = UUID.randomUUID();
            createActiveUser(employerId, "emp@test.com", "employer");
            String authHeader = generateBearerToken(employerId, "emp@test.com", "employer");

            UUID otherJobId = UUID.randomUUID();
            when(applicationService.getJobRankings(eq(otherJobId), eq(employerId), any(), any()))
                    .thenThrow(new AccessDeniedException("You do not have permission to manage this job"));

            mockMvc.perform(get("/v1/jobs/" + otherJobId + "/applications/ranking")
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("EMPLOYER accessing own job ranking returns 200 with ranking data")
        void ranking_ownedJob_returns200() throws Exception {
            UUID employerId = UUID.randomUUID();
            createActiveUser(employerId, "emp@test.com", "employer");
            String authHeader = generateBearerToken(employerId, "emp@test.com", "employer");

            UUID jobId = UUID.randomUUID();
            ApplicationRankingResponse mockRanking = ApplicationRankingResponse.builder()
                    .jobId(jobId)
                    .totalCandidates(1)
                    .items(List.of(ApplicationRankingItem.builder()
                            .applicationId(UUID.randomUUID())
                            .candidateId(UUID.randomUUID())
                            .candidateName("Alice")
                            .stage("new")
                            .overallScore(90)
                            .ranking(1)
                            .build()))
                    .build();

            when(applicationService.getJobRankings(eq(jobId), eq(employerId), any(), any()))
                    .thenReturn(mockRanking);

            mockMvc.perform(get("/v1/jobs/" + jobId + "/applications/ranking")
                            .header("Authorization", authHeader))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalCandidates").value(1))
                    .andExpect(jsonPath("$.items[0].candidateName").value("Alice"));
        }
    }

    // =========================================================================
    // 4. CV UPLOAD & ACCESS (POST & GET /v1/candidates/{id}/cv)
    // =========================================================================

    @Nested
    @DisplayName("4. CV Routes (/v1/candidates/{candidateId}/cv)")
    class CvRoutes {

        @Test
        @DisplayName("Candidate uploading CV for other candidate returns 403 Forbidden")
        void uploadCv_mismatchedCandidateId_returns403() throws Exception {
            UUID userA = UUID.randomUUID();
            createActiveUser(userA, "candA@test.com", "candidate");
            String authHeader = generateBearerToken(userA, "candA@test.com", "candidate");

            UUID otherCandidateId = UUID.randomUUID();
            doThrow(new AccessDeniedException("You can only access your own candidate profile"))
                    .when(resourceOwnershipService).checkCandidateProfileOwnership(userA, otherCandidateId);

            MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", "content".getBytes());

            mockMvc.perform(multipart("/v1/candidates/" + otherCandidateId + "/cv")
                            .file(file)
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Candidate listing other candidate's CVs returns 403 Forbidden")
        void listCvs_mismatchedCandidateId_returns403() throws Exception {
            UUID userA = UUID.randomUUID();
            createActiveUser(userA, "candA@test.com", "candidate");
            String authHeader = generateBearerToken(userA, "candA@test.com", "candidate");

            UUID otherCandidateId = UUID.randomUUID();
            doThrow(new AccessDeniedException("You can only access your own candidate profile"))
                    .when(resourceOwnershipService).checkCandidateProfileOwnership(userA, otherCandidateId);

            mockMvc.perform(get("/v1/candidates/" + otherCandidateId + "/cv")
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Third-party accessing CV returns 403 Forbidden")
        void getCv_unrelatedUser_returns403() throws Exception {
            UUID unrelatedUser = UUID.randomUUID();
            createActiveUser(unrelatedUser, "unrelated@test.com", "candidate");
            String authHeader = generateBearerToken(unrelatedUser, "unrelated@test.com", "candidate");

            UUID candidateId = UUID.randomUUID();
            UUID cvId = UUID.randomUUID();
            CvVersion cv = CvVersion.builder().id(cvId).candidateId(candidateId).build();
            when(cvVersionRepository.findById(cvId)).thenReturn(Optional.of(cv));

            doThrow(new AccessDeniedException("You do not have permission to view this CV"))
                    .when(resourceOwnershipService).checkCvVersionAccess(unrelatedUser, candidateId, cvId);

            mockMvc.perform(get("/v1/candidates/" + candidateId + "/cv/" + cvId)
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
    }

    // =========================================================================
    // 5. JWT INVALID / ROLE FAIL-SAFE TESTS
    // =========================================================================

    @Nested
    @DisplayName("5. Authentication Fail-Safe Tests")
    class AuthenticationFailSafes {

        @Test
        @DisplayName("Valid JWT but user does not exist in DB returns 401")
        void validJwt_userNotFoundInDb_returns401() throws Exception {
            UUID nonexistentUserId = UUID.randomUUID();
            when(userRepository.findById(nonexistentUserId)).thenReturn(Optional.empty());
            String token = generateBearerToken(nonexistentUserId, "ghost@test.com", "candidate");

            mockMvc.perform(get("/v1/applications/" + UUID.randomUUID() + "/history")
                            .header("Authorization", token))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("Valid JWT but user has null role in DB does not receive default role, returns 401")
        void validJwt_nullRoleInDb_returns401() throws Exception {
            UUID userId = UUID.randomUUID();
            User dbUser = User.builder()
                    .id(userId)
                    .email("norole@test.com")
                    .role(null)
                    .status("active")
                    .isVerified(true)
                    .build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));
            String token = generateBearerToken(userId, "norole@test.com", "candidate");

            mockMvc.perform(post("/v1/applications")
                            .header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("Valid JWT but user has invalid role in DB does not receive authority, returns 401")
        void validJwt_invalidRoleInDb_returns401() throws Exception {
            UUID userId = UUID.randomUUID();
            User dbUser = User.builder()
                    .id(userId)
                    .email("badrole@test.com")
                    .role("GUEST_USER")
                    .status("active")
                    .isVerified(true)
                    .build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));
            String token = generateBearerToken(userId, "badrole@test.com", "GUEST_USER");

            mockMvc.perform(post("/v1/applications")
                            .header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }
    }

    // =========================================================================
    // 6. MATCH EVALUATION & RESULT (POST & GET /v1/applications/{id}/match)
    // =========================================================================

    @Nested
    @DisplayName("6. Match Routes (/v1/applications/{id}/match)")
    class MatchRoutes {

        @Test
        @DisplayName("Anonymous request returns 401")
        void match_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/applications/" + UUID.randomUUID() + "/match"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("Unowned application access returns 403 Forbidden")
        void match_unownedApplication_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "user@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "user@test.com", "candidate");

            UUID appId = UUID.randomUUID();
            doThrow(new AccessDeniedException("You do not have permission to access this application"))
                    .when(resourceOwnershipService).checkApplicationAccess(userId, appId);

            mockMvc.perform(get("/v1/applications/" + appId + "/match")
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Owner accessing match result returns 200")
        void match_ownerApplication_returns200() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "user@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "user@test.com", "candidate");

            UUID appId = UUID.randomUUID();
            MatchResult mockResult = MatchResult.builder()
                    .id(UUID.randomUUID())
                    .applicationId(appId)
                    .overallScore((short) 85)
                    .breakdown("{}")
                    .build();

            when(matchingService.getMatchResult(appId)).thenReturn(Optional.of(mockResult));

            mockMvc.perform(get("/v1/applications/" + appId + "/match")
                            .header("Authorization", authHeader))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.overallScore").value(85));
        }
    }

    // =========================================================================
    // 7. PROCESSING JOBS (GET /v1/processing-jobs/{id})
    // =========================================================================

    @Nested
    @DisplayName("7. Processing Job Routes (/v1/processing-jobs/{id})")
    class ProcessingJobRoutes {

        @Test
        @DisplayName("Anonymous request returns 401")
        void job_anonymous_returns401() throws Exception {
            mockMvc.perform(get("/v1/processing-jobs/" + UUID.randomUUID()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        @Test
        @DisplayName("Job not found returns 404")
        void job_notFound_returns404() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "user@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "user@test.com", "candidate");

            UUID jobId = UUID.randomUUID();
            when(processingJobService.getJob(jobId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/v1/processing-jobs/" + jobId)
                            .header("Authorization", authHeader))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Unowned job returns 403 Forbidden")
        void job_unowned_returns403() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "user@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "user@test.com", "candidate");

            UUID jobId = UUID.randomUUID();
            UUID entityId = UUID.randomUUID();
            ProcessingJob mockJob = ProcessingJob.builder()
                    .id(jobId)
                    .jobType("CV_TEXT_EXTRACTION")
                    .entityType("cv_version")
                    .entityId(entityId)
                    .status("PENDING")
                    .build();

            when(processingJobService.getJob(jobId)).thenReturn(Optional.of(mockJob));
            doThrow(new AccessDeniedException("You do not have permission to view this processing job"))
                    .when(resourceOwnershipService).checkProcessingJobAccess(userId, jobId, "cv_version", entityId);

            mockMvc.perform(get("/v1/processing-jobs/" + jobId)
                            .header("Authorization", authHeader))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        @DisplayName("Owned job returns 200")
        void job_owned_returns200() throws Exception {
            UUID userId = UUID.randomUUID();
            createActiveUser(userId, "user@test.com", "candidate");
            String authHeader = generateBearerToken(userId, "user@test.com", "candidate");

            UUID jobId = UUID.randomUUID();
            UUID entityId = UUID.randomUUID();
            ProcessingJob mockJob = ProcessingJob.builder()
                    .id(jobId)
                    .jobType("CV_TEXT_EXTRACTION")
                    .entityType("cv_version")
                    .entityId(entityId)
                    .status("COMPLETED")
                    .build();

            when(processingJobService.getJob(jobId)).thenReturn(Optional.of(mockJob));

            mockMvc.perform(get("/v1/processing-jobs/" + jobId)
                            .header("Authorization", authHeader))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"));
        }
    }
}
