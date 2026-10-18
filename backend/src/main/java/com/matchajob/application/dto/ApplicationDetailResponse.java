package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Detailed response representation of a job application.
 * Enriches the core ApplicationEntity with joined details from Job, Company, and Candidate.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDetailResponse {

    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private UUID jobId;
    private String jobTitle;
    private String companyName;
    private String coverLetter;
    private String cvSnapshotUrl;
    private String stage;
    private String rejectReason;
    private Short matchScore;
    private Instant appliedAt;
    private Instant updatedAt;
}
