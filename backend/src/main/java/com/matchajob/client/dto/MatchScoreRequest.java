package com.matchajob.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchScoreRequest {

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("job_title")
    private String jobTitle;

    @JsonProperty("job_description")
    private String jobDescription;

    @JsonProperty("job_requirements")
    private String jobRequirements;

    @JsonProperty("cv_text")
    private String cvText;

    @JsonProperty("candidate_skills")
    private List<String> candidateSkills;
}
