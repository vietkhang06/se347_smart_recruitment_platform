package com.matchajob.user.controller;

import com.matchajob.user.dto.UserProfileResponse;
import com.matchajob.user.exception.UserNotAuthenticatedException;
import com.matchajob.user.model.User;
import com.matchajob.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException("Full authentication is required to access this resource");
        }

        UUID userId = extractUserId(authentication);
        UserProfileResponse response = userService.getCurrentUserProfile(userId);
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
