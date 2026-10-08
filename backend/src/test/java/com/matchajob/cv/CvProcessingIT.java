package com.matchajob.cv;

import com.matchajob.MatchaJobApplication;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.EmbeddingRepository;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@Tag("integration")
class CvProcessingIT {

    @Autowired
    private CvController cvController;

    @Autowired
    private CvVersionRepository cvVersionRepository;

    @Autowired
    private ProcessingJobService jobService;

    @Autowired
    private CvProcessingOrchestrator orchestrator;

    @Autowired
    private CvStorageService storageService;

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private EmbeddingRepository embeddingRepository;

    @Autowired
    private JdbcClient jdbcClient;

    @MockBean
    private AiWorkerClient aiWorkerClient;

    private byte[] createSamplePdfBytes() {
        return "%PDF-1.4 Mock PDF content for test extraction".getBytes(StandardCharsets.UTF_8);
    }

    private UUID createTestCandidateProfile() {
        UUID userId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, 'hash', 'Test Candidate', 'candidate')
            """)
            .params(userId, "cand_" + userId + "@test.com")
            .update();

        jdbcClient.sql("""
            INSERT INTO candidate_profiles (id, user_id)
            VALUES (?, ?)
            """)
            .params(candidateId, userId)
            .update();

        return candidateId;
    }

    private UUID createTestEmployerUser() {
        UUID userId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, 'hash', 'Test Employer', 'employer')
            """)
            .params(userId, "emp_" + userId + "@test.com")
            .update();
        return userId;
    }

    private UUID createTestJob(UUID employerUserId) {
        UUID companyId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO companies (id, owner_id, name)
            VALUES (?, ?, 'Test Corp ' || ?)
            """)
            .params(companyId, employerUserId, companyId.toString().substring(0, 8))
            .update();

        jdbcClient.sql("""
            INSERT INTO jobs (id, company_id, created_by, title, work_type, salary_mode)
            VALUES (?, ?, ?, 'Senior Java Engineer', 'full_time', 'negotiable')
            """)
            .params(jobId, companyId, employerUserId)
            .update();

        return jobId;
    }

    private UUID createTestApplication(UUID candidateId, UUID jobId) {
        UUID appId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO applications (id, candidate_id, job_id, stage)
            VALUES (?, ?, ?, 'new')
            """)
            .params(appId, candidateId, jobId)
            .update();
        return appId;
    }

    @Test
    void endToEnd_cvUploadAndProcessingSuccess() throws Exception {
        UUID candidateId = createTestCandidateProfile();
        byte[] pdfBytes = createSamplePdfBytes();

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "developer_resume.pdf",
                "application/pdf",
                pdfBytes
        );

        // Mock AI Worker responses
        CVExtractResponse extractResponse = CVExtractResponse.builder()
                .rawText("Nguyen Van A - Senior Java Developer with Spring Boot and PostgreSQL expertise.")
                .parsedData(Map.of("full_name", "Nguyen Van A", "skills", List.of("Java", "Spring Boot")))
                .charCount(80)
                .pageCount(1)
                .build();
        when(aiWorkerClient.extractCv(any(), any(), any())).thenReturn(extractResponse);

        // 1536-dimensional mock vector
        List<Float> mockVector = new ArrayList<>(Collections.nCopies(1536, 0.025f));
        EmbeddingsResponse embeddingsResponse = EmbeddingsResponse.builder()
                .embeddings(List.of(mockVector))
                .dimension(1536)
                .model("text-embedding-3-small")
                .build();
        when(aiWorkerClient.generateEmbeddings(anyList())).thenReturn(embeddingsResponse);

        // Execute synchronous upload & processing
        ResponseEntity<Map<String, Object>> response = cvController.uploadCv(candidateId, file, true);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        UUID cvVersionId = (UUID) response.getBody().get("cv_version_id");
        UUID processingJobId = (UUID) response.getBody().get("processing_job_id");

        // Verify CvVersion persisted and updated to "extracted"
        Optional<CvVersion> cvOpt = cvVersionRepository.findById(cvVersionId);
        assertThat(cvOpt).isPresent();
        assertThat(cvOpt.get().getStatus()).isEqualTo("extracted");
        assertThat(cvOpt.get().getRawText()).contains("Nguyen Van A");

        // Verify ProcessingJob marked COMPLETED
        Optional<ProcessingJob> jobOpt = jobService.getJob(processingJobId);
        assertThat(jobOpt).isPresent();
        assertThat(jobOpt.get().getStatus()).isEqualTo("COMPLETED");

        // Verify similarity search using cosine distance
        List<UUID> matches = embeddingRepository.findSimilarEntities("cv_version", mockVector, 5);
        assertThat(matches).contains(cvVersionId);
    }

    @Test
    void failureIsolation_workerUnavailableTriggersBackoffRetry() throws Exception {
        UUID candidateId = createTestCandidateProfile();
        UUID entityId = UUID.randomUUID();
        String idempotencyKey = "retry_test_" + entityId;

        CvStorageService.StorageResult stored = storageService.store(
                new MockMultipartFile("file", "test.pdf", "application/pdf", createSamplePdfBytes())
        );

        // Create sample CvVersion
        CvVersion cv = cvVersionRepository.save(CvVersion.builder()
                .candidateId(candidateId)
                .filePath(stored.filePath())
                .fileName(stored.fileName())
                .fileSizeBytes(stored.fileSizeBytes())
                .mimeType(stored.mimeType())
                .sha256Hash(stored.sha256Hash())
                .status("uploaded")
                .build());

        ProcessingJob job = jobService.createJob("CV_TEXT_EXTRACTION", "cv_version", cv.getId(), idempotencyKey);

        // Simulate network timeout/refusal
        when(aiWorkerClient.extractCv(any(), any(), any()))
                .thenThrow(new ResourceAccessException("Connection timed out after 3000ms"));

        // Execute processing
        boolean success = orchestrator.processSingleJob(job);
        assertThat(success).isFalse();

        // Verify job remains retryable in PENDING state with incremented attempt
        ProcessingJob updated = jobService.getJob(job.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("PENDING");
        assertThat(updated.getAttemptCount()).isEqualTo(1);
        assertThat(updated.getLastError()).contains("Connection timed out");
        assertThat(updated.getRetryAfter()).isAfter(updated.getCreatedAt());
    }

    @Test
    void failureIsolation_permanentWorkerErrorMarksJobFailed() throws Exception {
        UUID candidateId = createTestCandidateProfile();
        UUID entityId = UUID.randomUUID();
        String idempotencyKey = "perm_fail_" + entityId;

        CvStorageService.StorageResult stored = storageService.store(
                new MockMultipartFile("file", "corrupt.pdf", "application/pdf", createSamplePdfBytes())
        );

        CvVersion cv = cvVersionRepository.save(CvVersion.builder()
                .candidateId(candidateId)
                .filePath(stored.filePath())
                .fileName(stored.fileName())
                .fileSizeBytes(stored.fileSizeBytes())
                .mimeType(stored.mimeType())
                .sha256Hash(stored.sha256Hash())
                .status("uploaded")
                .build());

        ProcessingJob job = jobService.createJob("CV_TEXT_EXTRACTION", "cv_version", cv.getId(), idempotencyKey);

        // Simulate 400 Bad Request (non-retryable client error)
        when(aiWorkerClient.extractCv(any(), any(), any()))
                .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Corrupt PDF", null, null, null));

        boolean success = orchestrator.processSingleJob(job);
        assertThat(success).isFalse();

        ProcessingJob updated = jobService.getJob(job.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("FAILED");
        assertThat(updated.getLastError()).contains("Corrupt PDF");
    }

    @Test
    void idempotency_duplicateJobSubmissionsReturnSameJob() {
        UUID entityId = UUID.randomUUID();
        String idempotencyKey = "idempotent_key_" + entityId;

        ProcessingJob job1 = jobService.createJob("CV_TEXT_EXTRACTION", "cv_version", entityId, idempotencyKey);
        ProcessingJob job2 = jobService.createJob("CV_TEXT_EXTRACTION", "cv_version", entityId, idempotencyKey);

        assertThat(job1.getId()).isEqualTo(job2.getId());
    }

    @Test
    void matchEvaluation_evaluatesAndPersistsMatchResult() {
        UUID candidateId = createTestCandidateProfile();
        UUID employerId = createTestEmployerUser();
        UUID jobId = createTestJob(employerId);
        UUID applicationId = createTestApplication(candidateId, jobId);

        CvVersion cv = cvVersionRepository.save(CvVersion.builder()
                .candidateId(candidateId)
                .filePath("target/uploads/cv/match_test.pdf")
                .fileName("match_test.pdf")
                .fileSizeBytes(200)
                .mimeType("application/pdf")
                .sha256Hash("match_hash_" + UUID.randomUUID())
                .rawText("Nguyen Van B. 4 years Java and PostgreSQL.")
                .status("extracted")
                .build());

        MatchScoreResponse mockScore = MatchScoreResponse.builder()
                .overallScore(85)
                .skillsScore(90)
                .experienceScore(80)
                .breakdown(Map.of("matched", List.of("Java", "PostgreSQL")))
                .rationale("Candidate matches core backend requirements.")
                .build();

        when(aiWorkerClient.calculateMatchScore(any())).thenReturn(mockScore);

        MatchResult result = matchingService.evaluateMatch(
                applicationId,
                jobId,
                cv.getId(),
                "Java Engineer",
                "Java, PostgreSQL",
                "Microservices backend"
        );

        assertThat(result).isNotNull();
        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getOverallScore()).isEqualTo((short) 85);
        assertThat(result.getRationale()).contains("Candidate matches core backend requirements.");

        // Idempotency: second call returns same result
        MatchResult duplicateCall = matchingService.evaluateMatch(
                applicationId,
                jobId,
                cv.getId(),
                "Java Engineer",
                "Java, PostgreSQL",
                "Microservices backend"
        );
        assertThat(duplicateCall.getId()).isEqualTo(result.getId());
    }
}
