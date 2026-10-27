package com.matchajob.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.service.MatchingResultMapper;
import com.matchajob.matching.dto.MatchingResultResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MatchScoreContractTest {
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    @Test
    void rejectsCoercedAndOutOfRangeWorkerScores() throws Exception {
        String valid = Files.readString(Path.of("../docs/contracts/fixtures/ai-match-score-response.json"));
        for (String invalid : List.of("\"82\"", "true", "82.5", "101", "-1", "null")) {
            var node = json.readTree(valid).deepCopy();
            ((com.fasterxml.jackson.databind.node.ObjectNode) node).set("overall_score", json.readTree(invalid));
            assertThatThrownBy(() -> MatchScoreContract.parse(node)).isInstanceOf(IllegalStateException.class);
        }
    }
    @Test
    void exportsActualJavaSerializedResponsesForCrossLanguageValidation() throws Exception {
        var worker = MatchScoreContract.parse(json.readTree(Files.readString(Path.of("../docs/contracts/fixtures/ai-match-score-response.json"))));
        MatchingResultMapper mapper = new MatchingResultMapper(json);
        UUID application = UUID.fromString("77777777-7777-4777-8777-777777777777");
        UUID job = UUID.fromString("22222222-2222-4222-8222-222222222222");
        UUID cv = UUID.fromString("55555555-5555-4555-8555-555555555555");
        var entity = MatchResult.builder().applicationId(application).jobId(job).cvVersionId(cv)
                .overallScore(worker.getOverallScore().shortValue()).skillsScore(worker.getSkillsScore().shortValue())
                .experienceScore(worker.getExperienceScore().shortValue()).breakdown(mapper.serializeBreakdown(worker))
                .rationale(worker.getRationale()).createdAt(Instant.parse("2026-10-18T10:00:00Z")).build();
        Path out = Path.of("target/matching-contract"); Files.createDirectories(out);
        json.writer().without(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS).writeValue(out.resolve("completed.json").toFile(), mapper.fromEntity(entity));
        var pending = MatchingResultResponse.builder().applicationId(application).jobId(job).cvVersionId(cv).status("PENDING")
                .criteriaScores(Map.of()).matchedSkills(List.of()).missingSkills(List.of()).breakdown(Map.of())
                .processingJobId(UUID.randomUUID()).message("Matching queued").retryable(true).attemptCount(0).maxAttempts(3).build();
        json.writer().without(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS).writeValue(out.resolve("pending.json").toFile(), pending);
        assertThat(mapper.fromEntity(entity).getMatchedSkills()).isNotEmpty();
    }
}
