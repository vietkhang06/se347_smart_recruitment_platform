package com.matchajob.cv;

import com.matchajob.MatchaJobApplication;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingPersistenceService;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
class CvProcessingConcurrencyIT {
    @Autowired CvVersionRepository cvs;
    @Autowired CvRegistrationService registrations;
    @Autowired CvProcessingPersistenceService persistence;
    @Autowired ProcessingJobService jobs;
    @Autowired JdbcClient jdbc;
    @Autowired PlatformTransactionManager transactions;

    private UUID userId;
    private UUID candidateId;

    enum Selection { ACTIVATE_PROCESSING_VERSION, ACTIVATE_OTHER_VERSION, UPLOAD_NEW_VERSION }
    enum Outcome { SUCCESS, RETRYABLE_FAILURE, TERMINAL_FAILURE }

    static Stream<org.junit.jupiter.params.provider.Arguments> scenarios() {
        return Stream.of(Selection.values()).flatMap(selection -> Stream.of(Outcome.values())
                .map(outcome -> org.junit.jupiter.params.provider.Arguments.of(selection, outcome)));
    }

    @BeforeEach
    void createSyntheticCandidate() {
        userId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status)
                VALUES (?, ?, 'synthetic-hash', 'Concurrency Test', 'candidate', 'active')
                """).params(userId, "cv_race_" + userId + "@example.invalid").update();
        jdbc.sql("INSERT INTO candidate_profiles (id, user_id) VALUES (?, ?)")
                .params(candidateId, userId).update();
    }

    @AfterEach
    void removeOnlyThisTestsSyntheticRows() {
        if (candidateId == null) {
            return;
        }
        jdbc.sql("""
                DELETE FROM embeddings WHERE entity_type = 'cv_version'
                AND entity_id IN (SELECT id FROM cv_versions WHERE candidate_id = ?)
                """).param(candidateId).update();
        jdbc.sql("""
                DELETE FROM processing_jobs WHERE entity_type = 'cv_version'
                AND entity_id IN (SELECT id FROM cv_versions WHERE candidate_id = ?)
                """).param(candidateId).update();
        jdbc.sql("DELETE FROM cv_versions WHERE candidate_id = ?").param(candidateId).update();
        jdbc.sql("DELETE FROM candidate_profiles WHERE id = ?").param(candidateId).update();
        jdbc.sql("DELETE FROM users WHERE id = ?").param(userId).update();
    }

    @ParameterizedTest(name = "{0} while worker reports {1}")
    @MethodSource("scenarios")
    void processingMustNotRestoreAnOutdatedActiveSelection(Selection selection, Outcome outcome) throws Exception {
        var first = registerVersion();
        var second = registerVersion();
        var processing = selection == Selection.ACTIVATE_PROCESSING_VERSION ? first : second;
        UUID processingId = processing.cv().getId();
        String originalKey = processing.cv().getFilePath();
        String originalHash = processing.cv().getSha256Hash();
        var lease = jobs.startCvJob(processing.job()).orElseThrow();

        CountDownLatch snapshotLoaded = new CountDownLatch(1);
        CountDownLatch selectionCommitted = new CountDownLatch(1);
        var workerTransaction = new TransactionTemplate(transactions);
        workerTransaction.setTimeout(15);
        var executor = Executors.newSingleThreadExecutor();
        try {
            var worker = executor.submit(() -> workerTransaction.executeWithoutResult(transaction -> {
                // Keep an old managed entity in the worker's persistence context, as in the old read/save flow.
                var stale = cvs.findById(processingId).orElseThrow();
                assertThat(stale.isActive()).isEqualTo(selection != Selection.ACTIVATE_PROCESSING_VERSION);
                snapshotLoaded.countDown();
                awaitSelection(selectionCommitted);
                if (outcome == Outcome.SUCCESS) {
                    persistence.complete(processingId,
                            CVExtractResponse.builder().rawText("Synthetic Java CV")
                                    .parsedData(Map.of("skills", List.of("Java"))).build(),
                            EmbeddingsResponse.builder().embeddings(List.of(Collections.nCopies(1536, 0.1f)))
                                    .dimension(1536).build(), lease);
                } else {
                    persistence.fail(processingId, lease, "Synthetic worker failure",
                            outcome == Outcome.RETRYABLE_FAILURE);
                }
            }));
            assertThat(snapshotLoaded.await(10, TimeUnit.SECONDS)).isTrue();

            // The candidate change commits in a separate transaction before the worker continues.
            UUID selectedId = selection == Selection.UPLOAD_NEW_VERSION
                    ? registerVersion().cv().getId()
                    : registrations.activate(candidateId, first.cv().getId()).getId();
            selectionCommitted.countDown();
            worker.get(20, TimeUnit.SECONDS);

            assertThat(cvs.findByCandidateIdAndActiveTrue(candidateId).orElseThrow().getId()).isEqualTo(selectedId);
            assertThat(cvs.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream().filter(cv -> cv.isActive()))
                    .hasSize(1);
            var processed = cvs.findById(processingId).orElseThrow();
            assertThat(processed.getFilePath()).isEqualTo(originalKey);
            assertThat(processed.getSha256Hash()).isEqualTo(originalHash);
            assertThat(processed.getStatus()).isEqualTo(switch (outcome) {
                case SUCCESS -> "extracted";
                case RETRYABLE_FAILURE -> "uploaded";
                case TERMINAL_FAILURE -> "failed";
            });
            assertThat(jobs.getJob(lease.getId()).orElseThrow().getStatus()).isEqualTo(switch (outcome) {
                case SUCCESS -> "COMPLETED";
                case RETRYABLE_FAILURE -> "PENDING";
                case TERMINAL_FAILURE -> "FAILED";
            });
            int embeddingCount = jdbc.sql("SELECT COUNT(*) FROM embeddings WHERE entity_type = 'cv_version' AND entity_id = ?")
                    .param(processingId).query(Integer.class).single();
            assertThat(embeddingCount).isEqualTo(outcome == Outcome.SUCCESS ? 1 : 0);
        } finally {
            selectionCommitted.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private CvRegistrationService.RegistrationResult registerVersion() {
        // Metadata only: these tests call persistence directly, never store or parse personal files.
        return registrations.register(candidateId, new CvStorageService.StorageResult(
                "candidates/" + candidateId + "/" + UUID.randomUUID() + ".pdf",
                "synthetic.pdf", 20, "application/pdf", "a".repeat(64)));
    }

    private static void awaitSelection(CountDownLatch selectionCommitted) {
        try {
            if (!selectionCommitted.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Candidate selection did not commit in time.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Worker was interrupted.", e);
        }
    }
}
