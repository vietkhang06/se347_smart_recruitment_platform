package com.matchajob.api.recruitment.controller;

import com.matchajob.api.recruitment.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recruitment/stats")
@RequiredArgsConstructor
public class StatsController {
    private final StatsService statsService;

    @GetMapping("/jobs")
    public ResponseEntity<Map<String, Long>> getJobStats() {
        return ResponseEntity.ok(statsService.getJobCountByStatus());
    }
}
