package com.matchajob.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String TEST_SECRET = "dGhpc19pc19hX3Zlcnlfc2VjdXJlX2p3dF9zZWNyZXRfa2V5X2Zvcl9tYXRjaGFqb2JfZGV2XzIwMjY=";
    private static final long ONE_HOUR_MS = 3600000L;

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(TEST_SECRET, ONE_HOUR_MS);
    }

    @Test
    @DisplayName("1. Generates valid token with strictly sub, iat, exp claims (email and role claims omitted)")
    void generateToken_success() {
        UUID userId = UUID.randomUUID();
        String token = tokenProvider.generateToken(userId);

        assertThat(token).isNotBlank();
        assertThat(tokenProvider.validateToken(token)).isTrue();

        io.jsonwebtoken.Claims claims = tokenProvider.parseClaims(token);

        // Verify the 3 kept claims
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.getIssuedAt()).isNotNull();
        assertThat(claims.getExpiration()).isNotNull();
        assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(userId);

        // Verify the 2 dropped claims (email, role) and companyId are strictly null
        assertThat(claims.get("email")).isNull();
        assertThat(claims.get("role")).isNull();
        assertThat(claims.get("companyId")).isNull();
        assertThat(tokenProvider.getEmailFromToken(token)).isNull();
        assertThat(tokenProvider.getRoleFromToken(token)).isNull();
    }

    @Test
    @DisplayName("1b. Overload generateToken(userId, email, role) also strictly omits email and role claims")
    void generateToken_overloadOmitsEmailAndRole() {
        UUID userId = UUID.randomUUID();
        String token = tokenProvider.generateToken(userId, "candidate@example.com", "candidate");

        assertThat(token).isNotBlank();
        assertThat(tokenProvider.validateToken(token)).isTrue();

        io.jsonwebtoken.Claims claims = tokenProvider.parseClaims(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.getIssuedAt()).isNotNull();
        assertThat(claims.getExpiration()).isNotNull();
        assertThat(claims.get("email")).isNull();
        assertThat(claims.get("role")).isNull();
    }

    @Test
    @DisplayName("2. validateToken returns false for token signed with a different key")
    void validateToken_invalidSignature() {
        String otherSecret = "YW5vdGhlcl92ZXJ5X3NlY3VyZV9qd3Rfc2VjcmV0X2tleV9mb3JfbWF0Y2hham9iXzIwMjZfMTIzNDU2Nzg=";
        JwtTokenProvider otherProvider = new JwtTokenProvider(otherSecret, ONE_HOUR_MS);

        UUID userId = UUID.randomUUID();
        String tokenFromOther = otherProvider.generateToken(userId, "user@example.com", "candidate");

        assertThat(tokenProvider.validateToken(tokenFromOther)).isFalse();
    }

    @Test
    @DisplayName("3. validateToken returns false for expired token")
    void validateToken_expiredToken() throws InterruptedException {
        // Expiration of -1000ms forces an already-expired token
        JwtTokenProvider expiredProvider = new JwtTokenProvider(TEST_SECRET, -1000L);
        UUID userId = UUID.randomUUID();
        String token = expiredProvider.generateToken(userId, "user@example.com", "candidate");

        assertThat(tokenProvider.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("4. validateToken returns false for malformed or blank token")
    void validateToken_malformedToken() {
        assertThat(tokenProvider.validateToken(null)).isFalse();
        assertThat(tokenProvider.validateToken("")).isFalse();
        assertThat(tokenProvider.validateToken("   ")).isFalse();
        assertThat(tokenProvider.validateToken("not.a.valid.jwt.token")).isFalse();
    }

    @Test
    @DisplayName("5. Constructor rejects null or blank secret with IllegalArgumentException")
    void constructor_rejectsNullOrBlankSecret() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new JwtTokenProvider(null, ONE_HOUR_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JWT secret configuration must not be null or blank");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new JwtTokenProvider("", ONE_HOUR_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JWT secret configuration must not be null or blank");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new JwtTokenProvider("   ", ONE_HOUR_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JWT secret configuration must not be null or blank");
    }

    @Test
    @DisplayName("6. Constructor rejects secret shorter than 256 bits (32 bytes) without padding")
    void constructor_rejectsWeakSecret() {
        // 16-character string is only 128 bits (insufficient for HS256)
        String shortSecret = "too_short_secret";
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new JwtTokenProvider(shortSecret, ONE_HOUR_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JWT secret key must be at least 256 bits (32 bytes)");
    }

    @Test
    @DisplayName("7. Constructor accepts plain UTF-8 secret of at least 32 bytes")
    void constructor_acceptsPlainUtf8Secret() {
        String validUtf8Secret = "this_is_a_plain_text_secret_key_with_at_least_32_bytes_length!";
        JwtTokenProvider provider = new JwtTokenProvider(validUtf8Secret, ONE_HOUR_MS);
        UUID userId = UUID.randomUUID();
        String token = provider.generateToken(userId, "test@example.com", "candidate");
        assertThat(provider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("8. Expiration getters return configured duration in seconds and milliseconds")
    void expirationGetters_returnConfiguredValues() {
        assertThat(tokenProvider.getExpirationMs()).isEqualTo(ONE_HOUR_MS);
        assertThat(tokenProvider.getExpirationSeconds()).isEqualTo(3600L);
    }
}
