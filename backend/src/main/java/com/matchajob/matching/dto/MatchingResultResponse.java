package com.matchajob.matching.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Public, stable response contract for a CV/JD matching result.
 * Scores are null until matching reaches COMPLETED; clients must not render 0 as a real score.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "CV-to-job matching result or processing state for an application")
public class MatchingResultResponse {

    @Schema(description = "Application being evaluated")
    private UUID applicationId;

    @Schema(description = "Job attached to the application")
    private UUID jobId;

    @Schema(description = "Immutable CV version snapshot used for the application")
    private UUID cvVersionId;

    @Schema(description = "NOT_STARTED, PENDING, PROCESSING, COMPLETED, or FAILED", example = "COMPLETED")
    private String status;

    @Schema(description = "Overall fit score from 0 to 100; null until completed", minimum = "0", maximum = "100", nullable = true)
    private Integer overallScore;

    @Schema(description = "Skills score from 0 to 100; null until completed", minimum = "0", maximum = "100", nullable = true)
    private Integer skillsScore;

    @Schema(description = "Experience score from 0 to 100; null until completed", minimum = "0", maximum = "100", nullable = true)
    private Integer experienceScore;

    @Schema(description = "Scores by criterion, including skills and experience when available")
    private Map<String, Integer> criteriaScores;

    @Schema(description = "Skills required by the job that were found in the CV")
    private List<String> matchedSkills;

    @Schema(description = "Skills required by the job that were not found in the CV")
    private List<String> missingSkills;

    @Schema(description = "Original AI Worker breakdown, normalized with requiredSkills/matchedSkills/missingSkills")
    private Map<String, Object> breakdown;

    @Schema(description = "Human-readable explanation of the matching result")
    private String explanation;

    @Schema(description = "Processing job ID when the result is waiting or processing")
    private UUID processingJobId;

    @Schema(description = "Timestamp at which the result was persisted")
    private Instant evaluatedAt;

    @Schema(description = "Safe user-facing status detail; does not expose internal stack traces")
    private String message;
}
