package com.matchajob.api.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobCreateRequest {
    private UUID companyId;
    private UUID categoryId;
    private UUID createdBy;
    private String title;
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
    private String status; // 'draft' hoặc 'active'
    private LocalDate deadline;
    private List<JobSkillItem> skills;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobSkillItem {
        private UUID skillId;
        private String skillName;
        private Boolean isRequired;
    }
}
