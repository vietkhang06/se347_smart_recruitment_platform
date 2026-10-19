package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SkillRepository extends JpaRepository<Skill, UUID> {
    List<Skill> findByDeletedAtIsNullOrderByNameAsc();

    List<Skill> findByCategoryIdAndDeletedAtIsNullOrderByNameAsc(UUID categoryId);

    Optional<Skill> findByNameIgnoreCase(String name);

    @Query("SELECT s FROM Skill s WHERE s.deletedAt IS NULL AND LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY s.name ASC")
    List<Skill> searchByName(@Param("query") String query);
}
