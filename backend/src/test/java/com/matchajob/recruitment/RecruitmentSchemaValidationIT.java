package com.matchajob.recruitment;

import com.matchajob.MatchaJobApplication;
import com.matchajob.api.recruitment.model.Application;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration Test for Recruitment Schema Validation against PostgreSQL.
 *
 * Verifies:
 * 1. Hibernate schema validation (ddl-auto: validate) for Job and Application entities.
 * 2. CRUD mapping, UUID generation, Instant, LocalDate, Short types via JobRepository and EntityManager.
 * 3. PostgreSQL physical constraints: CHECK constraints (salary range, work type, stage) and UNIQUE constraint (uq_application).
 *
 * Excluded from standard unit tests (mvn test).
 * Executed via integration profile: mvn verify -Pintegration-test (or -Dit.test=RecruitmentSchemaValidationIT).
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@Tag("integration")
class RecruitmentSchemaValidationIT {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcClient jdbcClient;

    // Track test-generated IDs for guaranteed cleanup
    private final List<UUID> createdApplicationIds = new ArrayList<>();
    private final List<UUID> createdJobIds = new ArrayList<>();
    private final List<UUID> createdProfileIds = new ArrayList<>();
    private final List<UUID> createdCompanyIds = new ArrayList<>();
    private final List<UUID> createdUserIds = new ArrayList<>();

    @AfterEach
    void cleanupTestData() {
        // Defensive cleanup in reverse foreign key dependency order
        for (UUID id : createdApplicationIds) {
            jdbcClient.sql("DELETE FROM applications WHERE id = ?").param(id).update();
        }
        for (UUID id : createdJobIds) {
            jdbcClient.sql("DELETE FROM jobs WHERE id = ?").param(id).update();
        }
        for (UUID id : createdProfileIds) {
            jdbcClient.sql("DELETE FROM candidate_profiles WHERE id = ?").param(id).update();
        }
        for (UUID id : createdCompanyIds) {
            jdbcClient.sql("DELETE FROM companies WHERE id = ?").param(id).update();
        }
        for (UUID id : createdUserIds) {
            jdbcClient.sql("DELETE FROM users WHERE id = ?").param(id).update();
        }
        createdApplicationIds.clear();
        createdJobIds.clear();
        createdProfileIds.clear();
        createdCompanyIds.clear();
        createdUserIds.clear();
    }

    @Test
    @DisplayName("1. Context loads with Hibernate ddl-auto: validate proving Job and Application entities match DDL V2")
    void contextLoads_provesHibernateSchemaValidation() {
        assertThat(jobRepository).isNotNull();
        assertThat(entityManager).isNotNull();
        assertThat(jdbcClient).isNotNull();

        // Verify entities exist in JPA metamodel
        assertThat(entityManager.getMetamodel().entity(Job.class)).isNotNull();
        assertThat(entityManager.getMetamodel().entity(Application.class)).isNotNull();
    }

