package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.model.CategoryEntity;
import com.matchajob.api.recruitment.service.TaxonomyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recruitment/taxonomies")
@RequiredArgsConstructor
public class TaxonomyController {
    private final TaxonomyService taxonomyService;

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryEntity>> getCategories() {
        return ResponseEntity.ok(taxonomyService.getAllCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryEntity> createCategory(@RequestBody CategoryEntity category) {
        try {
            return ResponseEntity.ok(taxonomyService.createCategory(category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        try {
            taxonomyService.deleteCategory(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
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
