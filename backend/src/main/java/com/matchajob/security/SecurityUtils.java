package com.matchajob.security;

import com.matchajob.user.exception.UserNotAuthenticatedException;
import com.matchajob.user.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Utility helper to safely extract authenticated identity and role from Spring Security Context.
 */
public final class SecurityUtils {

    private SecurityUtils() {
        // Prevent instantiation
    }

    /**
     * Extracts authenticated User UUID from Authentication object.
     * Throws UserNotAuthenticatedException if authentication is null, not authenticated, or invalid.
     */
    public static UUID extractUserId(Authentication authentication) {
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

    /**
     * Extracts authenticated user ID from current SecurityContextHolder context.
     */
    public static UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return extractUserId(authentication);
    }

    /**
     * Checks if the authenticated principal possesses the given role (e.g., 'CANDIDATE', 'EMPLOYER', 'ADMIN').
     */
    public static boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || !authentication.isAuthenticated() || role == null) {
            return false;
        }
        String targetAuthority = "ROLE_" + role.toUpperCase();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (targetAuthority.equalsIgnoreCase(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
