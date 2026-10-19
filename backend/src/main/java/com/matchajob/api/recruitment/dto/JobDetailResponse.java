package com.matchajob.api.recruitment.dto;

import com.matchajob.api.recruitment.model.Job;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDetailResponse {
    private UUID id;
    private UUID companyId;
    private CategoryResponse category;
    private UUID createdBy;
    private String title;
    private String slug;
    private String department;
    private String level;
    private String workType;
    private String location;
    private String address;
    private String mapLink;
    private String salaryMode;
    private Long salaryMin;
    private Long salaryMax;
    private String salaryCurrency;
    private String experience;
    private String description;
    private String requirements;
    private String benefits;
    private String schedule;
    private String summaryIndustry;
    private String summaryRequired;
    private String summaryPreferred;
    private Integer applicantCount;
    private Integer viewCount;
    private String status;
    private Instant postedAt;
    private LocalDate deadline;
    private Instant createdAt;
    private Instant updatedAt;
    private List<JobSkillDetail> skills;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobSkillDetail {
        private UUID skillId;
        private String skillName;
        private Boolean isRequired;
    }

    public static JobDetailResponse from(Job job) {
        if (job == null) return null;
        List<JobSkillDetail> skillDetails = job.getJobSkills() == null ? List.of() :
                job.getJobSkills().stream()
                        .filter(js -> js.getSkill() != null)
                        .map(js -> JobSkillDetail.builder()
                                .skillId(js.getSkill().getId())
                                .skillName(js.getSkill().getName())
                                .isRequired(js.getIsRequired())
                                .build())
                        .collect(Collectors.toList());

        return JobDetailResponse.builder()
                .id(job.getId())
                .companyId(job.getCompanyId())
                .category(CategoryResponse.from(job.getCategory()))
                .createdBy(job.getCreatedBy())
                .title(job.getTitle())
                .slug(job.getSlug())
                .department(job.getDepartment())
                .level(job.getLevel())
                .workType(job.getWorkType())
                .location(job.getLocation())
                .address(job.getAddress())
                .mapLink(job.getMapLink())
                .salaryMode(job.getSalaryMode())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .salaryCurrency(job.getSalaryCurrency())
                .experience(job.getExperience())
                .description(job.getDescription())
                .requirements(job.getRequirements())
                .benefits(job.getBenefits())
                .schedule(job.getSchedule())
                .summaryIndustry(job.getSummaryIndustry())
                .summaryRequired(job.getSummaryRequired())
                .summaryPreferred(job.getSummaryPreferred())
                .applicantCount(job.getApplicantCount())
                .viewCount(job.getViewCount())
                .status(job.getStatus())
                .postedAt(job.getPostedAt())
                .deadline(job.getDeadline())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .skills(skillDetails)
                .build();
    }
}
