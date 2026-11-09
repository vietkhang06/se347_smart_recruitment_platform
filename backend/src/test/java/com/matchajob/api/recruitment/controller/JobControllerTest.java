package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.service.JobService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    }
}
