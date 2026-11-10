package com.matchajob.matching;

import com.matchajob.application.dto.ApplicationRankingItem;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.client.stub.AiWorkerStub;
import com.matchajob.matching.repository.EmbeddingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Expected Ranking Fixture Tests (Genuine Matching & Semantic Disambiguation)")
class ExpectedRankingFixtureTest {

    private AiWorkerStub aiWorkerStub;

    @BeforeEach
    void setUp() {
        aiWorkerStub = new AiWorkerStub();
    }

    @Test
    @DisplayName("Expected ranking: Strong match candidate outranks partial match, and unrelated candidate ranks lowest")
    void expectedRanking_strongCandidateOutranksWeakAndUnrelated() {
        String jobTitle = "Senior Java Developer";
        String jobRequirements = "Requires Java, Spring Boot, PostgreSQL, Docker, Microservices with 4 years experience";

        // Candidate 1: Strong Match (Java, Spring Boot, PostgreSQL, Docker, Microservices)
        String cvStrong = "Senior Backend Engineer with 5 years experience in Java, Spring Boot, PostgreSQL, Docker, and Microservices.";
        List<String> skillsStrong = List.of("Java", "Spring Boot", "PostgreSQL", "Docker", "Microservices");

        // Candidate 2: Partial Match (Java, React, 2 years experience; missing Docker, Postgres, Microservices)
        String cvPartial = "Junior Developer with 2 years experience in Java, HTML, CSS, React.";
        List<String> skillsPartial = List.of("Java", "React", "HTML", "CSS");

        // Candidate 3: Unrelated (Graphic designer with Figma, Photoshop)
        String cvUnrelated = "Graphic Designer with 4 years experience in Figma, Photoshop, Adobe Illustrator, UI Design.";
        List<String> skillsUnrelated = List.of("Figma", "Photoshop", "Illustrator");

        // 1. Calculate rule-based scores via deterministic stub
        MatchScoreResponse scoreStrong = aiWorkerStub.calculateMatchScore(MatchScoreRequest.builder()
                .jobTitle(jobTitle).jobRequirements(jobRequirements).cvText(cvStrong).candidateSkills(skillsStrong).build());
        MatchScoreResponse scorePartial = aiWorkerStub.calculateMatchScore(MatchScoreRequest.builder()
                .jobTitle(jobTitle).jobRequirements(jobRequirements).cvText(cvPartial).candidateSkills(skillsPartial).build());
        MatchScoreResponse scoreUnrelated = aiWorkerStub.calculateMatchScore(MatchScoreRequest.builder()
                .jobTitle(jobTitle).jobRequirements(jobRequirements).cvText(cvUnrelated).candidateSkills(skillsUnrelated).build());

        // 2. Generate embeddings via deterministic generator
        List<List<Float>> embeddings = aiWorkerStub.generateEmbeddings(List.of(
                jobTitle + " " + jobRequirements,
                cvStrong,
                cvPartial,
                cvUnrelated
        )).getEmbeddings();

        List<Float> jdVec = embeddings.get(0);
        List<Float> strongVec = embeddings.get(1);
        List<Float> partialVec = embeddings.get(2);
        List<Float> unrelatedVec = embeddings.get(3);

        // 3. Compute cosine distances and normalize to [0, 100]
        double distStrong = EmbeddingRepository.computeCosineDistance(jdVec, strongVec);
        double distPartial = EmbeddingRepository.computeCosineDistance(jdVec, partialVec);
        double distUnrelated = EmbeddingRepository.computeCosineDistance(jdVec, unrelatedVec);

        double semScoreStrong = EmbeddingRepository.normalizeCosineDistance(distStrong);
        double semScorePartial = EmbeddingRepository.normalizeCosineDistance(distPartial);
        double semScoreUnrelated = EmbeddingRepository.normalizeCosineDistance(distUnrelated);

        // 4. Compute hybrid overall scores (60% rule-based + 40% semantic similarity)
        int overallStrong = (int) Math.round(0.60 * scoreStrong.getOverallScore() + 0.40 * semScoreStrong);
        int overallPartial = (int) Math.round(0.60 * scorePartial.getOverallScore() + 0.40 * semScorePartial);
        int overallUnrelated = (int) Math.round(0.60 * scoreUnrelated.getOverallScore() + 0.40 * semScoreUnrelated);

        // Assertions on score progression
        assertThat(scoreStrong.getOverallScore())
                .as("Strong candidate rule score should exceed partial match")
                .isGreaterThan(scorePartial.getOverallScore());

        assertThat(scorePartial.getOverallScore())
                .as("Partial candidate rule score should exceed unrelated candidate")
                .isGreaterThan(scoreUnrelated.getOverallScore());

        assertThat(overallStrong)
                .as("Strong candidate hybrid score should exceed partial candidate")
                .isGreaterThan(overallPartial);

        assertThat(overallPartial)
                .as("Partial candidate hybrid score should exceed unrelated candidate")
                .isGreaterThan(overallUnrelated);

        // 5. Batch ranking simulation
        Instant now = Instant.now();
        List<ApplicationRankingItem> items = new ArrayList<>(List.of(
                ApplicationRankingItem.builder()
                        .applicationId(UUID.fromString("00000000-0000-0000-0000-000000000003"))
                        .candidateName("Unrelated Candidate")
                        .overallScore(overallUnrelated)
                        .appliedAt(now.minusSeconds(300))
                        .build(),
                ApplicationRankingItem.builder()
                        .applicationId(UUID.fromString("00000000-0000-0000-0000-000000000002"))
                        .candidateName("Partial Candidate")
                        .overallScore(overallPartial)
                        .appliedAt(now.minusSeconds(200))
                        .build(),
                ApplicationRankingItem.builder()
                        .applicationId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                        .candidateName("Strong Candidate")
                        .overallScore(overallStrong)
                        .appliedAt(now.minusSeconds(100))
                        .build()
        ));

        // Sort: overallScore DESC NULLS LAST, applied_at ASC, a.id ASC
        items.sort(Comparator.comparing(ApplicationRankingItem::getOverallScore, Comparator.reverseOrder())
                .thenComparing(ApplicationRankingItem::getAppliedAt)
                .thenComparing(ApplicationRankingItem::getApplicationId));

        for (int i = 0; i < items.size(); i++) {
            items.get(i).setRanking(i + 1);
        }

        // Verify rank assignments
        assertThat(items.get(0).getCandidateName()).isEqualTo("Strong Candidate");
        assertThat(items.get(0).getRanking()).isEqualTo(1);

        assertThat(items.get(1).getCandidateName()).isEqualTo("Partial Candidate");
        assertThat(items.get(1).getRanking()).isEqualTo(2);

        assertThat(items.get(2).getCandidateName()).isEqualTo("Unrelated Candidate");
        assertThat(items.get(2).getRanking()).isEqualTo(3);
    }

    @Test
    @DisplayName("Batch ranking produces identical repeatable results across multiple invocations")
    void batchRanking_isRepeatable() {
        List<ApplicationRankingItem> batch1 = new ArrayList<>(List.of(
                ApplicationRankingItem.builder().applicationId(UUID.randomUUID()).candidateName("A").overallScore(85).build(),
                ApplicationRankingItem.builder().applicationId(UUID.randomUUID()).candidateName("B").overallScore(72).build()
        ));
        List<ApplicationRankingItem> batch2 = new ArrayList<>(batch1);

        Comparator<ApplicationRankingItem> comp = Comparator.comparing(
                ApplicationRankingItem::getOverallScore, Comparator.nullsLast(Comparator.reverseOrder()));

        batch1.sort(comp);
        batch2.sort(comp);

        assertThat(batch1.get(0).getCandidateName()).isEqualTo(batch2.get(0).getCandidateName());
        assertThat(batch1.get(1).getCandidateName()).isEqualTo(batch2.get(1).getCandidateName());
    }
}
