package com.matchajob.client.stub;

import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AiWorkerStub Unit Tests")
class AiWorkerStubTest {

    private AiWorkerStub stub;

    @BeforeEach
    void setUp() {
        stub = new AiWorkerStub();
    }

    @Test
    @DisplayName("extractCv produces deterministic parsed data and raw text")
    void extractCv_deterministicOutput() {
        byte[] pdfBytes = "Sample CV text for Nguyen Van A with Java experience".getBytes(StandardCharsets.UTF_8);
        CVExtractResponse response = stub.extractCv(pdfBytes, "my_cv.pdf");

        assertThat(response).isNotNull();
        assertThat(response.getRawText()).isEqualTo(new String(pdfBytes, StandardCharsets.UTF_8));
        assertThat(response.getPageCount()).isEqualTo(1);
        assertThat(response.getParsedData()).isNotNull();
        assertThat(response.getParsedData()).containsEntry("full_name", "Stub Candidate (my_cv.pdf)");
        assertThat(response.getParsedData()).containsKey("skills");
    }

    @Test
    @DisplayName("generateEmbeddings produces 1536-dim unit-normalized vectors")
    void generateEmbeddings_producesNormalizedVectors() {
        List<String> texts = List.of("Software Engineer Java Spring", "Frontend Developer React");
        EmbeddingsResponse response = stub.generateEmbeddings(texts);

        assertThat(response).isNotNull();
        assertThat(response.getDimension()).isEqualTo(1536);
        assertThat(response.getModel()).isEqualTo("stub-deterministic");
        assertThat(response.getEmbeddings()).hasSize(2);

        for (List<Float> vector : response.getEmbeddings()) {
            assertThat(vector).hasSize(1536);
            // Verify vector is normalized (magnitude close to 1.0)
            double sumSquares = 0.0;
            for (Float val : vector) {
                sumSquares += val * val;
            }
            assertThat(Math.sqrt(sumSquares)).isBetween(0.99, 1.01);
        }
    }

    @Test
    @DisplayName("calculateMatchScore gives high score when CV text contains required skills")
    void calculateMatchScore_highMatch() {
        MatchScoreRequest request = MatchScoreRequest.builder()
                .jobTitle("Senior Java Developer")
                .jobRequirements("Required: Java, Spring Boot, PostgreSQL, Docker, Microservices")
                .cvText("Experienced developer skilled in Java, Spring Boot, PostgreSQL, Docker with 5 years experience")
                .candidateSkills(List.of("Java", "Spring Boot", "PostgreSQL", "Docker"))
                .build();

        MatchScoreResponse response = stub.calculateMatchScore(request);

        assertThat(response).isNotNull();
        assertThat(response.getOverallScore()).isGreaterThanOrEqualTo(80);
        assertThat(response.getSkillsScore()).isGreaterThanOrEqualTo(80);
        assertThat(response.getExperienceScore()).isEqualTo(80);
        assertThat(response.getRationale()).contains("[Stub]");
        assertThat(response.getBreakdown()).containsKey("matched_skills");
    }

    @Test
    @DisplayName("calculateMatchScore gives low score when CV text does not match required skills")
    void calculateMatchScore_lowMatch() {
        MatchScoreRequest request = MatchScoreRequest.builder()
                .jobTitle("Python Data Scientist")
                .jobRequirements("Required: Python, FastApi, Redis, Kubernetes, Machine Learning")
                .cvText("Graphic designer with Photoshop and Illustrator knowledge")
                .candidateSkills(List.of("Design", "Photoshop"))
                .build();

        MatchScoreResponse response = stub.calculateMatchScore(request);

        assertThat(response).isNotNull();
        assertThat(response.getSkillsScore()).isLessThan(50);
        assertThat(response.getBreakdown()).isNotNull();
    }

    @Test
    @DisplayName("checkHealth reports healthy test status")
    void checkHealth_returnsHealthy() {
        Map<String, Object> health = stub.checkHealth();

        assertThat(health).containsEntry("status", "healthy");
        assertThat(health).containsEntry("service", "ai-worker-stub");
        assertThat(health).containsEntry("environment", "test");
    }
}
