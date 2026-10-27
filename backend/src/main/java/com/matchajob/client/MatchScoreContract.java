package com.matchajob.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.dto.MatchScoreResponse;
import java.util.Set;

/** Reject JSON coercions (e.g. "82", true, 82.7) before Jackson creates Java DTOs. */
public final class MatchScoreContract {
    private MatchScoreContract() { }
    public static MatchScoreResponse parse(JsonNode node) {
        Set<String> keys = Set.of("overall_score", "skills_score", "experience_score", "breakdown", "rationale");
        if (node == null || !node.isObject() || node.size() != keys.size()) fail("response fields");
        for (String key : keys) if (!node.has(key)) fail(key);
        for (String key : new String[]{"overall_score", "skills_score", "experience_score"}) {
            JsonNode score = node.get(key);
            if (score.isNull() && !key.equals("overall_score")) continue;
            if (!score.isIntegralNumber() || !score.canConvertToInt() || score.intValue() < 0 || score.intValue() > 100) fail(key);
        }
        if (!node.get("breakdown").isObject()) fail("breakdown");
        for (String key : new String[]{"required_skills_matched", "missing_skills", "required_skills", "matchedSkills", "missingSkills", "requiredSkills"}) {
            JsonNode list = node.get("breakdown").get(key);
            if (list == null) continue;
            if (!list.isArray()) fail("breakdown." + key);
            for (JsonNode item : list) if (!item.isTextual() || item.textValue().isBlank()) fail("breakdown." + key);
        }
        if (!node.get("rationale").isNull() && !node.get("rationale").isTextual()) fail("rationale");
        try { return new ObjectMapper().treeToValue(node, MatchScoreResponse.class); }
        catch (Exception ex) { throw new IllegalStateException("Invalid Worker matching response."); }
    }
    private static void fail(String field) { throw new IllegalStateException("Invalid Worker matching contract: " + field); }
}
