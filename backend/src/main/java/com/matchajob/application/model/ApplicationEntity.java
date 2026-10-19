package com.matchajob.application.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity for the applications table (V2 baseline schema).
 * This is the application module's own entity definition, independent of the
 * upstream recruitment module entity (which is excluded from component scan).
 *
 * Maps to the V2 applications table with V5 enhancements (added 'hired' stage).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "applications")
public class ApplicationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "cv_snapshot_url", length = 500)
    private String cvSnapshotUrl;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String stage = "new";

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "match_score")
    private Short matchScore;

    @Column(name = "applied_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant appliedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    /**
     * Returns the current stage as an ApplicationStage enum.
     */
    public ApplicationStage getStageEnum() {
        return ApplicationStage.fromDbValue(this.stage);
    }

    /**
     * Sets the stage from an ApplicationStage enum value.
     */
    public void setStageEnum(ApplicationStage stageEnum) {
        this.stage = stageEnum.getDbValue();
    }
}
