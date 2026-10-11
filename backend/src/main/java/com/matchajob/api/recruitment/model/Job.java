package com.matchajob.api.recruitment.model;

import com.matchajob.api.recruitment.model.enums.JobLevel;
import com.matchajob.api.recruitment.model.enums.JobStatus;
import com.matchajob.api.recruitment.model.enums.SalaryMode;
import com.matchajob.api.recruitment.model.enums.WorkType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(unique = true, length = 350)
    private String slug;

    @Column(length = 100)
    private String department;

    @Column(length = 80)
    private String level;

    @Column(name = "work_type", nullable = false, length = 60)
    private String workType;

    @Column(length = 255)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "map_link", length = 500)
    private String mapLink;

    @Column(name = "salary_mode", nullable = false, length = 10)
    @Builder.Default
    private String salaryMode = "range";

    @Column(name = "salary_min")
    private Long salaryMin;

    @Column(name = "salary_max")
    private Long salaryMax;

    @Column(name = "salary_currency", nullable = false, length = 3)
    @Builder.Default
    private String salaryCurrency = "VND";

    @Column(length = 50)
    private String experience;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(columnDefinition = "TEXT")
    private String schedule;

    @Column(name = "summary_industry", length = 200)
    private String summaryIndustry;

    @Column(name = "summary_required", columnDefinition = "TEXT")
    private String summaryRequired;

    @Column(name = "summary_preferred", columnDefinition = "TEXT")
    private String summaryPreferred;

    @Column(name = "applicant_count", nullable = false)
    @Builder.Default
    private Integer applicantCount = 0;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "draft";

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<JobSkill> jobSkills = new ArrayList<>();
}
