package com.matchajob.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Response payload representing candidate profile details")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileResponse {

    @Schema(description = "Candidate profile unique identifier", example = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    private UUID id;

    @Schema(description = "Associated user unique identifier", example = "e93187d1-9a23-4bd5-9cf7-0aa06bb431b9")
    @JsonProperty("user_id")
    private UUID userId;

    @Schema(description = "Professional headline or target job title", example = "Senior Backend Engineer")
    private String headline;

    @Schema(description = "Candidate biography or personal summary", example = "Passionate engineer with experience in distributed systems.")
    private String bio;

    @Schema(description = "Years of professional experience (0 to 60)", example = "5")
    @JsonProperty("experience_years")
    private Short experienceYears;

    @Schema(description = "Educational background and degrees", example = "B.S. in Computer Science, HCMUS")
    private String education;

    @Schema(description = "Current city or geographic location", example = "Ho Chi Minh City")
    private String location;

    @Schema(description = "Detailed street address", example = "123 Le Loi, District 1")
    private String address;

    @Schema(description = "URL pointing to active CV document", example = "https://storage.matchajob.com/cv/resume.pdf")
    @JsonProperty("cv_url")
    private String cvUrl;

    @Schema(description = "AI-calculated CV quality or match score (0-100)", example = "85")
    @JsonProperty("ai_cv_score")
    private Short aiCvScore;

    @Schema(description = "Profile creation timestamp in ISO-8601 format")
    @JsonProperty("created_at")
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private Instant createdAt;

    @Schema(description = "Profile last update timestamp in ISO-8601 format")
    @JsonProperty("updated_at")
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private Instant updatedAt;
}
