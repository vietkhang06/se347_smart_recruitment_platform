package com.matchajob.api.recruitment.config;

import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.model.Skill;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("!prod")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("Running DataSeeder...");
        seedCategories();
        seedSkills();
    }

    private void seedCategories() {
        if (categoryRepository.count() > 0) return;

        log.info("Seeding categories...");
        List<String> categories = List.of("IT / Software", "Marketing", "Sales", "Design", "HR", "Finance / Accounting", "Customer Service", "Data / Analytics");
        for (String name : categories) {
            categoryRepository.save(Category.builder().name(name).status("visible").sortOrder((short) 1).build());
        }
    }

    private void seedSkills() {
        if (skillRepository.count() > 0) return;

        log.info("Seeding skills...");
        List<String> skills = List.of("Java", "Spring Boot", "React", "PostgreSQL", "Docker", "Kubernetes", "Python", "TypeScript", "Node.js", "AWS", "SEO", "Google Ads", "Content Writing", "Figma", "Adobe XD", "CRM", "Excel", "SQL", "Power BI", "Tableau");
        for (String name : skills) {
            skillRepository.save(Skill.builder().name(name).build());
        }
    }
}
