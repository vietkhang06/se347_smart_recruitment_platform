package com.matchajob.admin.controller;

import com.matchajob.admin.dto.AdminUserListResponse;
import com.matchajob.admin.dto.AdminUserSummaryResponse;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.admin.service.AdminUserService;
import com.matchajob.security.SecurityUtils;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Admin Users", description = "Administrative account management endpoints")
@Slf4j
@RestController
@RequestMapping("/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @Operation(
            summary = "List user accounts",
            description = "Paginated list of accounts with optional role, status and keyword filters.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Accounts retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires ADMIN role")
    })
    @GetMapping
    public ResponseEntity<AdminUserListResponse> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(adminUserService.listUsers(page, size, role, status, keyword));
    }

    @Operation(
            summary = "Suspend or reactivate an account",
            description = "Sets status to 'suspended' or 'active'. Self-suspension and suspending the last active admin are rejected with 400.",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account status updated"),
            @ApiResponse(responseCode = "400", description = "Invalid status or refused by a safety rule"),
            @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource"),
            @ApiResponse(responseCode = "403", description = "Access is denied: requires ADMIN role"),
            @ApiResponse(responseCode = "404", description = "Target account not found")
    })
    @PatchMapping("/{id}/status")
    public ResponseEntity<AdminUserSummaryResponse> updateStatus(
            Authentication authentication,
            @PathVariable("id") UUID targetUserId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        UUID adminId = SecurityUtils.extractUserId(authentication);
        return ResponseEntity.ok(adminUserService.updateStatus(adminId, targetUserId, request));
    }

    /**
     * Same operation exposed as PUT for clients that model the status as a replacement.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<AdminUserSummaryResponse> replaceStatus(
            Authentication authentication,
            @PathVariable("id") UUID targetUserId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return updateStatus(authentication, targetUserId, request);
    }
}
