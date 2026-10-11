package com.matchajob.security;

import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final boolean requireEmailVerification;

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            @Value("${app.auth.require-email-verification:true}") boolean requireEmailVerification
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.requireEmailVerification = requireEmailVerification;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            UUID userId;
            try {
                userId = jwtTokenProvider.getUserIdFromToken(token);
            } catch (Exception e) {
                log.debug("Failed to extract user UUID from token: {}", e.getMessage());
                filterChain.doFilter(request, response);
                return;
            }

            // Database lookup on every protected request for instant status & role verification
            User user;
            try {
                user = userRepository.findById(userId).orElse(null);
            } catch (DataAccessException dae) {
                // DB outage/failure: MUST NOT swallow or mask as a token/auth failure (401/403)
                log.error("Database unavailable during authentication lookup for user UUID {}: {}", userId, dae.getMessage());
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType("application/problem+json");
                response.getWriter().write(
                        "{\"type\":\"https://matchajob.com/errors/internal-server-error\"," +
                        "\"title\":\"Internal Server Error\"," +
                        "\"status\":500," +
                        "\"detail\":\"Authentication service database is temporarily unavailable\"}"
                );
                return;
            }

            // User must exist and not be soft-deleted
            if (user != null && user.getDeletedAt() == null) {
                boolean isSuspended = "suspended".equalsIgnoreCase(user.getStatus());
                boolean isUnverified = requireEmailVerification && Boolean.FALSE.equals(user.getIsVerified());

                // Deny suspended or unverified accounts
                if (!isSuspended && !isUnverified) {
                    // Authority is derived authoritative from DB, NEVER trusting token claim
                    String roleName = user.getRole() != null ? user.getRole().toUpperCase() : "CANDIDATE";
                    var authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleName));

                    var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    log.debug("User {} denied: suspended={}, unverified={}", userId, isSuspended, isUnverified);
                }
            } else {
                log.debug("User {} not found or soft-deleted", userId);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }
}
