package com.matchajob.security;

import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String TEST_SECRET = "dGhpc19pc19hX3Zlcnlfc2VjdXJlX2p3dF9zZWNyZXRfa2V5X2Zvcl9tYXRjaGFqb2JfZGV2XzIwMjY=";
    private static final long ONE_HOUR_MS = 3600000L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FilterChain filterChain;

    private JwtTokenProvider jwtTokenProvider;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET, ONE_HOUR_MS);
        filter = new JwtAuthenticationFilter(jwtTokenProvider, userRepository, true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("1. Valid token + active user in DB authenticates with DB authority")
    void doFilter_validToken_activeUser_authenticates() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        User dbUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(a -> a.getAuthority().equals("ROLE_CANDIDATE"));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("2. Role is derived from DB, overriding any conflicting token claim")
    void doFilter_roleDerivedFromDbNotToken() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        // Token claims "candidate", but DB user has been promoted to "employer"
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        User dbUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .role("employer")
                .status("active")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(dbUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYER"))
                .noneMatch(a -> a.getAuthority().equals("ROLE_CANDIDATE"));
    }

    @Test
    @DisplayName("3. User not found in DB or soft-deleted does not authenticate")
    void doFilter_userNotFoundOrDeleted_denied() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        // Case A: Not found in DB
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

        // Case B: Soft-deleted
        User deletedUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .deletedAt(Instant.now())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(deletedUser));
        filter.doFilterInternal(request, response, filterChain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("4. Suspended user in DB does not authenticate")
    void doFilter_suspendedUser_denied() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        User suspendedUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .role("candidate")
                .status("suspended")
                .isVerified(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(suspendedUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("5. Unverified user when verification is required does not authenticate")
    void doFilter_unverifiedUser_deniedWhenVerificationRequired() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        User unverifiedUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .role("candidate")
                .status("pending_verification")
                .isVerified(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(unverifiedUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("6. DB outage during lookup returns HTTP 500 and is not masked as 401/403")
    void doFilter_databaseOutage_returns500() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "user@example.com", "candidate");

        when(userRepository.findById(userId)).thenThrow(new QueryTimeoutException("Database connection timed out"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getContentType()).contains("application/problem+json");
        assertThat(response.getContentAsString()).contains("Authentication service database is temporarily unavailable");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        // Request does not proceed down filter chain on 500 error
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("7. Request without Bearer token proceeds filter chain unauthenticated")
    void doFilter_noBearerToken_proceeds() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }
}
