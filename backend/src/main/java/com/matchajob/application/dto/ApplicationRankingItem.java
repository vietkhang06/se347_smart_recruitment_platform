package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for a single item in the job application ranking list.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationRankingItem {

    private int ranking;
    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private String stage;
    private Integer overallScore;
    private Integer skillsScore;
    private Integer experienceScore;
    private String rationale;
    private Instant appliedAt;
}
