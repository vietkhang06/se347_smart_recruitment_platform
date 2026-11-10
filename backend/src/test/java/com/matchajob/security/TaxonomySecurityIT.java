package com.matchajob.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.MatchaJobApplication;
import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.service.TaxonomyService;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MatchaJobApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Taxonomy Category RBAC & Negative Security Tests")
class TaxonomySecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TaxonomyService taxonomyService;

    @MockBean
    private UserRepository userRepository;

    private String createBearerToken(String role) {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email(role.toLowerCase() + "@test.com")
                .role(role.toLowerCase())
                .status("active")
                .isVerified(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        return "Bearer " + jwtTokenProvider.generateToken(userId);
    }

    @Test
    @DisplayName("1. Anonymous GET /api/v1/recruitment/taxonomies/categories is permitted (200 OK)")
    void getCategories_anonymous_permitted() throws Exception {
        when(taxonomyService.getAllCategories()).thenReturn(List.of(
                CategoryResponse.builder().id(UUID.randomUUID()).name("Engineering").build()
        ));

        mockMvc.perform(get("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Engineering"));
    }

    @Test
    @DisplayName("2. Anonymous POST /api/v1/recruitment/taxonomies/categories is rejected with 401")
    void createCategory_anonymous_rejectedWith401() throws Exception {
        Category cat = Category.builder().name("New Category").build();

        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cat)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("3. Anonymous DELETE /api/v1/recruitment/taxonomies/categories/{id} is rejected with 401")
    void deleteCategory_anonymous_rejectedWith401() throws Exception {
        mockMvc.perform(delete("/api/v1/recruitment/taxonomies/categories/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("4. Candidate POST /api/v1/recruitment/taxonomies/categories is rejected with 403 Forbidden")
    void createCategory_candidate_rejectedWith403() throws Exception {
        Category cat = Category.builder().name("Hacked Category").build();

        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories")
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("candidate"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cat)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verify(taxonomyService, never()).createCategory(any());
    }

    @Test
    @DisplayName("5. Candidate DELETE /api/v1/recruitment/taxonomies/categories/{id} is rejected with 403 Forbidden")
    void deleteCategory_candidate_rejectedWith403() throws Exception {
        mockMvc.perform(delete("/api/v1/recruitment/taxonomies/categories/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("candidate")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verify(taxonomyService, never()).deleteCategory(any());
    }

    @Test
    @DisplayName("6. Employer POST /api/v1/recruitment/taxonomies/categories is rejected with 403 Forbidden")
    void createCategory_employer_rejectedWith403() throws Exception {
        Category cat = Category.builder().name("Employer Category").build();

        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories")
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("employer"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cat)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verify(taxonomyService, never()).createCategory(any());
    }

    @Test
    @DisplayName("7. Employer DELETE /api/v1/recruitment/taxonomies/categories/{id} is rejected with 403 Forbidden")
    void deleteCategory_employer_rejectedWith403() throws Exception {
        mockMvc.perform(delete("/api/v1/recruitment/taxonomies/categories/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("employer")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verify(taxonomyService, never()).deleteCategory(any());
    }

    @Test
    @DisplayName("8. Admin POST /api/v1/recruitment/taxonomies/categories is permitted (200 OK)")
    void createCategory_admin_permitted() throws Exception {
        UUID catId = UUID.randomUUID();
        Category cat = Category.builder().id(catId).name("Admin Category").build();
        when(taxonomyService.createCategory(any())).thenReturn(cat);

        mockMvc.perform(post("/api/v1/recruitment/taxonomies/categories")
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cat)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(catId.toString()))
                .andExpect(jsonPath("$.name").value("Admin Category"));

        verify(taxonomyService, times(1)).createCategory(any());
    }

    @Test
    @DisplayName("9. Admin DELETE /api/v1/recruitment/taxonomies/categories/{id} is permitted (204 No Content)")
    void deleteCategory_admin_permitted() throws Exception {
        UUID catId = UUID.randomUUID();
        doNothing().when(taxonomyService).deleteCategory(catId);

        mockMvc.perform(delete("/api/v1/recruitment/taxonomies/categories/" + catId)
                        .header(HttpHeaders.AUTHORIZATION, createBearerToken("admin")))
                .andExpect(status().isNoContent());

        verify(taxonomyService, times(1)).deleteCategory(catId);
    }
}
