package com.matchajob.api.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobStatsSummaryDto {
    private long totalJobs;
    private long activeJobs;
    private long expiredJobs;
    private long draftJobs;
    private long pausedJobs;
    private long closedJobs;
    private long pendingJobs;
    private long totalApplicants;
    private long totalViews;
    private Map<String, Long> statusBreakdown;
    private Map<String, Long> categoryBreakdown;
    private Map<String, Long> levelBreakdown;
    private Map<String, Long> workTypeBreakdown;
}

