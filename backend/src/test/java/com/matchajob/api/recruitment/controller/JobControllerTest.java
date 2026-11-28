package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.JobDetailResponse;
import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.dto.JobSummaryResponse;
import com.matchajob.api.recruitment.dto.PageResponse;
import com.matchajob.api.recruitment.service.JobService;
import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.security.JwtAuthenticationFilter;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.security.SecurityConfig;
import com.matchajob.security.SecurityProfileValidator;
import com.matchajob.user.repository.UserRepository;
import com.matchajob.user.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = JobControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET
})
class JobControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
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

    @MockBean
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("GET /v1/jobs searches jobs with criteria")
    void testSearchJobs() throws Exception {
        PageResponse<JobSummaryResponse> response = PageResponse.<JobSummaryResponse>builder()
                .content(List.of(JobSummaryResponse.builder().title("Senior Java Developer").build()))
                .build();

        when(jobService.searchJobs(any(JobSearchCriteria.class))).thenReturn(response);

        mockMvc.perform(get("/v1/jobs")
                .param("keyword", "Java")
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Senior Java Developer"));
    }

    @Test
    @DisplayName("GET /v1/jobs/{id} returns job detail")
    void testGetJobDetail() throws Exception {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        JobDetailResponse response = JobDetailResponse.builder()
                .id(id)
                .title("Senior Java Developer")
                .build();

        when(jobService.getJobDetail(id)).thenReturn(response);
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("candidate@matchajob.com")
                .role("CANDIDATE")
                .status("active")
                .isVerified(true)
                .build()));
        String token = jwtTokenProvider.generateToken(userId);

        mockMvc.perform(get("/v1/jobs/" + id.toString())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Java Developer"));
    }
}
