package com.matchajob.api.recruitment.controller;

package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobDetailResponse;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.service.JobService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = JobControllerTest.TestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
public class JobControllerTest {

    @Configuration
    @EnableWebMvc
    @Import(GlobalExceptionHandler.class)
    static class TestConfig {
        @Bean
        public JobController jobController(JobService jobService) {
            return new JobController(jobService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobService jobService;

    @Test
    public void testSearchJobs_ReturnsPageResponse() throws Exception {
        JobSummaryResponse summary = JobSummaryResponse.builder()
                .id(UUID.randomUUID())
                .title("Senior Java Engineer")
                .status("active")
                .build();

        PageResponse<JobSummaryResponse> pageResponse = PageResponse.<JobSummaryResponse>builder()
                .content(List.of(summary))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();

        when(jobService.searchJobs(any())).thenReturn(pageResponse);

        mockMvc.perform(get("/v1/jobs")
                        .param("keyword", "Java")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Senior Java Engineer"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    public void testGetJobDetail_ReturnsDetail() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobDetailResponse detail = JobDetailResponse.builder()
                .id(jobId)
                .title("Senior Java Engineer")
                .status("active")
                .build();

        when(jobService.getJobDetail(jobId)).thenReturn(detail);

        mockMvc.perform(get("/v1/jobs/{id}", jobId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Java Engineer"));
    }
}