package com.matchajob.application.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for employer candidate applications view and pipeline Kanban.
 * Combines application state, job info, candidate contact & skills, and AI match scores.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployerApplicationItemResponse {

    private UUID id;
    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateAvatar;
    private String candidateHeadline;
    private List<String> candidateSkills;

    private UUID jobId;
    private String jobTitle;
    private UUID companyId;
    private String companyName;

    private String stage;
    private String rejectReason;
    private String coverLetter;
    private String cvSnapshotUrl;

    private Integer matchScore;
    private Integer skillsScore;
    private Integer experienceScore;
    private String matchRationale;

    private Instant appliedAt;
    private Instant updatedAt;
}
