package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JobController.class)
public class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobService jobService;

    @Test
    public void testUnauthorizedJobModification() throws Exception {
        when(jobService.updateJobStatus(any(UUID.class), anyString()))
                .thenThrow(new SecurityException("Unauthorized"));

        mockMvc.perform(patch("/api/v1/recruitment/jobs/00000000-0000-0000-0000-000000000000/status")
                .param("status", "PAUSED")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testInvalidStatusTransition() throws Exception {
        when(jobService.updateJobStatus(any(UUID.class), anyString()))
                .thenThrow(new IllegalStateException("Invalid transition"));

        mockMvc.perform(patch("/api/v1/recruitment/jobs/00000000-0000-0000-0000-000000000000/status")
                .param("status", "ACTIVE")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}
