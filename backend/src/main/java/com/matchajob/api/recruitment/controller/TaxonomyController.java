package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.service.TaxonomyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recruitment/taxonomies")
@RequiredArgsConstructor
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(taxonomyService.getAllCategories());
    }

    @GetMapping("/work-types")
    public ResponseEntity<List<String>> getWorkTypes() {
        return ResponseEntity.ok(taxonomyService.getWorkTypes());
    }

    @GetMapping("/levels")
    public ResponseEntity<List<String>> getLevels() {
        return ResponseEntity.ok(taxonomyService.getLevels());
    }

    @GetMapping("/skills")
    public ResponseEntity<List<String>> getSkills() {
        return ResponseEntity.ok(taxonomyService.getSkills());
    }
}
