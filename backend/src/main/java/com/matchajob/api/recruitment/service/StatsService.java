package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.JobStatsSummaryDto;
import com.matchajob.api.recruitment.dto.KeyCountDto;
import com.matchajob.api.recruitment.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public Map<String, Long> getJobCountByStatus() {
        List<KeyCountDto> results = jobRepository.countJobsByStatus();
        Map<String, Long> stats = new HashMap<>();
<<<<<<< Updated upstream
        for (KeyCountDto row : results) {
            stats.put(row.getKey().toLowerCase(), row.getCount());
=======
        for (Object[] row : results) {
            stats.put(((String) row[0]).toLowerCase(), ((Number) row[1]).longValue());
>>>>>>> Stashed changes
        }
        return stats;
    }

    @Transactional(readOnly = true)
    public JobStatsSummaryDto getComprehensiveJobStats() {
        LocalDate today = LocalDate.now();

        // 1. Group by status
        List<KeyCountDto> statusRows = jobRepository.countJobsByStatus();
        Map<String, Long> statusMap = new HashMap<>();
        long totalJobs = 0;
        for (KeyCountDto row : statusRows) {
            statusMap.put(row.getKey().toLowerCase(), row.getCount());
            totalJobs += row.getCount();
        }

        // 2. Active non-expired vs expired
        long activeNonExpired = jobRepository.countActiveNonExpiredJobs(today);
        long activeExpired = jobRepository.countActiveExpiredJobs(today);

        // 3. Category breakdown
        Map<String, Long> categoryMap = new HashMap<>();
        for (KeyCountDto row : jobRepository.countJobsByCategory()) {
            categoryMap.put(row.getKey(), row.getCount());
        }

        // 4. Level breakdown
        Map<String, Long> levelMap = new HashMap<>();
        for (KeyCountDto row : jobRepository.countJobsByLevel()) {
            levelMap.put(row.getKey().toLowerCase(), row.getCount());
        }

        // 5. WorkType breakdown
        Map<String, Long> workTypeMap = new HashMap<>();
        for (KeyCountDto row : jobRepository.countJobsByWorkType()) {
            workTypeMap.put(row.getKey().toLowerCase(), row.getCount());
        }

        // 6. Metrics (applicant count and view count)
        long totalApplicants = 0;
        long totalViews = 0;
        List<Object[]> metrics = jobRepository.getAggregatedMetrics();
        if (!metrics.isEmpty() && metrics.get(0) != null) {
            Object[] row = metrics.get(0);
            totalApplicants = row[0] != null ? ((Number) row[0]).longValue() : 0L;
            totalViews = row[1] != null ? ((Number) row[1]).longValue() : 0L;
        }

        return JobStatsSummaryDto.builder()
                .totalJobs(totalJobs)
                .activeJobs(activeNonExpired)
                .expiredJobs(activeExpired)
                .draftJobs(statusMap.getOrDefault("draft", 0L))
                .pausedJobs(statusMap.getOrDefault("paused", 0L))
                .closedJobs(statusMap.getOrDefault("closed", 0L))
                .pendingJobs(statusMap.getOrDefault("pending", 0L))
                .totalApplicants(totalApplicants)
                .totalViews(totalViews)
                .statusBreakdown(statusMap)
                .categoryBreakdown(categoryMap)
                .levelBreakdown(levelMap)
                .workTypeBreakdown(workTypeMap)
                .build();
    }
}
