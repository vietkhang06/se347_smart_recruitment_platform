package com.matchajob.user.controller;

import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.dto.UpdateCompanyRequest;
import com.matchajob.user.exception.UserNotAuthenticatedException;
import com.matchajob.user.model.User;
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
import org.springframework.web.bind.annotation.*;

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
        CompanyResponse response = companyService.getCompanyById(id);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Get employer company profile",
            description = "Retrieves the company profile for the authenticated employer user",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<CompanyResponse> getEmployerCompany(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }
        UUID userId = extractUserId(authentication);
        CompanyResponse response = companyService.getEmployerCompany(userId);
        return ResponseEntity.ok(response);
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
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }

        UUID userId = extractUserId(authentication);
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
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }
        UUID userId = extractUserId(authentication);
        CompanyResponse response = companyService.updateCompany(userId, id, request);
        return ResponseEntity.ok(response);
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
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }
        UUID userId = extractUserId(authentication);
        CompanyResponse response = companyService.updateCompany(userId, id, request);
        return ResponseEntity.ok(response);
    }

    private UUID extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            if (user.getId() == null) {
                throw new UserNotAuthenticatedException("Authenticated principal has no valid user identifier");
            }
            return user.getId();
        }
        if (principal instanceof UUID uuid) {
            return uuid;
        }
        if (principal instanceof String str) {
            try {
                return UUID.fromString(str);
            } catch (IllegalArgumentException e) {
                throw new UserNotAuthenticatedException("Invalid principal user ID format: " + str);
            }
        }
        throw new UserNotAuthenticatedException("Unrecognized principal type in security context");
    }
}
