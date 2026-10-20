package com.matchajob.cv;

import com.matchajob.MatchaJobApplication;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.repository.CvVersionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@Transactional
class CvStorageIT {
    @Autowired CvController controller;
    @Autowired CvVersionRepository cvs;
    @Autowired JdbcClient jdbc;
    @Autowired javax.sql.DataSource dataSource;

    @Test
    void uploadListActivateAndDownloadPreserveBothVersions() throws Exception {
        UUID userId = user("candidate"), candidateId = candidate(userId);
        Authentication auth = auth(userId, "CANDIDATE");
        var first = controller.uploadCv(candidateId, auth, pdf("first"), false).getBody();
        var second = controller.uploadCv(candidateId, auth, pdf("second"), false).getBody();
        assertThat(first.cvVersionId()).isNotEqualTo(second.cvVersionId());
        assertThat(controller.getActiveCv(candidateId, auth).id()).isEqualTo(second.cvVersionId());
        var versions = controller.listCandidateCvs(candidateId, auth);
        assertThat(versions).hasSize(2);
        assertThat(versions.stream().filter(v -> v.active())).hasSize(1);
        controller.activateCv(candidateId, first.cvVersionId(), auth);
        assertThat(controller.getActiveCv(candidateId, auth).id()).isEqualTo(first.cvVersionId());
        assertThat(controller.downloadCv(candidateId, second.cvVersionId(), auth, "inline")
                .getBody().getInputStream()).hasBinaryContent(pdf("second").getBytes());
        assertThat(cvs.findById(first.cvVersionId()).orElseThrow().getFilePath())
                .isNotEqualTo(cvs.findById(second.cvVersionId()).orElseThrow().getFilePath());
    }

    @Test
    void employerCannotReadUnsubmittedVersionAndAdminReadIsAudited() throws Exception {
        UUID ownerId = user("candidate"), candidateId = candidate(ownerId), employerId = user("employer");
        Authentication owner = auth(ownerId, "CANDIDATE"), employer = auth(employerId, "EMPLOYER");
        var submitted = controller.uploadCv(candidateId, owner, pdf("submitted"), false).getBody().cvVersionId();
        var privateCv = controller.uploadCv(candidateId, owner, pdf("private"), false).getBody().cvVersionId();
        UUID companyId = UUID.randomUUID(), jobId = UUID.randomUUID(), applicationId = UUID.randomUUID();
        jdbc.sql("INSERT INTO companies (id, owner_id, name) VALUES (?, ?, 'Synthetic Company')").params(companyId, employerId).update();
        jdbc.sql("INSERT INTO jobs (id, company_id, created_by, title, work_type, salary_mode) VALUES (?, ?, ?, 'Synthetic Job', 'full_time', 'negotiable')")
                .params(jobId, companyId, employerId).update();
        jdbc.sql("INSERT INTO applications (id, candidate_id, job_id) VALUES (?, ?, ?)").params(applicationId, candidateId, jobId).update();
        jdbc.sql("INSERT INTO application_cv_snapshots (application_id, cv_version_id) VALUES (?, ?)").params(applicationId, submitted).update();
        assertThat(controller.downloadCv(candidateId, submitted, employer, "attachment").getStatusCode().value()).isEqualTo(200);
        assertThatThrownBy(() -> controller.downloadCv(candidateId, privateCv, employer, "attachment"))
                .isInstanceOf(AccessDeniedException.class);
        UUID outsider = user("candidate"); candidate(outsider);
        assertThatThrownBy(() -> controller.getCvVersion(candidateId, submitted, auth(outsider, "CANDIDATE")))
                .isInstanceOf(AccessDeniedException.class);

        UUID adminId = user("admin");
        controller.downloadCv(candidateId, privateCv, auth(adminId, "ADMIN"), "inline");
        assertThat(jdbc.sql("SELECT COUNT(*) FROM audit_logs WHERE actor_id = ? AND target_id = ? AND action = 'PREVIEW_CV'")
                .params(adminId, privateCv.toString()).query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT cv_version_id FROM application_cv_snapshots WHERE application_id = ?")
                .param(applicationId).query(UUID.class).single()).isEqualTo(submitted);
    }

    @Test
    void migrationBackfillsLatestLegacyVersionAndEnforcesUniqueActiveCandidate() throws Exception {
        // Exercise the actual V6 script against legacy rows in a rolled-back, isolated schema.
        String schema = "cv_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute("CREATE SCHEMA " + schema);
                statement.execute("SET LOCAL search_path TO " + schema);
                statement.execute("CREATE TABLE cv_versions (id UUID PRIMARY KEY, candidate_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL)");
                UUID candidateId = UUID.randomUUID(), oldId = UUID.randomUUID(), newId = UUID.randomUUID();
                try (var insert = connection.prepareStatement("INSERT INTO cv_versions VALUES (?, ?, ?::timestamptz)")) {
                    insert.setObject(1, oldId); insert.setObject(2, candidateId); insert.setString(3, "2026-10-01T00:00:00Z"); insert.executeUpdate();
                    insert.setObject(1, newId); insert.setString(3, "2026-10-02T00:00:00Z"); insert.executeUpdate();
                }
                new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
                        new org.springframework.core.io.ClassPathResource("db/migration/V6__cv_active_version.sql")).populate(connection);
                try (var result = statement.executeQuery("SELECT id FROM cv_versions WHERE is_active")) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getObject(1, UUID.class)).isEqualTo(newId);
                    assertThat(result.next()).isFalse();
                }
                assertThatThrownBy(() -> statement.execute("UPDATE cv_versions SET is_active = true"))
                        .isInstanceOf(java.sql.SQLException.class)
                        .satisfies(error -> assertThat(((java.sql.SQLException) error).getSQLState()).isEqualTo("23505"));
            } finally { connection.rollback(); }
        }
    }

    private UUID user(String role) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?, ?, 'hash', 'Synthetic User', ?, 'active')")
                .params(id, "cv_" + id + "@example.invalid", role).update();
        return id;
    }
    private UUID candidate(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO candidate_profiles (id, user_id) VALUES (?, ?)").params(id, userId).update();
        return id;
    }
    private Authentication auth(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
    private MockMultipartFile pdf(String text) {
        return new MockMultipartFile("file", text + ".pdf", "application/pdf", ("%PDF-1.4 " + text).getBytes(StandardCharsets.UTF_8));
    }
}
