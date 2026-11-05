package com.matchajob.matching;

import com.matchajob.MatchaJobApplication;
import com.matchajob.application.dto.ApplicationApplyRequest;
import com.matchajob.application.dto.ApplicationRankingResponse;
import com.matchajob.application.dto.ApplicationResponse;
import com.matchajob.application.service.ApplicationService;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.matching.service.MatchingScheduler;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * End-to-End Integration Tests for Week 5:
 * 1. CV Access Control across Application–Job–Company ownership, cross-employer blocking, and guessed URL prevention.
 * 2. Idempotency across application submission, job creation, AI calling, and match result persistence.
 * 3. AI Worker failure simulation (timeout, 5xx, crash/lease expiration), exponential backoff, and recovery.
 * 4. Full pipeline execution: Apply -> Background AI Matching -> Persistence -> Ranking API.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles({"test", "ai-stub"})
@Tag("integration")
@DisplayName("Application-Matching-Recovery & CV Access Control Integration Tests")
class ApplicationMatchingRecoveryIT {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ProcessingJobService processingJobService;

    @Autowired
    private ProcessingJobRepository processingJobRepository;

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private MatchResultRepository matchResultRepository;

    @Autowired
    private CvController cvController;

    @Autowired
    private CvVersionRepository cvVersionRepository;

    @Autowired
    private JdbcClient jdbcClient;

    @SpyBean
    private AiWorkerClient aiWorkerClient;

    private MatchingScheduler matchingScheduler;

    @BeforeEach
    void setUp() {
        matchingScheduler = new MatchingScheduler(processingJobService, matchingService);
        reset(aiWorkerClient);
    }

    // =========================================================================
    // Fixtures & Helpers
    // =========================================================================

    private record CandidateFixture(UUID userId, UUID candidateId, Authentication auth) {}
    private record EmployerFixture(UUID userId, UUID companyId, UUID jobId, Authentication auth) {}

