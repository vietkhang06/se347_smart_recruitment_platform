package com.matchajob.matching.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingResultMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MatchingResultMapperTest {

    private MatchingResultMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new MatchingResultMapper(new ObjectMapper());
    }

    @Test
    void normalizesAiWorkerSkillKeysToPublicCamelCaseContract() {
        MatchScoreResponse aiResponse = MatchScoreResponse.builder()
                .overallScore(82)
                .skillsScore(78)
                .experienceScore(88)
                .breakdown(Map.of(
                        "required_skills_matched", List.of("Java", "Spring Boot"),
                        "missing_skills", List.of("Kubernetes"),
                        "candidate_experience_years", 4))
                .rationale("Skill and experience fit.")
                .build();

        Map<String, Object> normalized = mapper.normalizeBreakdown(aiResponse);

        assertThat(normalized.get("requiredSkills")).isEqualTo(List.of("Java", "Spring Boot", "Kubernetes"));
        assertThat(normalized.get("matchedSkills")).isEqualTo(List.of("Java", "Spring Boot"));
        assertThat(normalized.get("missingSkills")).isEqualTo(List.of("Kubernetes"));
    }

    @Test
    void mapsPersistedResultToPublicDtoAndDoesNotExposeScoresAsStrings() {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID cvVersionId = UUID.randomUUID();
        MatchResult entity = MatchResult.builder()
                .id(UUID.randomUUID())
                .applicationId(applicationId)
                .jobId(jobId)
                .cvVersionId(cvVersionId)
                .overallScore((short) 82)
                .skillsScore((short) 78)
                .experienceScore((short) 88)
                .breakdown("{\"requiredSkills\":[\"Java\",\"Kubernetes\"],\"matchedSkills\":[\"Java\"]}")
                .rationale("Java matched; Kubernetes missing.")
                .createdAt(Instant.parse("2026-10-18T10:00:00Z"))
                .build();

        MatchingResultResponse result = mapper.fromEntity(entity);

        assertThat(result.getApplicationId()).isEqualTo(applicationId);
        assertThat(result.getJobId()).isEqualTo(jobId);
        assertThat(result.getCvVersionId()).isEqualTo(cvVersionId);
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getOverallScore()).isEqualTo(82);
        assertThat(result.getCriteriaScores()).containsEntry("skills", 78).containsEntry("experience", 88);
        assertThat(result.getMatchedSkills()).containsExactly("Java");
        assertThat(result.getMissingSkills()).containsExactly("Kubernetes");
        assertThat(result.getExplanation()).isEqualTo("Java matched; Kubernetes missing.");
        assertThat(result.getEvaluatedAt()).isEqualTo(entity.getCreatedAt());
    }

    @Test
    void doesNotInventMissingSkillsWhenOnlyRequiredSkillsAreKnown() {
        MatchScoreResponse aiResponse = MatchScoreResponse.builder()
                .breakdown(Map.of("required_skills", List.of("Java", "Kubernetes")))
                .build();

        Map<String, Object> normalized = mapper.normalizeBreakdown(aiResponse);

        assertThat(normalized.get("requiredSkills")).isEqualTo(List.of("Java", "Kubernetes"));
        assertThat(normalized.get("matchedSkills")).isEqualTo(List.of());
        assertThat(normalized.get("missingSkills")).isEqualTo(List.of());
    }

    @Test
    void doesNotInventMatchedSkillsFromRequiredAndMissingLists() {
        MatchScoreResponse aiResponse = MatchScoreResponse.builder()
                .breakdown(Map.of(
                        "required_skills", List.of("Java", "Kubernetes"),
                        "missing_skills", List.of("Kubernetes")))
                .build();

        Map<String, Object> normalized = mapper.normalizeBreakdown(aiResponse);

        assertThat(normalized.get("matchedSkills")).isEqualTo(List.of());
        assertThat(normalized.get("missingSkills")).isEqualTo(List.of("Kubernetes"));
    }

    @Test
    void malformedPersistedBreakdownDoesNotCrashOrInventSkillLists() {
        MatchResult entity = MatchResult.builder()
                .applicationId(UUID.randomUUID())
                .jobId(UUID.randomUUID())
                .cvVersionId(UUID.randomUUID())
                .overallScore((short) 70)
                .breakdown("not-json")
                .createdAt(Instant.parse("2026-10-18T10:00:00Z"))
                .build();

        MatchingResultResponse result = mapper.fromEntity(entity);

        assertThat(result.getBreakdown()).containsEntry("requiredSkills", List.of());
        assertThat(result.getMatchedSkills()).isEmpty();
        assertThat(result.getMissingSkills()).isEmpty();
    }
}
