package com.matchajob.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.EmbeddingRepository;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("Hybrid Matching Score & Vector Similarity Tests")
class HybridMatchingScoreTest {

    private EmbeddingRepository embeddingRepository;
    private JobEmbeddingService jobEmbeddingService;
    private JobRepository jobRepository;
    private MatchingService matchingService;

    @BeforeEach
    void setUp() {
        embeddingRepository = mock(EmbeddingRepository.class);
        jobEmbeddingService = mock(JobEmbeddingService.class);
        jobRepository = mock(JobRepository.class);

        ObjectMapper objectMapper = new ObjectMapper();
        matchingService = new MatchingService(
                mock(CvVersionRepository.class),
                mock(MatchResultRepository.class),
                mock(AiWorkerClient.class),
                objectMapper,
                new MatchingResultMapper(objectMapper),
                mock(ApplicationRepository.class),
                mock(ApplicationCvSnapshotRepository.class),
                jobRepository,
                mock(ProcessingJobRepository.class),
                mock(MatchingPersistenceService.class),
                embeddingRepository,
                jobEmbeddingService
        );
    }

    @Test
    @DisplayName("integrateSemanticSimilarity fuses rule-based and semantic similarity scores (60% / 40%)")
    void integrateSemanticSimilarity_fusesScoresCorrectly() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        // Cosine distance = 0.40 -> normalized similarity score = (1 - 0.40 / 2) * 100 = 80.0
        when(embeddingRepository.hasEmbedding("job", jobId)).thenReturn(true);
        when(embeddingRepository.calculateCosineDistance("cv_version", cvId, "job", jobId))
                .thenReturn(Optional.of(0.40));

        // Base rule-based score = 70 (e.g. skills + experience)
        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(70)
                .skillsScore(80)
                .experienceScore(60)
                .breakdown(Map.of("required_skills", "Java, Docker"))
                .rationale("Candidate matched 4/5 skills.")
                .build();

        MatchScoreResponse hybrid = matchingService.integrateSemanticSimilarity(jobId, cvId, baseResponse);

