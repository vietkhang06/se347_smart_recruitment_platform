package com.matchajob.admin.controller;

import com.matchajob.api.recruitment.dto.JobStatsSummaryDto;
import com.matchajob.api.recruitment.service.StatsService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = AdminStatsControllerTest.TestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
public class AdminStatsControllerTest {

    @Configuration
    @EnableWebMvc
    @Import(GlobalExceptionHandler.class)
    static class TestConfig {
        @Bean
        public AdminStatsController adminStatsController(StatsService statsService) {
            return new AdminStatsController(statsService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatsService statsService;

    @Test
    public void testGetJobStatistics_ReturnsAggregatedData() throws Exception {
        JobStatsSummaryDto summary = JobStatsSummaryDto.builder()
                .totalJobs(500)
                .activeJobs(350)
                .expiredJobs(50)
                .draftJobs(30)
                .pausedJobs(30)
                .closedJobs(40)
                .totalApplicants(1250)
                .totalViews(45000)
                .statusBreakdown(Map.of("active", 400L, "closed", 40L, "paused", 30L, "draft", 30L))
                .categoryBreakdown(Map.of("Công nghệ thông tin", 200L, "Thiết kế & Sáng tạo", 100L))
                .levelBreakdown(Map.of("senior", 150L, "junior", 100L))
                .workTypeBreakdown(Map.of("full_time", 300L, "remote", 100L))
                .build();

        when(statsService.getComprehensiveJobStats()).thenReturn(summary);

        mockMvc.perform(get("/v1/admin/stats/jobs")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalJobs").value(500))
                .andExpect(jsonPath("$.activeJobs").value(350))
                .andExpect(jsonPath("$.expiredJobs").value(50))
                .andExpect(jsonPath("$.closedJobs").value(40))
                .andExpect(jsonPath("$.pausedJobs").value(30))
                .andExpect(jsonPath("$.draftJobs").value(30))
                .andExpect(jsonPath("$.totalApplicants").value(1250))
                .andExpect(jsonPath("$.totalViews").value(45000))
                .andExpect(jsonPath("$.categoryBreakdown['Công nghệ thông tin']").value(200));
    }
}

