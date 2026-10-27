package com.matchajob.api.recruitment.repository;

import com.matchajob.api.recruitment.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByDeletedAtIsNullOrderBySortOrderAscNameAsc();
    Optional<Category> findByNameIgnoreCase(String name);
}
