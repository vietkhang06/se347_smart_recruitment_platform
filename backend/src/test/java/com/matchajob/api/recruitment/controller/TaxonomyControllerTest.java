package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.service.TaxonomyService;
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
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ContextConfiguration(classes = TaxonomyControllerTest.TestConfig.class)
@TestPropertySource(properties = {
        "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET,
        "app.auth.require-email-verification=true"
})
class TaxonomyControllerTest {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean
        public TaxonomyController taxonomyController(TaxonomyService taxonomyService) {
            return new TaxonomyController(taxonomyService);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaxonomyService taxonomyService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("GET /api/v1/recruitment/taxonomies/categories is public and returns categories")
    void testGetCategories() throws Exception {
        CategoryResponse category = CategoryResponse.builder()
                .id(UUID.randomUUID())
                .name("IT / Software")
                .status("visible")
                .sortOrder((short) 1)
                .build();

        when(taxonomyService.getAllCategories()).thenReturn(List.of(category));

        mockMvc.perform(get("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("IT / Software"));
    }

    @Test
    @DisplayName("GET /api/v1/recruitment/taxonomies/work-types is public and returns work types")
    void testGetWorkTypes() throws Exception {
        when(taxonomyService.getWorkTypes()).thenReturn(List.of("remote", "hybrid"));

        mockMvc.perform(get("/api/v1/recruitment/taxonomies/work-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("remote"));
    }

    @Test
    @DisplayName("POST /api/v1/recruitment/taxonomies/categories without auth returns 401 Unauthorized")
    void testPostTaxonomiesWithoutAuthReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }
}
