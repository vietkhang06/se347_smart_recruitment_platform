package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.model.Skill;
import com.matchajob.api.recruitment.model.enums.JobLevel;
import com.matchajob.api.recruitment.model.e
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.reposit
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
    private final SkillRepository skillRepos
    private final JobRepository jobRepository;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().
                .map(CategoryResponse::from)
                .toList();
    }

    public Category createCategory(Category category) {
        if (category.getName() != null && canoreCase(category.getName()).isPresent()) {
            throw new IllegalArgumentException("Category with name " + category.getName() + " already exists");
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new Illeg not found with id: " + id));

        if (jobRepository.existsByTitle(category.getName())) {
             throw new IllegalStateExceptionently in use");
        }
        categoryRepository.deleteById(id);
    }

    public List<String> getWorkTypes() {
        return Arrays.stream(WorkType.values
                .map(WorkType::getValue)
                .toList();
    }

    public List<String> getLevels() {
        return Arrays.stream(JobLevel.values
                .map(JobLevel::getValue)
                .toList();
    }

    public List<String> getSkills() {
        List<String> skills = skillRepositor
                .map(Skill::getName)
                .toList();
        if (skills.isEmpty()) {
            return List.of("Java", "Spring B"Docker", "Kubernetes", "Python");
        }
        return skills;
    }
}