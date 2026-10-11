package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.dto.JobSearchCriteria;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.model.JobSkill;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class JobSpecification {

    public static Specification<Job> build(JobSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Luôn chỉ lấy jobs chưa bị soft-delete
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Lọc theo status
            if (criteria.getStatus() != null && !criteria.getStatus().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("status")), criteria.getStatus().toLowerCase()));
            }

            // 3. Keyword search (title hoặc location)
            if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
                String pattern = "%" + criteria.getKeyword().toLowerCase().trim() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate locMatch = cb.like(cb.lower(root.get("location")), pattern);
                predicates.add(cb.or(titleMatch, locMatch));
            }

            // 4. Category
            if (criteria.getCategoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), criteria.getCategoryId()));
            }

            // 5. Level
            if (criteria.getLevel() != null && !criteria.getLevel().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("level")), criteria.getLevel().toLowerCase()));
            }

            // 6. Work type
            if (criteria.getWorkType() != null && !criteria.getWorkType().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("workType")), criteria.getWorkType().toLowerCase()));
            }

            // 7. Location cụ thể
            if (criteria.getLocation() != null && !criteria.getLocation().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location")), "%" + criteria.getLocation().toLowerCase().trim() + "%"));
            }

            // 8. Salary filter
            if (criteria.getSalaryMin() != null) {
                Predicate minMatch = cb.greaterThanOrEqualTo(root.get("salaryMax"), criteria.getSalaryMin());
                Predicate singleMatch = cb.greaterThanOrEqualTo(root.get("salaryMin"), criteria.getSalaryMin());
                predicates.add(cb.or(minMatch, singleMatch));
            }
            if (criteria.getSalaryMax() != null) {
                Predicate maxMatch = cb.lessThanOrEqualTo(root.get("salaryMin"), criteria.getSalaryMax());
                predicates.add(maxMatch);
            }

            // 9. Skill filter (Job có chứa ít nhất 1 trong các skillIds truyền vào)
            if (criteria.getSkillIds() != null && !criteria.getSkillIds().isEmpty()) {
                query.distinct(true);
                Join<Job, JobSkill> jobSkillJoin = root.join("jobSkills", JoinType.INNER);
                predicates.add(jobSkillJoin.get("skill").get("id").in(criteria.getSkillIds()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
