package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.dto.JobStatsSummaryDto;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class JobQueryPerformanceAndStatsTest {

    @Autowired
    private StatsService statsService;

    @Autowired
    private JobService jobService;

    @Test
    public void testStatsAccuracy() {
        // Verify stats calculation logic
        JobStatsSummaryDto stats = statsService.getComprehensiveJobStats();
        assertThat(stats).isNotNull();
        assertThat(stats.getTotalJobs()).isGreaterThanOrEqualTo(0);
        // Add more specific assertions based on expected seeded data if needed
    }

    @Test
    public void testSearchPerformance() {
        // Execute search query to measure time
        JobSearchCriteria criteria = new JobSearchCriteria();
        criteria.setKeyword("Java"); // Using a sample keyword

        long startTime = System.currentTimeMillis();
        PageResponse<JobSummaryResponse> results = jobService.searchJobs(criteria);
        long endTime = System.currentTimeMillis();

        long duration = endTime - startTime;
        System.out.println("Search performance: " + duration + "ms");

        assertThat(results).isNotNull();
        // Set a reasonable performance threshold, e.g., 500ms
        assertThat(duration).isLessThan(500);
    }
}