    @Test
    @Transactional
    @DisplayName("2. JobRepository insert and read proves Job mapping, UUID generation, timestamps and constraints")
    void jobRepository_insertAndRead_verifiesJobMappingAndConstraints() {
        // Step 1: Create prerequisite employer user and company fixtures
        UUID employerId = createTestUser("employer");
        UUID companyId = createTestCompany(employerId);

        // Step 2: Build a Job entity adhering to DDL V2
        Job job = Job.builder()
                .companyId(companyId)
                .createdBy(employerId)
                .title("Senior Backend Engineer")
                .slug("senior-backend-engineer-" + UUID.randomUUID())
                .department("Engineering")
                .level("Senior")
                .workType("full_time")
                .location("Ho Chi Minh City")
                .address("123 Tech Park, Tan Binh")
                .mapLink("https://maps.example.com/techpark")
                .salaryMode("range")
                .salaryMin(35_000_000L)
                .salaryMax(55_000_000L)
                .salaryCurrency("VND")
                .experience("3-5 years")
                .description("<p>Looking for a Senior Backend Engineer...</p>")
                .requirements("<p>Strong Java, Spring Boot, PostgreSQL</p>")
                .benefits("<p>Health insurance, 13th month salary</p>")
                .status("pending")
                .deadline(LocalDate.now().plusMonths(2))
                .build();

        // Step 3: Save via JobRepository
        Job saved = jobRepository.save(job);
        createdJobIds.add(saved.getId());

        // Step 4: Verify generated ID and audit fields
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo("pending");
        assertThat(saved.getApplicantCount()).isEqualTo(0);
        assertThat(saved.getViewCount()).isEqualTo(0);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        // Step 5: Flush and clear session to ensure fresh SELECT from database
        entityManager.flush();
        entityManager.clear();

        // Step 6: Read back and assert all field mappings
        Optional<Job> foundOpt = jobRepository.findById(saved.getId());
        assertThat(foundOpt).isPresent();

        Job found = foundOpt.get();
        assertThat(found.getTitle()).isEqualTo("Senior Backend Engineer");
        assertThat(found.getCompanyId()).isEqualTo(companyId);
        assertThat(found.getCreatedBy()).isEqualTo(employerId);
        assertThat(found.getWorkType()).isEqualTo("full_time");
        assertThat(found.getSalaryMode()).isEqualTo("range");
        assertThat(found.getSalaryMin()).isEqualTo(35_000_000L);
        assertThat(found.getSalaryMax()).isEqualTo(55_000_000L);
        assertThat(found.getSalaryCurrency()).isEqualTo("VND");
        assertThat(found.getDeadline()).isEqualTo(LocalDate.now().plusMonths(2));
        assertThat(found.getCreatedAt()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    @Transactional
    @DisplayName("3. Application insert and read proves Application mapping, UUID, Short, and stage constraints")
    void application_insertAndRead_verifiesApplicationMappingAndConstraints() {
        // Step 1: Create prerequisite fixtures
        UUID employerId = createTestUser("employer");
        UUID companyId = createTestCompany(employerId);
        UUID candidateUserId = createTestUser("candidate");
        UUID profileId = createTestCandidateProfile(candidateUserId);

        // Step 2: Create a job
        Job job = Job.builder()
                .companyId(companyId)
                .createdBy(employerId)
                .title("Fullstack Developer")
                .workType("hybrid")
                .salaryMode("negotiable")
                .status("pending")
                .build();
        Job savedJob = jobRepository.save(job);
        createdJobIds.add(savedJob.getId());

        // Step 3: Persist an Application entity via EntityManager
        Application app = Application.builder()
                .candidateId(profileId)
                .jobId(savedJob.getId())
                .coverLetter("Excited to apply for the Fullstack position.")
                .cvSnapshotUrl("https://storage.matchajob.vn/cv/snapshot-123.pdf")
                .stage("new")
                .matchScore((short) 92)
                .build();

        entityManager.persist(app);
        entityManager.flush();
        createdApplicationIds.add(app.getId());

        // Step 4: Verify entity properties
        assertThat(app.getId()).isNotNull();
        assertThat(app.getAppliedAt()).isNotNull();
        assertThat(app.getUpdatedAt()).isNotNull();

        // Step 5: Flush and clear session
        entityManager.clear();

        // Step 6: Find and verify mapping
        Application found = entityManager.find(Application.class, app.getId());
        assertThat(found).isNotNull();
        assertThat(found.getCandidateId()).isEqualTo(profileId);
        assertThat(found.getJobId()).isEqualTo(savedJob.getId());
        assertThat(found.getStage()).isEqualTo("new");
        assertThat(found.getMatchScore()).isEqualTo((short) 92);
        assertThat(found.getCoverLetter()).isEqualTo("Excited to apply for the Fullstack position.");
    }

    @Test
    @DisplayName("4. Database constraints: verifies CHECK constraints on jobs and UNIQUE constraint on applications")
    void databaseConstraints_verifiesCheckAndUniqueConstraints() {
        UUID employerId = createTestUser("employer");
        UUID companyId = createTestCompany(employerId);
        UUID candidateUserId = createTestUser("candidate");
        UUID profileId = createTestCandidateProfile(candidateUserId);

        // Create a valid job
        UUID validJobId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO jobs (id, company_id, created_by, title, work_type, salary_mode, salary_min, salary_max)
            VALUES (?, ?, ?, 'Constraint Test Job', 'full_time', 'range', 20000000, 30000000)
        """).params(validJobId, companyId, employerId).update();
        createdJobIds.add(validJobId);

        // CHECK constraint: salary_max >= salary_min (violating with min > max)
        assertThatThrownBy(() -> {
            jdbcClient.sql("""
                INSERT INTO jobs (id, company_id, created_by, title, work_type, salary_mode, salary_min, salary_max)
                VALUES (?, ?, ?, 'Invalid Salary Job', 'full_time', 'range', 50000000, 20000000)
            """).params(UUID.randomUUID(), companyId, employerId).update();
        }).isInstanceOf(DataIntegrityViolationException.class);

        // CHECK constraint: work_type IN ('full_time', 'part_time', 'hybrid', 'remote', 'contract')
        assertThatThrownBy(() -> {
            jdbcClient.sql("""
                INSERT INTO jobs (id, company_id, created_by, title, work_type, salary_mode)
                VALUES (?, ?, ?, 'Invalid Work Type Job', 'freelance_unsupported', 'negotiable')
            """).params(UUID.randomUUID(), companyId, employerId).update();
        }).isInstanceOf(DataIntegrityViolationException.class);

        // CHECK constraint: stage IN ('new', 'screening', 'testing', 'interview', 'offer', 'rejected')
        assertThatThrownBy(() -> {
            jdbcClient.sql("""
                INSERT INTO applications (id, candidate_id, job_id, stage)
                VALUES (?, ?, ?, 'non_existent_stage')
            """).params(UUID.randomUUID(), profileId, validJobId).update();
        }).isInstanceOf(DataIntegrityViolationException.class);

        // Create one valid application
        UUID validAppId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO applications (id, candidate_id, job_id, stage)
            VALUES (?, ?, ?, 'new')
        """).params(validAppId, profileId, validJobId).update();
        createdApplicationIds.add(validAppId);

        // UNIQUE constraint: uq_application (candidate_id, job_id)
        assertThatThrownBy(() -> {
            jdbcClient.sql("""
                INSERT INTO applications (id, candidate_id, job_id, stage)
                VALUES (?, ?, ?, 'screening')
            """).params(UUID.randomUUID(), profileId, validJobId).update();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    // --- Helper fixture creation methods ---

    private UUID createTestUser(String role) {
        UUID userId = UUID.randomUUID();
        String uniqueEmail = "test-" + role + "-" + userId + "@matchajob-test.internal";
        jdbcClient.sql("""
            INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified)
            VALUES (?, ?, '$2a$10$dummyHashForTestingPurposesOnly1234567890', 'Test User', ?, 'active', true)
        """).params(userId, uniqueEmail, role).update();
        createdUserIds.add(userId);
        return userId;
    }

    private UUID createTestCompany(UUID ownerId) {
        UUID companyId = UUID.randomUUID();
        String companyName = "Test Corp " + companyId.toString().substring(0, 8);
        String uniqueTax = "TAX-" + companyId.toString().substring(0, 12);
        jdbcClient.sql("""
            INSERT INTO companies (id, owner_id, name, tax_code, is_verified)
            VALUES (?, ?, ?, ?, true)
        """).params(companyId, ownerId, companyName, uniqueTax).update();
        createdCompanyIds.add(companyId);
        return companyId;
    }

    private UUID createTestCandidateProfile(UUID userId) {
        UUID profileId = UUID.randomUUID();
        jdbcClient.sql("""
            INSERT INTO candidate_profiles (id, user_id, headline, ai_cv_score)
            VALUES (?, ?, 'Software Engineer', 90)
        """).params(profileId, userId).update();
        createdProfileIds.add(profileId);
        return profileId;
    }
}
