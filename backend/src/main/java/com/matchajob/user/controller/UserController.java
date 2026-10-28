package com.matchajob.user.controller;

import com.matchajob.security.SecurityUtils;
import com.matchajob.user.dto.UpdateCurrentUserRequest;
import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.service.UserService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "User", description = "Current authenticated user profile endpoints")
@Slf4j
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(
            summary = "Get current user profile",
            description = "Returns profile of authenticated user. Includes active companies array for Employers; returns empty array for Candidates.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Account suspended or pending email verification"),
            @ApiResponse(responseCode = "404", description = "User not found or soft-deleted")
    })
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(Authentication authentication) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        UserProfileResponse response = userService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Update current user profile",
            description = "Partially updates the authenticated user's base profile. Allowed fields: fullName, phone, avatarUrl, timezone. "
                    + "Privileged fields (email, role, status, is_verified, password_hash) are never writable.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error on request payload"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Account suspended or pending email verification"),
            @ApiResponse(responseCode = "404", description = "User not found or soft-deleted")
    })
    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> updateCurrentUser(
            Authentication authentication,
            @Valid @RequestBody(required = false) UpdateCurrentUserRequest request
    ) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        UpdateCurrentUserRequest safeRequest = request != null ? request : new UpdateCurrentUserRequest();
        UserProfileResponse response = userService.updateCurrentUserProfile(userId, safeRequest);
        return ResponseEntity.ok(response);
    }
}
