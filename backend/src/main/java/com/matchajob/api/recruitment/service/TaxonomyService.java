package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.CategoryResponse;
import com.matchajob.api.recruitment.model.Skill;
import com.matchajob.api.recruitment.model.enums.JobLevel;
import com.matchajob.api.recruitment.model.enums.WorkType;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaxonomyService {

    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::from)
                .toList();
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
        List<String> skills = skillRepository.findAll().stream()
                .map(Skill::getName)
                .toList();
        if (skills.isEmpty()) {
            return List.of("Java", "Spring Boot", "React", "PostgreSQL", "Docker", "Kubernetes", "Python");
        }
        return skills;
    }
}
