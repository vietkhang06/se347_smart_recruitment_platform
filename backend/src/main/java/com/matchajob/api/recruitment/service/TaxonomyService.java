package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.model.CategoryEntity;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaxonomyService {
    private final CategoryRepository categoryRepository;
    private final JobRepository jobRepository; // To check usage

    public List<CategoryEntity> getAllCategories() {
        return categoryRepository.findAll();
    }

    public CategoryEntity createCategory(CategoryEntity category) {
        if (categoryRepository.findByName(category.getName()).isPresent()) {
            throw new IllegalArgumentException("Category with name " + category.getName() + " already exists");
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        // Simple usage check (assuming taxonomy name is in title for now based on project scope, or related entity exists)
        // In this project context, this is a placeholder check
        if (jobRepository.existsByTitle(categoryRepository.findById(id).map(CategoryEntity::getName).orElse(""))) {
             throw new IllegalStateException("Cannot delete category currently in use");
        }
        categoryRepository.deleteById(id);
    }

    public List<String> getWorkTypes() {
        return List.of("full_time", "part_time", "hybrid", "remote", "contract");
    }

    public List<String> getLevels() {
        return List.of("Intern", "Junior", "Mid", "Senior", "Lead", "Manager");
    }

    public List<String> getSkills() {
        return List.of("Java", "Spring Boot", "React", "PostgreSQL", "Docker", "Kubernetes", "Python");
    }
}
