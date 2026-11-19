package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobStatsSummaryDto;
import com.matchajob.api.recruitment.service.StatsService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = StatsControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET
})
class StatsControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public StatsController statsController(StatsService statsService) {
            return new StatsController(statsService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatsService statsService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("GET /api/v1/recruitment/stats/jobs returns job counts by status")
    void testGetJobStats() throws Exception {
        when(statsService.getJobCountByStatus()).thenReturn(Map.of("active", 10L, "draft", 2L));

        mockMvc.perform(get("/api/v1/recruitment/stats/jobs")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(10))
                .andExpect(jsonPath("$.draft").value(2));
    }

    @Test
    @DisplayName("GET /api/v1/recruitment/stats/overview returns comprehensive stats")
    void testGetOverviewStats() throws Exception {
        JobStatsSummaryDto stats = JobStatsSummaryDto.builder()
                .totalJobs(12L)
                .activeJobs(10L)
                .build();

        when(statsService.getComprehensiveJobStats()).thenReturn(stats);

        mockMvc.perform(get("/api/v1/recruitment/stats/overview")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalJobs").value(12))
                .andExpect(jsonPath("$.activeJobs").value(10));
    }
}
