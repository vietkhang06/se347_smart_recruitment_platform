package com.matchajob.api.recruitment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "slug", length = 350, unique = true)
    private String slug;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "level", length = 80)
    private String level;

    @Column(name = "work_type", nullable = false, length = 60)
    private String workType;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "map_link", length = 500)
    private String mapLink;

    @Builder.Default
    @Column(name = "salary_mode", nullable = false, length = 10)
    private String salaryMode = "range";

    @Column(name = "salary_min")
    private Long salaryMin;

    @Column(name = "salary_max")
    private Long salaryMax;

    @Builder.Default
    @Column(name = "salary_currency", nullable = false, length = 3)
    private String salaryCurrency = "VND";

    @Column(name = "experience", length = 50)
    private String experience;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "schedule", columnDefinition = "TEXT")
    private String schedule;

    @Column(name = "summary_industry", length = 200)
    private String summaryIndustry;

    @Column(name = "summary_required", columnDefinition = "TEXT")
    private String summaryRequired;

    @Column(name = "summary_preferred", columnDefinition = "TEXT")
    private String summaryPreferred;

    @Builder.Default
    @Column(name = "applicant_count", nullable = false)
    private Integer applicantCount = 0;

    @Builder.Default
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = "pending";
        }
        if (this.salaryMode == null) {
            this.salaryMode = "range";
        }
        if (this.salaryCurrency == null) {
            this.salaryCurrency = "VND";
        }
        if (this.applicantCount == null) {
            this.applicantCount = 0;
        }
        if (this.viewCount == null) {
            this.viewCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}