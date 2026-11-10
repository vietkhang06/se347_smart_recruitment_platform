package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobDetailResponse;
import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.exception.JobNotFoundException;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class JobControllerTest {

    @Test
    void searchPassesFiltersAndPaginationToService() throws Exception {
        JobService service = mock(JobService.class);
        when(service.searchJobs(any())).thenReturn(PageResponse.<JobSummaryResponse>builder().content(List.of())
                .page(2).size(5).totalElements(0).build());
        MockMvcBuilders.standaloneSetup(new JobController(service)).build()
                .perform(get("/v1/jobs").param("keyword", "Java").param("page", "2").param("size", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(2));
        var criteria = ArgumentCaptor.forClass(JobSearchCriteria.class);
        verify(service).searchJobs(criteria.capture());
        assertThat(criteria.getValue().getKeyword()).isEqualTo("Java");
        assertThat(criteria.getValue().getSize()).isEqualTo(5);
    }

    @Test
    void getJobDetail_success() throws Exception {
        JobService service = mock(JobService.class);
        UUID jobId = UUID.randomUUID();
        JobDetailResponse response = JobDetailResponse.builder()
                .id(jobId)
                .title("Software Engineer")
                .status("active")
                .build();
        when(service.getJobDetail(jobId)).thenReturn(response);

        MockMvcBuilders.standaloneSetup(new JobController(service)).build()
                .perform(get("/v1/jobs/" + jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(jobId.toString()))
                .andExpect(jsonPath("$.title").value("Software Engineer"));
    }

    @Test
    void getJobDetail_notFound() throws Exception {
        JobService service = mock(JobService.class);
        UUID jobId = UUID.randomUUID();
        when(service.getJobDetail(jobId)).thenThrow(new JobNotFoundException(jobId));

        MockMvcBuilders.standaloneSetup(new JobController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build()
                .perform(get("/v1/jobs/" + jobId))
                .andExpect(status().isNotFound());
    }
}