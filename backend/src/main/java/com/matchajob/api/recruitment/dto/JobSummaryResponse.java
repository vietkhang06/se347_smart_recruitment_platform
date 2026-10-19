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
public class JobSummaryResponse {
    private UUID id;
    private UUID companyId;
    private CategoryResponse category;
    private String title;
    private String slug;
    private String department;
    private String level;
    private String workType;
    private String location;
    private String salaryMode;
    private Long salaryMin;
    private Long salaryMax;
    private String salaryCurrency;
    private String experience;
    private Integer applicantCount;
    private Integer viewCount;
    private String status;
    private Instant postedAt;
    private LocalDate deadline;
    private List<String> skills;

    public static JobSummaryResponse from(Job job) {
        if (job == null) return null;
        List<String> skillNames = job.getJobSkills() == null ? List.of() :
                job.getJobSkills().stream()
                        .filter(js -> js.getSkill() != null)
                        .map(js -> js.getSkill().getName())
                        .collect(Collectors.toList());

        return JobSummaryResponse.builder()
                .id(job.getId())
                .companyId(job.getCompanyId())
                .category(CategoryResponse.from(job.getCategory()))
                .title(job.getTitle())
                .slug(job.getSlug())
                .department(job.getDepartment())
                .level(job.getLevel())
                .workType(job.getWorkType())
                .location(job.getLocation())
                .salaryMode(job.getSalaryMode())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .salaryCurrency(job.getSalaryCurrency())
                .experience(job.getExperience())
                .applicantCount(job.getApplicantCount())
                .viewCount(job.getViewCount())
                .status(job.getStatus())
                .postedAt(job.getPostedAt())
                .deadline(job.getDeadline())
                .skills(skillNames)
                .build();
    }
}
