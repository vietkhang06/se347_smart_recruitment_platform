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
                .map(CategoryResponse::from).toList();
    }

    public Category createCategory(Category category) {
        if (category.getName() != null && categoryRepository.findByNameIgnoreCase(category.getName()).isPresent()) {
            throw new IllegalArgumentException("Category already exists.");
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(UUID id) {
        if (jobRepository.existsByCategoryId(id)) {
            throw new IllegalStateException("Cannot delete category currently in use.");
        }
        categoryRepository.deleteById(id);
    }

    public List<String> getWorkTypes() {
        return Arrays.stream(WorkType.values()).map(WorkType::getValue).toList();
    }

    public List<String> getLevels() {
        return Arrays.stream(JobLevel.values()).map(JobLevel::getValue).toList();
    }

    public List<String> getSkills() {
        return skillRepository.findByDeletedAtIsNullOrderByNameAsc().stream().map(Skill::getName).toList();
    }
}
