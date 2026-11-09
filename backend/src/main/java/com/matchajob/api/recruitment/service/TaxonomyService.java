package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.model.Skill;
import com.matchajob.api.recruitment.model.enums.JobLevel;
import com.matchajob.api.recruitment.model.enums.WorkType;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.api.recruitment.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaxonomyService {

    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;
    private final JobRepository jobRepository;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findByDeletedAtIsNullOrderBySortOrderAscNameAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public Category createCategory(Category category) {
        if (category.getName() != null && categoryRepository.findByNameIgnoreCase(category.getName()).isPresent()) {
            throw new IllegalArgumentException("Category with name " + category.getName() + " already exists");
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + id));
        categoryRepository.delete(category);
    }

    public List<String> getWorkTypes() {
        return Arrays.stream(WorkType.values())
                .map(WorkType::getValue)
                .toList();
    }

    public List<String> getLevels() {
        return Arrays.stream(JobLevel.values())
                .map(JobLevel::getValue)
                .toList();
    }

    public List<String> getSkills() {
        List<String> skills = skillRepository.findByDeletedAtIsNullOrderByNameAsc().stream()
                .map(Skill::getName)
                .toList();
        if (skills.isEmpty()) {
            return List.of("Java", "Spring Boot", "React", "PostgreSQL", "Docker", "Kubernetes", "Python");
        }
        return skills;
    }
}
