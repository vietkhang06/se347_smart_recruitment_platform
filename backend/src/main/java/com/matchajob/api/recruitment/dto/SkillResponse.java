package com.matchajob.api.recruitment.dto;

import com.matchajob.api.recruitment.model.Skill;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {
    private UUID id;
    private String name;
    private UUID categoryId;

    public static SkillResponse from(Skill skill) {
        if (skill == null) return null;
        return SkillResponse.builder()
                .id(skill.getId())
                .name(skill.getName())
                .categoryId(skill.getCategory() != null ? skill.getCategory().getId() : null)
                .build();
    }
}
