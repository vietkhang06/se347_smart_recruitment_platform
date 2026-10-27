package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for a single application status history entry.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationHistoryResponse {

    private UUID id;
    private String fromStage;
    private String toStage;
    private UUID changedBy;
    private String reason;
    private Instant createdAt;
}
