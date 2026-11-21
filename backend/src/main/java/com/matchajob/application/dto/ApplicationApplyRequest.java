package com.matchajob.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Request DTO for submitting a new job application.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationApplyRequest {

    @NotNull(message = "job_id is required")
    private UUID jobId;

    @NotNull(message = "cv_version_id is required")
    private UUID cvVersionId;

    @jakarta.validation.constraints.Size(max = 5000, message = "Cover letter must not exceed 5000 characters")
    private String coverLetter;
}
