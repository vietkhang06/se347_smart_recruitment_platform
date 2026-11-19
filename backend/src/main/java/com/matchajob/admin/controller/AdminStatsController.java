package com.matchajob.admin.controller;

import com.matchajob.api.recruitment.dto.JobStatsSummaryDto;
import com.matchajob.api.recruitment.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Statistics", description = "System-wide administrative statistics and reporting endpoints")
@RestController
@RequestMapping("/v1/admin/stats")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatsService statsService;

    @Operation(
            summary = "Get system-wide job statistics",
            description = "Provides comprehensive aggregates including active, expired, draft, paused, closed jobs, and breakdowns by category, level, work type, total applicants, and total views.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires ADMIN role")
    })
    @GetMapping("/jobs")
    public ResponseEntity<JobStatsSummaryDto> getJobStatistics() {
        return ResponseEntity.ok(statsService.getComprehensiveJobStats());
    }
}

