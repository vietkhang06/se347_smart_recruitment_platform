package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO returned after successfully submitting an application.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponse {

    private UUID applicationId;
    private UUID candidateId;
    private UUID jobId;
    private String stage;
    private Instant appliedAt;
    private UUID processingJobId;
    private String message;
}
