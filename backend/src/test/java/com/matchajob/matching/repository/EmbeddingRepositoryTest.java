package com.matchajob.matching.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

@DisplayName("EmbeddingRepository Unit & Boundary Tests")
class EmbeddingRepositoryTest {

    private EmbeddingRepository repository;
    private JdbcClient mockJdbcClient;

    @BeforeEach
    void setUp() {
        mockJdbcClient = mock(JdbcClient.class);
        repository = new EmbeddingRepository(mockJdbcClient);
    }

    @Test
    @DisplayName("saveEmbedding rejects null or wrong-dimension vectors")
    void saveEmbedding_validatesDimension() {
        UUID id = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        assertThatThrownBy(() -> repository.saveEmbedding(id, "cv_version", entityId, 0, "test", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("dimension must be exactly 1536");

        List<Float> shortVector = new ArrayList<>(Collections.nCopies(512, 0.1f));
        assertThatThrownBy(() -> repository.saveEmbedding(id, "cv_version", entityId, 0, "test", shortVector))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("got 512");
    }

    @Test
    @DisplayName("saveEmbedding rejects invalid entity types")
    void saveEmbedding_validatesEntityType() {
        UUID id = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        List<Float> vector = new ArrayList<>(Collections.nCopies(1536, 0.05f));

        assertThatThrownBy(() -> repository.saveEmbedding(id, "unknown_type", entityId, 0, "test", vector))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported entity_type");
    }

    @ParameterizedTest(name = "Cosine distance {0} -> normalized score {1}")
    @CsvSource({
            "0.0, 100.0",   // Identical direction
            "0.5, 75.0",    // Close match
            "1.0, 50.0",    // Orthogonal
            "1.5, 25.0",    // Far
            "2.0, 0.0",     // Diametrically opposite
            "-0.1, 100.0",  // Negative clamp
            "2.5, 0.0"      // Over-distance clamp
    })
    @DisplayName("normalizeCosineDistance correctly maps [0, 2] to [0.0, 100.0]")
    void normalizeCosineDistance_bounds(double distance, double expectedScore) {
        double score = EmbeddingRepository.normalizeCosineDistance(distance);
        assertThat(score).isEqualTo(expectedScore);
    }

    @Test
    @DisplayName("normalizeCosineDistance handles null, NaN and infinite inputs safely")
    void normalizeCosineDistance_handlesEdgeCases() {
        assertThat(EmbeddingRepository.normalizeCosineDistance(null)).isEqualTo(0.0);
        assertThat(EmbeddingRepository.normalizeCosineDistance(Double.NaN)).isEqualTo(0.0);
        assertThat(EmbeddingRepository.normalizeCosineDistance(Double.POSITIVE_INFINITY)).isEqualTo(0.0);
        assertThat(EmbeddingRepository.normalizeCosineDistance(Double.NEGATIVE_INFINITY)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("computeCosineDistance computes accurate in-memory distance")
    void computeCosineDistance_inMemory() {
        // Parallel vectors -> distance = 0.0
        List<Float> v1 = List.of(1.0f, 0.0f, 0.0f);
        List<Float> v2 = List.of(2.0f, 0.0f, 0.0f);
        assertThat(EmbeddingRepository.computeCosineDistance(v1, v2)).isCloseTo(0.0, org.assertj.core.data.Offset.offset(0.0001));

        // Orthogonal vectors -> distance = 1.0
        List<Float> v3 = List.of(0.0f, 1.0f, 0.0f);
        assertThat(EmbeddingRepository.computeCosineDistance(v1, v3)).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.0001));

        // Opposite vectors -> distance = 2.0
        List<Float> v4 = List.of(-1.0f, 0.0f, 0.0f);
        assertThat(EmbeddingRepository.computeCosineDistance(v1, v4)).isCloseTo(2.0, org.assertj.core.data.Offset.offset(0.0001));
    }

    @Test
    @DisplayName("parseVector correctly parses string representation")
    void parseVector_parsesCorrectly() {
        List<Float> parsed = EmbeddingRepository.parseVector("[0.125, -0.5, 1.0]");
        assertThat(parsed).containsExactly(0.125f, -0.5f, 1.0f);

        assertThat(EmbeddingRepository.parseVector("")).isEmpty();
        assertThat(EmbeddingRepository.parseVector(null)).isEmpty();
    }

    @Test
    @DisplayName("deleteEmbedding validates entity type")
    void deleteEmbedding_validatesEntityType() {
        assertThatThrownBy(() -> repository.deleteEmbedding("invalid_type", UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported entity_type");
    }

    @Test
    @DisplayName("calculateCosineDistance validates entity types")
    void calculateCosineDistance_validatesEntityTypes() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        assertThatThrownBy(() -> repository.calculateCosineDistance("bad_type", id1, "job", id2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported entity_type");

        assertThatThrownBy(() -> repository.calculateCosineDistance("cv_version", id1, "bad_type", id2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported entity_type");
    }
}
