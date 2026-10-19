package com.matchajob.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request DTO for updating the stage of an application (by HR/Employer).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationStageUpdateRequest {

    @NotBlank(message = "to_stage is required")
    private String toStage;

    private String reason;
}
