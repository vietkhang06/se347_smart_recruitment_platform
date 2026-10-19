package com.matchajob.matching.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.matching.dto.MatchingResultResponse;
import com.matchajob.matching.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Maps AI Worker/DB representations to the public Matching Result contract. */
@Component
public class MatchingResultMapper {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final ObjectMapper objectMapper;

    public MatchingResultMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> normalizeBreakdown(MatchScoreResponse response) {
        Map<String, Object> breakdown = new LinkedHashMap<>();
        if (response != null && response.getBreakdown() != null) {
            breakdown.putAll(response.getBreakdown());
        }

        boolean hasMatched = hasList(breakdown,
                "matchedSkills", "matched_skills", "required_skills_matched", "requiredSkillsMatched", "matched");
        boolean hasMissing = hasList(breakdown,
                "missingSkills", "missing_skills", "required_skills_missing", "requiredSkillsMissing");
        boolean hasRequired = hasList(breakdown,
                "requiredSkills", "required_skills", "required_skills_list");
        List<String> matched = firstList(breakdown,
                "matchedSkills", "matched_skills", "required_skills_matched", "requiredSkillsMatched", "matched");
        List<String> missing = firstList(breakdown,
                "missingSkills", "missing_skills", "required_skills_missing", "requiredSkillsMissing");
        List<String> required = firstList(breakdown,
                "requiredSkills", "required_skills", "required_skills_list");

        if (!hasRequired && (hasMatched || hasMissing)) {
            Set<String> combined = new LinkedHashSet<>();
            combined.addAll(matched);
            combined.addAll(missing);
            required = new ArrayList<>(combined);
        }
        if (!hasMissing && hasRequired && hasMatched && !required.isEmpty()) {
            Set<String> matchedLower = new LinkedHashSet<>();
            matched.forEach(skill -> matchedLower.add(skill.toLowerCase(Locale.ROOT)));
            missing = required.stream()
                    .filter(skill -> !matchedLower.contains(skill.toLowerCase(Locale.ROOT)))
                    .toList();
        }

        breakdown.put("requiredSkills", required);
        breakdown.put("matchedSkills", matched);
        breakdown.put("missingSkills", missing);
        return breakdown;
    }

    public MatchingResultResponse fromEntity(MatchResult entity) {
        Map<String, Object> breakdown = readBreakdown(entity.getBreakdown());
        boolean hasMatched = hasList(breakdown,
                "matchedSkills", "matched_skills", "required_skills_matched", "matchedSkills");
        boolean hasMissing = hasList(breakdown,
                "missingSkills", "missing_skills", "required_skills_missing");
        boolean hasRequired = hasList(breakdown, "requiredSkills", "required_skills");
        List<String> matched = firstList(breakdown,
                "matchedSkills", "matched_skills", "required_skills_matched", "matchedSkills");
        List<String> missing = firstList(breakdown,
                "missingSkills", "missing_skills", "required_skills_missing");
        List<String> required = firstList(breakdown, "requiredSkills", "required_skills");
        if (!hasRequired && (hasMatched || hasMissing)) {
            Set<String> all = new LinkedHashSet<>();
            all.addAll(matched);
            all.addAll(missing);
            required = new ArrayList<>(all);
        }
        if (!hasMissing && hasRequired && hasMatched && !required.isEmpty()) {
            Set<String> matchedLower = new LinkedHashSet<>();
            matched.forEach(skill -> matchedLower.add(skill.toLowerCase(Locale.ROOT)));
            missing = required.stream()
                    .filter(skill -> !matchedLower.contains(skill.toLowerCase(Locale.ROOT)))
                    .toList();
        }
        breakdown.put("requiredSkills", required);
        breakdown.put("matchedSkills", matched);
        breakdown.put("missingSkills", missing);

        Map<String, Integer> criteriaScores = new LinkedHashMap<>();
        if (entity.getSkillsScore() != null) criteriaScores.put("skills", entity.getSkillsScore().intValue());
        if (entity.getExperienceScore() != null) criteriaScores.put("experience", entity.getExperienceScore().intValue());

        return MatchingResultResponse.builder()
                .applicationId(entity.getApplicationId())
                .jobId(entity.getJobId())
                .cvVersionId(entity.getCvVersionId())
                .status("COMPLETED")
                .overallScore(entity.getOverallScore() == null ? null : entity.getOverallScore().intValue())
                .skillsScore(entity.getSkillsScore() == null ? null : entity.getSkillsScore().intValue())
                .experienceScore(entity.getExperienceScore() == null ? null : entity.getExperienceScore().intValue())
                .criteriaScores(criteriaScores)
                .matchedSkills(matched)
                .missingSkills(missing)
                .breakdown(breakdown)
                .explanation(entity.getRationale())
                .evaluatedAt(entity.getCreatedAt())
                .message("Matching result is complete.")
                .build();
    }

    public String serializeBreakdown(MatchScoreResponse response) {
        try {
            return objectMapper.writeValueAsString(normalizeBreakdown(response));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not serialize matching breakdown", ex);
        }
    }

    private Map<String, Object> readBreakdown(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (Exception ex) {
            // Preserve a valid public response even if legacy rows contain malformed JSON.
            return new LinkedHashMap<>();
        }
    }

    private List<String> firstList(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value instanceof Collection<?> values) {
                List<String> strings = values.stream()
                        .filter(item -> item != null)
                        .map(Object::toString)
                        .map(String::trim)
                        .filter(item -> !item.isEmpty())
                        .distinct()
                        .toList();
                if (!strings.isEmpty()) return strings;
            }
        }
        return new ArrayList<>();
    }

    private boolean hasList(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            if (map.get(key) instanceof Collection<?>) return true;
        }
        return false;
    }
}