        assertThat(hybrid).isNotNull();
        // Expected hybrid score: round(0.60 * 70 + 0.40 * 80.0) = round(42 + 32) = 74
        assertThat(hybrid.getOverallScore()).isEqualTo(74);
        assertThat(hybrid.getBreakdown()).containsEntry("scoring_mode", "hybrid");
        assertThat(hybrid.getBreakdown()).containsEntry("rule_score", 70);
        assertThat(hybrid.getBreakdown()).containsEntry("semantic_score", 80);
        assertThat(hybrid.getBreakdown()).containsEntry("semantic_similarity", 80.0);
        assertThat(hybrid.getRationale()).contains("Hybrid: rule 70% [60% wt], semantic 80% [40% wt] -> overall 74%");
    }

    @Test
    @DisplayName("integrateSemanticSimilarity boundary: distance 0.0 yields 100% semantic score")
    void integrateSemanticSimilarity_perfectSemanticMatch() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        when(embeddingRepository.hasEmbedding("job", jobId)).thenReturn(true);
        when(embeddingRepository.calculateCosineDistance("cv_version", cvId, "job", jobId))
                .thenReturn(Optional.of(0.0));

        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(100)
                .skillsScore(100)
                .experienceScore(100)
                .build();

        MatchScoreResponse hybrid = matchingService.integrateSemanticSimilarity(jobId, cvId, baseResponse);

        assertThat(hybrid.getOverallScore()).isEqualTo(100);
        assertThat(hybrid.getBreakdown()).containsEntry("semantic_score", 100);
    }

    @Test
    @DisplayName("integrateSemanticSimilarity fallback: when embedding is missing, falls back cleanly to rule-based score")
    void integrateSemanticSimilarity_fallbackWhenEmbeddingUnavailable() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        when(embeddingRepository.hasEmbedding("job", jobId)).thenReturn(false);
        when(embeddingRepository.calculateCosineDistance("cv_version", cvId, "job", jobId))
                .thenReturn(Optional.empty());

        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(65)
                .skillsScore(70)
                .experienceScore(60)
                .rationale("Rule-based evaluation.")
                .build();

        MatchScoreResponse fallback = matchingService.integrateSemanticSimilarity(jobId, cvId, baseResponse);

        assertThat(fallback).isNotNull();
        // Preserves rule score without fabricating arbitrary numbers or zeroing out
        assertThat(fallback.getOverallScore()).isEqualTo(65);
        assertThat(fallback.getBreakdown()).containsEntry("scoring_mode", "rule_based_fallback");
        assertThat(fallback.getBreakdown()).containsEntry("semantic_similarity", null);
        assertThat(fallback.getBreakdown()).containsEntry("semantic_score", null);
        assertThat(fallback.getBreakdown()).containsEntry("rule_score", 65);
    }

    @Test
    @DisplayName("integrateSemanticSimilarity handles database exception gracefully with fallback")
    void integrateSemanticSimilarity_handlesExceptionGracefully() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        when(embeddingRepository.hasEmbedding("job", jobId)).thenThrow(new RuntimeException("DB Timeout"));

        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(80)
                .skillsScore(80)
                .experienceScore(80)
                .build();

        MatchScoreResponse fallback = matchingService.integrateSemanticSimilarity(jobId, cvId, baseResponse);

        assertThat(fallback.getOverallScore()).isEqualTo(80);
        assertThat(fallback.getBreakdown()).containsEntry("scoring_mode", "rule_based_fallback");
    }

    @Test
    @DisplayName("Externalized MatchingScoringProperties via 13-arg constructor controls hybrid calculation and breakdown")
    void externalizedScoringProperties_controlsHybridCalculationAndMetadata() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        MatchingScoringProperties customProps = new MatchingScoringProperties(
                "v1.1-custom-70-30",
                "hybrid-custom-test",
                0.70,
                0.30,
                65
        );
        customProps.setReviewThreshold(45);
        customProps.validate();

        ObjectMapper objectMapper = new ObjectMapper();
        MatchingService customService = new MatchingService(
                mock(CvVersionRepository.class),
                mock(MatchResultRepository.class),
                mock(AiWorkerClient.class),
                objectMapper,
                new MatchingResultMapper(objectMapper),
                mock(ApplicationRepository.class),
                mock(ApplicationCvSnapshotRepository.class),
                jobRepository,
                mock(ProcessingJobRepository.class),
                mock(MatchingPersistenceService.class),
                embeddingRepository,
                jobEmbeddingService,
                customProps
        );

        // Cosine distance = 1.0 -> normalized similarity score = 50.0
        when(embeddingRepository.hasEmbedding("job", jobId)).thenReturn(true);
        when(embeddingRepository.calculateCosineDistance("cv_version", cvId, "job", jobId))
                .thenReturn(Optional.of(1.0));

        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(80)
                .skillsScore(80)
                .experienceScore(80)
                .rationale("Rule score 80.")
                .build();

        MatchScoreResponse hybrid = customService.integrateSemanticSimilarity(jobId, cvId, baseResponse);

        // Expected: round(0.70 * 80 + 0.30 * 50) = round(56 + 15) = 71
        assertThat(hybrid.getOverallScore()).isEqualTo(71);
        assertThat(hybrid.getBreakdown())
                .containsEntry("config_version", "v1.1-custom-70-30")
                .containsEntry("algorithm_id", "hybrid-custom-test")
                .containsEntry("rule_weight", 0.70)
                .containsEntry("semantic_weight", 0.30)
                .containsEntry("shortlist_threshold", 65)
                .containsEntry("review_threshold", 45);
    }

    @Test
    @DisplayName("Pure rule-based baseline properties (1.0 / 0.0) output exact rule score")
    void pureRuleBaselineProperties_outputsPureRuleScore() {
        UUID jobId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        MatchingScoringProperties baselineProps = new MatchingScoringProperties(
                "v1.0-rule-baseline",
                "rule-only-v1",
                1.0,
                0.0,
                70
        );

        ObjectMapper objectMapper = new ObjectMapper();
        MatchingService baselineService = new MatchingService(
                mock(CvVersionRepository.class),
                mock(MatchResultRepository.class),
                mock(AiWorkerClient.class),
                objectMapper,
                new MatchingResultMapper(objectMapper),
                mock(ApplicationRepository.class),
                mock(ApplicationCvSnapshotRepository.class),
                jobRepository,
                mock(ProcessingJobRepository.class),
                mock(MatchingPersistenceService.class),
                embeddingRepository,
                jobEmbeddingService,
                baselineProps
        );

        when(embeddingRepository.hasEmbedding("job", jobId)).thenReturn(true);
        when(embeddingRepository.calculateCosineDistance("cv_version", cvId, "job", jobId))
                .thenReturn(Optional.of(1.8)); // low semantic score (10.0), ignored due to 0.0 weight

        MatchScoreResponse baseResponse = MatchScoreResponse.builder()
                .overallScore(76)
                .skillsScore(80)
                .experienceScore(70)
                .build();

        MatchScoreResponse result = baselineService.integrateSemanticSimilarity(jobId, cvId, baseResponse);
        assertThat(result.getOverallScore()).isEqualTo(76);
        assertThat(result.getBreakdown()).containsEntry("config_version", "v1.0-rule-baseline");
    }

    @Test
    @DisplayName("MatchingScoringProperties.validate rejects NaN, Infinity, invalid ranges, sum mismatch, and bad thresholds")
    void scoringPropertiesValidation_rejectsInvalidConfigs() {
        assertThatThrownBy(() -> new MatchingScoringProperties("v1", "alg", Double.NaN, 0.4, 70))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("finite");

        assertThatThrownBy(() -> new MatchingScoringProperties("v1", "alg", Double.POSITIVE_INFINITY, 0.4, 70))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("finite");

        assertThatThrownBy(() -> new MatchingScoringProperties("v1", "alg", -0.1, 1.1, 70))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> new MatchingScoringProperties("v1", "alg", 0.5, 0.3, 70))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sum to 1.0");

        assertThatThrownBy(() -> new MatchingScoringProperties("v1", "alg", 0.6, 0.4, 105))
                .isInstanceOf(IllegalArgumentException.class);

        MatchingScoringProperties invalidReview = new MatchingScoringProperties();
        invalidReview.setShortlistThreshold(60);
        invalidReview.setReviewThreshold(75);
        assertThatThrownBy(invalidReview::validate)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("reviewThreshold");
    }
}
