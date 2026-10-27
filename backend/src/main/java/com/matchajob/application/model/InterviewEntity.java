package com.matchajob.application.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping to the interviews table (V2 baseline schema).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "interviews")
public class InterviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "interview_type", length = 100)
    private String interviewType;

    @Column(name = "interview_mode", nullable = false, length = 20)
    @Builder.Default
    private String interviewMode = "online";

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_min")
    @Builder.Default
    private Short durationMin = 60;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "participants", columnDefinition = "TEXT")
    private String participants;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "scheduled";

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (interviewMode == null) interviewMode = "online";
        if (status == null) status = "scheduled";
        if (durationMin == null) durationMin = 60;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
