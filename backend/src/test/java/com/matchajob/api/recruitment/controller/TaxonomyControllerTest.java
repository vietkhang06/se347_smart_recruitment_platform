package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.model.CategoryEntity;
import com.matchajob.api.recruitment.service.TaxonomyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaxonomyController.class)
class TaxonomyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaxonomyService taxonomyService;

    @Test
    void testGetCategories() throws Exception {
        CategoryEntity category = new CategoryEntity();
        category.setId(1L);
        category.setName("IT / Software");
        category.setSlug("it-software");

        when(taxonomyService.getAllCategories()).thenReturn(List.of(category));

        mockMvc.perform(get("/api/v1/recruitment/taxonomies/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("IT / Software"));
    }

    @Test
    void testGetWorkTypes() throws Exception {
        when(taxonomyService.getWorkTypes()).thenReturn(List.of("remote", "hybrid"));

        mockMvc.perform(get("/api/v1/recruitment/taxonomies/work-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("remote"));
    }
}
