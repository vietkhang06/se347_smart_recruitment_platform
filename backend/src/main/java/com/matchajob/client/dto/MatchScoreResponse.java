package com.matchajob.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchScoreResponse {

    @JsonProperty("overall_score")
    private Integer overallScore;

    @JsonProperty("skills_score")
    private Integer skillsScore;

    @JsonProperty("experience_score")
    private Integer experienceScore;

    @JsonProperty("breakdown")
    private Map<String, Object> breakdown;

    @JsonProperty("rationale")
    private String rationale;
}
