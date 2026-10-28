package com.matchajob.user.controller;

import com.matchajob.security.SecurityUtils;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CompanySummaryResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.dto.UpdateCompanyRequest;
import com.matchajob.user.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Company", description = "Company profile and enterprise management endpoints")
@Slf4j
@RestController
@RequestMapping("/v1/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @Operation(
            summary = "Get company profile by ID",
            description = "Retrieves public company profile details and perks by company ID"
    )
    @GetMapping("/{id}")
    public ResponseEntity<CompanyResponse> getCompanyById(@PathVariable UUID id) {
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    @Operation(
            summary = "List companies managed by the current employer",
            description = "Returns every active company where the authenticated employer is the owner or a member.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Companies retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires EMPLOYER role")
    })
    @GetMapping
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<List<CompanySummaryResponse>> listEmployerCompanies(Authentication authentication) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(companyService.getEmployerCompanies(userId));
    }

    @Operation(
            summary = "Get employer company profile",
            description = "Retrieves the company profile for the authenticated employer user",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<CompanyResponse> getEmployerCompany(Authentication authentication) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(companyService.getEmployerCompany(userId));
    }

    @Operation(
            summary = "Create a new company",
            description = "Creates a new company and automatically registers the authenticated employer as owner in company_members in a single atomic transaction.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Company created successfully with owner membership"),
            @ApiResponse(responseCode = "400", description = "Validation error on request payload"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: only employers can create companies"),
            @ApiResponse(responseCode = "409", description = "Conflict: company with this tax code already exists")
    })
    @PostMapping
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<CompanyResponse> createCompany(
            Authentication authentication,
            @Valid @RequestBody CreateCompanyRequest request
    ) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        CompanyResponse response = companyService.createCompany(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "Update company profile",
            description = "Updates company details and perks for an owned or managed company",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<CompanyResponse> updateCompany(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCompanyRequest request
    ) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(companyService.updateCompany(userId, id, request));
    }

    @Operation(
            summary = "Patch company profile",
            description = "Partially updates company details and perks",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<CompanyResponse> patchCompany(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCompanyRequest request
    ) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(companyService.updateCompany(userId, id, request));
    }
}
