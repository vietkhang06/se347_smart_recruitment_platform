package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobDetailResponse;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.exception.JobNotFoundException;
import com.matchajob.api.recruitment.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JobController.class)
@AutoConfigureMockMvc(addFilters = false)
public class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobService jobService;

    @Test
    public void testSearchJobs_success() throws Exception {
        when(jobService.searchJobs(any())).thenReturn(PageResponse.<JobSummaryResponse>builder()
                .content(List.of())
                .page(0)
                .size(10)
                .totalElements(0)
                .build());

        mockMvc.perform(get("/v1/jobs")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    public void testGetJobDetail_success() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobDetailResponse response = JobDetailResponse.builder()
                .id(jobId)
                .title("Software Engineer")
                .status("active")
                .build();

        when(jobService.getJobDetail(jobId)).thenReturn(response);

        mockMvc.perform(get("/v1/jobs/" + jobId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(jobId.toString()))
                .andExpect(jsonPath("$.title").value("Software Engineer"));
    }

    @Test
    public void testGetJobDetail_notFound() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(jobService.getJobDetail(jobId)).thenThrow(new JobNotFoundException(jobId));

        mockMvc.perform(get("/v1/jobs/" + jobId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
