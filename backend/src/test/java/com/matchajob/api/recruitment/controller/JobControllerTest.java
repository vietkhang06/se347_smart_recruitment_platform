package com.matchajob.api.recruitment.controller;

<<<<<<< Updated upstream
import com.matchajob.api.recruitment.dto.JobSearchCriteria;
=======
import com.matchajob.api.recruitment.dto.JobDetailResponse;
>>>>>>> Stashed changes
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
<<<<<<< Updated upstream
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
=======
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
>>>>>>> Stashed changes
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

<<<<<<< Updated upstream
class JobControllerTest {

    @Test
    void searchPassesFiltersAndPaginationToService() throws Exception {
        JobService service = mock(JobService.class);

        when(service.searchJobs(any()))
                .thenReturn(PageResponse.<JobSummaryResponse>builder()
                        .content(List.of())
                        .page(2)
                        .size(5)
                        .totalElements(0)
                        .build());

        MockMvcBuilders.standaloneSetup(new JobController(service))
                .build()
                .perform(get("/v1/jobs")
                        .param("keyword", "Java")
                        .param("page", "2")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2));

        var criteria = ArgumentCaptor.forClass(JobSearchCriteria.class);

        verify(service).searchJobs(criteria.capture());

        assertThat(criteria.getValue().getKeyword())
                .isEqualTo("Java");
        assertThat(criteria.getValue().getSize())
                .isEqualTo(5);
=======
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
>>>>>>> Stashed changes
    }
}
