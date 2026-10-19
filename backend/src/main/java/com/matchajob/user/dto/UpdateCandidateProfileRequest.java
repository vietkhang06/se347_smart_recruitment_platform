package com.matchajob.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

@Schema(description = "Partial update request payload for candidate profile")
@Getter
@ToString
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCandidateProfileRequest {

    @Schema(description = "Professional headline or target job title", example = "Senior Backend Engineer", maxLength = 255)
    @Size(max = 255, message = "Headline must not exceed 255 characters")
    private String headline;

    @Schema(description = "Candidate biography or personal summary", example = "Passionate engineer with experience in distributed systems.", maxLength = 5000)
    @Size(max = 5000, message = "Bio must not exceed 5000 characters")
    private String bio;

    @Schema(description = "Years of professional experience (0 to 60)", example = "5", minimum = "0", maximum = "60")
    @Min(value = 0, message = "Experience years must be between 0 and 60")
    @Max(value = 60, message = "Experience years must be between 0 and 60")
    @JsonProperty("experience_years")
    @JsonAlias("experienceYears")
    private Short experienceYears;

    @Schema(description = "Educational background and degrees", example = "B.S. in Computer Science, HCMUS", maxLength = 500)
    @Size(max = 500, message = "Education must not exceed 500 characters")
    private String education;

    @Schema(description = "Current city or geographic location", example = "Ho Chi Minh City", maxLength = 255)
    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @Schema(description = "Detailed street address", example = "123 Le Loi, District 1", maxLength = 1000)
    @Size(max = 1000, message = "Address must not exceed 1000 characters")
    private String address;

    @JsonIgnore
    private final Set<String> presentFields = new HashSet<>();

    public void setHeadline(String headline) {
        this.headline = headline;
        this.presentFields.add("headline");
    }

    public void setBio(String bio) {
        this.bio = bio;
        this.presentFields.add("bio");
    }

    @JsonProperty("experience_years")
    @JsonAlias("experienceYears")
    public void setExperienceYears(Short experienceYears) {
        this.experienceYears = experienceYears;
        this.presentFields.add("experience_years");
    }

    public void setEducation(String education) {
        this.education = education;
        this.presentFields.add("education");
    }

    public void setLocation(String location) {
        this.location = location;
        this.presentFields.add("location");
    }

    public void setAddress(String address) {
        this.address = address;
        this.presentFields.add("address");
    }

    @JsonIgnore
    public boolean hasHeadline() {
        return presentFields.contains("headline");
    }

    @JsonIgnore
    public boolean hasBio() {
        return presentFields.contains("bio");
    }

    @JsonIgnore
    public boolean hasExperienceYears() {
        return presentFields.contains("experience_years");
    }

    @JsonIgnore
    public boolean hasEducation() {
        return presentFields.contains("education");
    }

    @JsonIgnore
    public boolean hasLocation() {
        return presentFields.contains("location");
    }

    @JsonIgnore
    public boolean hasAddress() {
        return presentFields.contains("address");
    }

    @JsonIgnore
    public boolean hasAnyUpdate() {
        return !presentFields.isEmpty();
    }
}
