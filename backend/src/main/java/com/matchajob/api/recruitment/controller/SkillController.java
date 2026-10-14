package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.dto.SkillResponse;
import com.matchajob.api.recruitment.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping
    public ResponseEntity<List<SkillResponse>> getSkills(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(skillService.getSkills(categoryId, q));
    }
}
