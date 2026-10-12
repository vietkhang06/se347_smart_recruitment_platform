package com.matchajob.user.controller;

import com.matchajob.user.dto.CandidateProfileResponse;
import com.matchajob.user.dto.UpdateCandidateProfileRequest;
import com.matchajob.user.exception.UserNotAuthenticatedException;
import com.matchajob.user.model.User;
import com.matchajob.user.service.CandidateProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Candidate Profile", description = "Candidate profile management endpoints for authenticated candidates")
@Slf4j
@RestController
@RequestMapping("/v1/candidates/profile")
@RequiredArgsConstructor
public class CandidateProfileController {

    private final CandidateProfileService candidateProfileService;

    @Operation(
            summary = "Get current candidate profile",
            description = "Retrieves the candidate profile of the currently authenticated candidate user.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Candidate profile retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires CANDIDATE role, active status, and email verification"),
            @ApiResponse(responseCode = "404", description = "User or candidate profile not found")
    })
    @GetMapping
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<CandidateProfileResponse> getProfile(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        CandidateProfileResponse response = candidateProfileService.getProfile(userId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Update current candidate profile",
            description = "Partially updates candidate profile fields (headline, bio, experience_years, education, location, address) for the currently authenticated candidate user.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Candidate profile updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error on request payload"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires CANDIDATE role, active status, and email verification"),
            @ApiResponse(responseCode = "404", description = "User or candidate profile not found")
    })
    @PatchMapping
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<CandidateProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody(required = false) UpdateCandidateProfileRequest request
    ) {
        UUID userId = extractUserId(authentication);
        UpdateCandidateProfileRequest safeRequest = request != null ? request : new UpdateCandidateProfileRequest();
        CandidateProfileResponse response = candidateProfileService.updateProfile(userId, safeRequest);
        return ResponseEntity.ok(response);
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }

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
