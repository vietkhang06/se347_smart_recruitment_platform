package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.SkillResponse;
import com.matchajob.api.recruitment.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;

    @Transactional(readOnly = true)
    public List<SkillResponse> getSkills(UUID categoryId, String query) {
        if (query != null && !query.isBlank()) {
            return skillRepository.searchByName(query.trim())
                    .stream()
                    .map(SkillResponse::from)
                    .collect(Collectors.toList());
        }
        if (categoryId != null) {
            return skillRepository.findByCategoryIdAndDeletedAtIsNullOrderByNameAsc(categoryId)
                    .stream()
                    .map(SkillResponse::from)
                    .collect(Collectors.toList());
        }
        return skillRepository.findByDeletedAtIsNullOrderByNameAsc()
                .stream()
                .map(SkillResponse::from)
                .collect(Collectors.toList());
    }
}