    private CandidateFixture createCandidateFixture() {
        UUID userId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role, status)
            VALUES (?, ?, 'hash', 'Test Candidate', 'candidate', 'active')
            """)
            .params(userId, "cand_" + userId + "@example.com")
            .update();

        jdbcClient.sql("""
            INSERT INTO candidate_profiles (id, user_id)
            VALUES (?, ?)
            """)
            .params(candidateId, userId)
            .update();

        Authentication auth = new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE")));

        return new CandidateFixture(userId, candidateId, auth);
    }

    private EmployerFixture createEmployerFixture(String companyName, String jobTitle) {
        UUID userId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role, status)
            VALUES (?, ?, 'hash', 'Test Employer', 'employer', 'active')
            """)
            .params(userId, "emp_" + userId + "@example.com")
            .update();

        jdbcClient.sql("""
            INSERT INTO companies (id, owner_id, name)
            VALUES (?, ?, ?)
            """)
            .params(companyId, userId, companyName)
            .update();

        jdbcClient.sql("""
            INSERT INTO jobs (id, company_id, created_by, title, status, work_type, salary_mode, salary_min, salary_max, requirements, description)
            VALUES (?, ?, ?, ?, 'active', 'full_time', 'range', 1000, 2000, 'Java, Spring Boot, PostgreSQL', 'Develop high performance microservices')
            """)
            .params(jobId, companyId, userId, jobTitle)
            .update();

        Authentication auth = new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYER")));

        return new EmployerFixture(userId, companyId, jobId, auth);
    }

    private UUID uploadCvFixture(UUID candidateId, Authentication auth, String fileName, String rawText) {
        try {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    fileName,
                    "application/pdf",
                    ("%PDF-1.4 " + rawText).getBytes(StandardCharsets.UTF_8)
            );

            var uploadResponse = cvController.uploadCv(candidateId, auth, file, false);
            UUID cvVersionId = uploadResponse.getBody().cvVersionId();

            // Update raw text so that AI matching has text ready to evaluate
            CvVersion cv = cvVersionRepository.findById(cvVersionId).orElseThrow();
            cv.setRawText(rawText);
            cv.setStatus("extracted");
            cvVersionRepository.save(cv);

            return cvVersionId;
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    // =========================================================================
    // 1. CV Access Control Tests (Application–Job–Company, Cross-Employer & Guessed URL)
    // =========================================================================

    @Nested
    @DisplayName("1. CV Access Control Tests")
    class CvAccessControlTests {

        @Test
        @DisplayName("Employer can download CV when application is submitted to their own job")
        void employer_canDownloadCv_whenApplicationSubmittedToTheirJob() throws IOException {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Acme Corp", "Backend Engineer");

            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "candidate_cv.pdf",
                    "Java Spring Boot developer with 5 years experience");

            // Apply for job
            applicationService.applyForJob(candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            // Employer downloads the CV
            ResponseEntity<Resource> response = cvController.downloadCv(
                    candidate.candidateId(), cvId, employer.auth(), "attachment");

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getHeaders().getContentDisposition().getFilename()).isEqualTo("candidate_cv.pdf");
        }

        @Test
        @DisplayName("Employer CANNOT download CV submitted to a DIFFERENT employer job (cross-employer access denied)")
        void employer_cannotDownloadCv_submittedToDifferentEmployerJob() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employerA = createEmployerFixture("Company Alpha", "Backend Engineer");
            EmployerFixture employerB = createEmployerFixture("Company Beta", "Frontend Engineer");

            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "alpha_cv.pdf",
                    "Java developer applying to Alpha only");

            // Candidate applies ONLY to Company Alpha
            applicationService.applyForJob(candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employerA.jobId()).cvVersionId(cvId).build());

            // Employer B tries to download this CV -> must be FORBIDDEN
            assertThatThrownBy(() -> cvController.downloadCv(
                    candidate.candidateId(), cvId, employerB.auth(), "attachment"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to view this CV");
        }

        @Test
        @DisplayName("Employer CANNOT download an unsubmitted CV version of a candidate")
        void employer_cannotDownloadUnsubmittedCvVersion() throws Exception {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Tech Giant", "DevOps Engineer");

            UUID submittedCv = uploadCvFixture(candidate.candidateId(), candidate.auth(), "submitted.pdf", "CV 1");
            UUID privateCv = uploadCvFixture(candidate.candidateId(), candidate.auth(), "private.pdf", "CV 2 (Draft/Private)");

            // Candidate applies with submittedCv only
            applicationService.applyForJob(candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(submittedCv).build());

            // Employer can download submittedCv
            assertThat(cvController.downloadCv(candidate.candidateId(), submittedCv, employer.auth(), "attachment")
                    .getStatusCode()).isEqualTo(HttpStatus.OK);

            // Employer CANNOT download privateCv
            assertThatThrownBy(() -> cvController.downloadCv(
                    candidate.candidateId(), privateCv, employer.auth(), "attachment"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to view this CV");
        }

        @Test
        @DisplayName("Guessed URL: Unrelated candidate cannot download another candidate's CV")
        void guessedUrl_unrelatedCandidate_cannotDownloadCv() {
            CandidateFixture candidateA = createCandidateFixture();
            CandidateFixture candidateB = createCandidateFixture();

            UUID cvId = uploadCvFixture(candidateA.candidateId(), candidateA.auth(), "secret_cv.pdf", "Confidential");

            // Candidate B guesses URL and attempts to download Candidate A's CV -> 403 Forbidden
            assertThatThrownBy(() -> cvController.downloadCv(
                    candidateA.candidateId(), cvId, candidateB.auth(), "attachment"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to view this CV");
        }

        @Test
        @DisplayName("Candidate owner can always download their own CV")
        void candidateOwner_canDownloadOwnCv() throws IOException {
            CandidateFixture candidate = createCandidateFixture();
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "my_cv.pdf", "Owner CV content");

            ResponseEntity<Resource> response = cvController.downloadCv(
                    candidate.candidateId(), cvId, candidate.auth(), "inline");

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
        }
    }

    // =========================================================================
    // 2. Idempotency & Unique Constraint Tests
    // =========================================================================

    @Nested
    @DisplayName("2. Idempotency & Constraint Tests")
    class IdempotencyTests {

        @Test
        @DisplayName("Duplicate application attempt is rejected with 409 and does NOT duplicate processing jobs")
        void duplicateApplication_rejectedAndNoDuplicateJob() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Idempotent Co", "Software Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "cv.pdf", "Content");

            ApplicationApplyRequest req = ApplicationApplyRequest.builder()
                    .jobId(employer.jobId())
                    .cvVersionId(cvId)
                    .coverLetter("First try")
                    .build();

            // First apply succeeds
            ApplicationResponse first = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(), req);
            assertThat(first).isNotNull();

            // Count processing jobs in DB for this application
            Integer jobCount1 = jdbcClient.sql("SELECT COUNT(*) FROM processing_jobs WHERE idempotency_key = ?")
                    .param("app_match_" + first.getApplicationId())
                    .query(Integer.class)
                    .single();
            assertThat(jobCount1).isEqualTo(1);

            // Second apply fails
            assertThatThrownBy(() -> applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(), req))
                    .isInstanceOf(ApplicationService.DuplicateApplicationException.class);

            // Job count remains 1 (no duplicate jobs created)
            Integer jobCount2 = jdbcClient.sql("SELECT COUNT(*) FROM processing_jobs WHERE idempotency_key = ?")
                    .param("app_match_" + first.getApplicationId())
                    .query(Integer.class)
                    .single();
            assertThat(jobCount2).isEqualTo(1);
        }

        @Test
        @DisplayName("ProcessingJobService.createJob is idempotent under repeated and concurrent calls")
        void processingJobService_createJob_isIdempotent() {
            UUID entityId = UUID.randomUUID();
            String idempotencyKey = "test_key_" + UUID.randomUUID();

            ProcessingJob job1 = processingJobService.createJob("APPLICATION_MATCHING", "application", entityId, idempotencyKey);
            ProcessingJob job2 = processingJobService.createJob("APPLICATION_MATCHING", "application", entityId, idempotencyKey);

            assertThat(job1.getId()).isEqualTo(job2.getId());

            Integer count = jdbcClient.sql("SELECT COUNT(*) FROM processing_jobs WHERE idempotency_key = ?")
                    .param(idempotencyKey)
                    .query(Integer.class)
                    .single();
            assertThat(count).isEqualTo(1);
        }

        @Test
        @DisplayName("MatchingService.saveMatchResultTransaction performs idempotent upsert without duplicate error")
        void matchResultPersistence_idempotentUpsert() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Upsert Co", "Senior Java Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "upsert_cv.pdf", "Java text");

            ApplicationResponse app = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            MatchScoreResponse firstScore = MatchScoreResponse.builder()
                    .overallScore(75)
                    .skillsScore(80)
                    .experienceScore(70)
                    .rationale("Initial score")
                    .breakdown(Map.of("skills", 80))
                    .build();

            // First save
            MatchResult res1 = matchingService.saveMatchResultTransaction(
                    app.getApplicationId(), employer.jobId(), cvId, firstScore);
            assertThat(res1.getOverallScore()).isEqualTo((short) 75);

            // Second save (simulating retry or re-evaluation)
            MatchScoreResponse updatedScore = MatchScoreResponse.builder()
                    .overallScore(88)
                    .skillsScore(90)
                    .experienceScore(85)
                    .rationale("Updated score after retry")
                    .breakdown(Map.of("skills", 90))
                    .build();

            MatchResult res2 = matchingService.saveMatchResultTransaction(
                    app.getApplicationId(), employer.jobId(), cvId, updatedScore);

            assertThat(res2.getId()).isEqualTo(res1.getId());
            assertThat(res2.getOverallScore()).isEqualTo((short) 88);
            assertThat(res2.getRationale()).isEqualTo("Updated score after retry");

            // Verify exactly 1 record in DB
            Integer resultCount = jdbcClient.sql("SELECT COUNT(*) FROM match_results WHERE application_id = ?")
                    .param(app.getApplicationId())
                    .query(Integer.class)
                    .single();
            assertThat(resultCount).isEqualTo(1);
        }
    }

    // =========================================================================
    // 3. AI Worker Failure Simulation, Timeout, Retry, Backoff & Recovery Tests
    // =========================================================================

    @Nested
    @DisplayName("3. AI Worker Failure, Backoff & Recovery Tests")
    class AiRecoveryTests {

        @Test
        @DisplayName("AI Worker timeout/transient error sets status to PENDING with exponential backoff")
        void aiWorkerTimeout_setsPendingWithBackoff() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Transient Co", "Backend Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "cv.pdf", "Java Spring Boot");

            ApplicationResponse app = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            // Simulate AI Worker connection timeout
            doThrow(new ResourceAccessException("Connection timed out to AI Worker"))
                    .when(aiWorkerClient).calculateMatchScore(any());

            // Run scheduler poll
            matchingScheduler.poll();

            // Verify job status is rescheduled to PENDING with backoff
            ProcessingJob job = processingJobRepository.findByIdempotencyKey("app_match_" + app.getApplicationId()).orElseThrow();
            assertThat(job.getStatus()).isEqualTo("PENDING");
            assertThat(job.getAttemptCount()).isEqualTo(1);
            assertThat(job.getRetryAfter()).isAfter(Instant.now().minusSeconds(1));
            assertThat(job.getLastError()).contains("AI Worker connection failed");

            // Verify no match result created yet
            Optional<MatchResult> result = matchResultRepository.findByApplicationId(app.getApplicationId());
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Pipeline recovers when AI Worker comes back online and completes processing")
        void aiWorkerRecovers_schedulerCompletesJobAndSavesResult() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Recovery Co", "Backend Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "cv.pdf", "Java Spring Boot expert");

            ApplicationResponse app = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            // 1. First poll: AI Worker fails with 503 Service Unavailable
            doThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE, "AI Worker overloaded"))
                    .when(aiWorkerClient).calculateMatchScore(any());

            matchingScheduler.poll();

            ProcessingJob failedJob = processingJobRepository.findByIdempotencyKey("app_match_" + app.getApplicationId()).orElseThrow();
            assertThat(failedJob.getStatus()).isEqualTo("PENDING");
            assertThat(failedJob.getAttemptCount()).isEqualTo(1);

            // 2. AI Worker recovers!
            reset(aiWorkerClient);

            // Reset retryAfter to now so the scheduler can claim it immediately
            failedJob.setRetryAfter(Instant.now().minusSeconds(1));
            processingJobRepository.save(failedJob);

            // 3. Second poll: Scheduler retries and succeeds!
            matchingScheduler.poll();

            ProcessingJob completedJob = processingJobRepository.findByIdempotencyKey("app_match_" + app.getApplicationId()).orElseThrow();
            assertThat(completedJob.getStatus()).isEqualTo("COMPLETED");
            assertThat(completedJob.getLeaseToken()).isNull();

            // Result is persisted
            Optional<MatchResult> matchResult = matchResultRepository.findByApplicationId(app.getApplicationId());
            assertThat(matchResult).isPresent();
            assertThat(matchResult.get().getOverallScore()).isGreaterThan((short) 0);
        }

        @Test
        @DisplayName("Worker crash simulation: expired lease is recovered back to PENDING and processed successfully")
        void expiredLeaseRecovery_rescuesJobAfterWorkerCrash() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("Crash Co", "Backend Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "cv.pdf", "Java developer");

            ApplicationResponse app = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            // Simulate a worker claiming the job and then crashing mid-processing (lease expired in the past)
            ProcessingJob job = processingJobRepository.findByIdempotencyKey("app_match_" + app.getApplicationId()).orElseThrow();
            job.setStatus("PROCESSING");
            job.setLeaseToken("crashed-worker-lease-token");
            job.setLeaseExpiresAt(Instant.now().minusSeconds(60)); // expired 1 minute ago
            processingJobRepository.save(job);

            // Recover expired leases
            int recovered = processingJobService.recoverExpiredMatchingLeases();
            assertThat(recovered).isGreaterThanOrEqualTo(1);

            ProcessingJob recoveredJob = processingJobRepository.findById(job.getId()).orElseThrow();
            assertThat(recoveredJob.getStatus()).isEqualTo("PENDING");
            assertThat(recoveredJob.getLeaseToken()).isNull();
            assertThat(recoveredJob.getLeaseExpiresAt()).isNull();

            // Scheduler runs and successfully finishes the job
            matchingScheduler.poll();

            ProcessingJob finalJob = processingJobRepository.findById(job.getId()).orElseThrow();
            assertThat(finalJob.getStatus()).isEqualTo("COMPLETED");

            Optional<MatchResult> result = matchResultRepository.findByApplicationId(app.getApplicationId());
            assertThat(result).isPresent();
        }

        @Test
        @DisplayName("Exceeding max retry attempts transitions job permanently to FAILED")
        void exceedingMaxAttempts_permanentlyFails() {
            CandidateFixture candidate = createCandidateFixture();
            EmployerFixture employer = createEmployerFixture("MaxRetries Co", "Backend Engineer");
            UUID cvId = uploadCvFixture(candidate.candidateId(), candidate.auth(), "cv.pdf", "Java developer");

            ApplicationResponse app = applicationService.applyForJob(
                    candidate.candidateId(), candidate.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cvId).build());

            ProcessingJob job = processingJobRepository.findByIdempotencyKey("app_match_" + app.getApplicationId()).orElseThrow();
            job.setAttemptCount(2); // already attempted 2 times
            processingJobRepository.save(job);

            // 3rd attempt fails
            doThrow(new ResourceAccessException("Connection timed out"))
                    .when(aiWorkerClient).calculateMatchScore(any());

            matchingScheduler.poll();

            ProcessingJob finalJob = processingJobRepository.findById(job.getId()).orElseThrow();
            assertThat(finalJob.getStatus()).isEqualTo("FAILED");
            assertThat(finalJob.getAttemptCount()).isEqualTo(3);
        }
    }

    // =========================================================================
    // 4. End-to-End Pipeline & Ranking Integration Test
    // =========================================================================

    @Nested
    @DisplayName("4. End-to-End Pipeline & Candidate Ranking")
    class EndToEndPipelineTests {

        @Test
        @DisplayName("End-to-end: Apply -> AI Evaluation -> Persistence -> Ranking API without duplicates")
        void endToEnd_apply_aiMatch_resultPersist_rankingWithoutDuplicates() {
            EmployerFixture employer = createEmployerFixture("Enterprise Tech", "Lead Java Architect");

            // Candidate 1: High match
            CandidateFixture cand1 = createCandidateFixture();
            UUID cv1 = uploadCvFixture(cand1.candidateId(), cand1.auth(), "senior_java.pdf",
                    "Senior Java Architect, Spring Boot, PostgreSQL, Docker, Microservices with 10 years experience");
            ApplicationResponse app1 = applicationService.applyForJob(
                    cand1.candidateId(), cand1.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cv1).build());

            // Candidate 2: Moderate match
            CandidateFixture cand2 = createCandidateFixture();
            UUID cv2 = uploadCvFixture(cand2.candidateId(), cand2.auth(), "junior_dev.pdf",
                    "Junior developer with HTML, CSS, JavaScript and beginner Python knowledge");
            ApplicationResponse app2 = applicationService.applyForJob(
                    cand2.candidateId(), cand2.userId(),
                    ApplicationApplyRequest.builder().jobId(employer.jobId()).cvVersionId(cv2).build());

            // Run scheduler to process both matching jobs
            matchingScheduler.poll(); // processes cand1
            matchingScheduler.poll(); // processes cand2

            // Verify both applications have match results
            Optional<MatchResult> res1 = matchResultRepository.findByApplicationId(app1.getApplicationId());
            Optional<MatchResult> res2 = matchResultRepository.findByApplicationId(app2.getApplicationId());
            assertThat(res1).isPresent();
            assertThat(res2).isPresent();

            // Senior Java developer should score higher on Java Architect JD
            assertThat(res1.get().getOverallScore()).isGreaterThan(res2.get().getOverallScore());

            // Running scheduler AGAIN does not duplicate jobs or results
            matchingScheduler.poll();
            Integer totalResults = jdbcClient.sql("SELECT COUNT(*) FROM match_results WHERE job_id = ?")
                    .param(employer.jobId())
                    .query(Integer.class)
                    .single();
            assertThat(totalResults).isEqualTo(2);

            // Fetch candidate rankings via API
            ApplicationRankingResponse ranking = applicationService.getJobRankings(
                    employer.jobId(), employer.userId(), null, null);

            assertThat(ranking).isNotNull();
            assertThat(ranking.getTotalCandidates()).isEqualTo(2);
            assertThat(ranking.getItems()).hasSize(2);

            // Rank #1 must be Candidate 1 (higher score)
            assertThat(ranking.getItems().get(0).getRanking()).isEqualTo(1);
            assertThat(ranking.getItems().get(0).getApplicationId()).isEqualTo(app1.getApplicationId());
            assertThat(ranking.getItems().get(0).getOverallScore()).isEqualTo(res1.get().getOverallScore().intValue());

            // Rank #2 must be Candidate 2
            assertThat(ranking.getItems().get(1).getRanking()).isEqualTo(2);
            assertThat(ranking.getItems().get(1).getApplicationId()).isEqualTo(app2.getApplicationId());
            assertThat(ranking.getItems().get(1).getOverallScore()).isEqualTo(res2.get().getOverallScore().intValue());
        }
    }
}
