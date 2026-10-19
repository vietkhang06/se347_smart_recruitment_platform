package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.model.CategoryEntity;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaxonomyService {
    private final CategoryRepository categoryRepository;

    public List<CategoryEntity> getAllCategories() {
        return categoryRepository.findAll();
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
