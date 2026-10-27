package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for a stage update operation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StageUpdateResponse {

    private UUID applicationId;
    private String previousStage;
    private String currentStage;
    private Instant updatedAt;
}
