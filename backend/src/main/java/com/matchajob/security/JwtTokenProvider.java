package com.matchajob.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private final String jwtSecret;
    private final long expirationMs;
    private volatile SecretKey cachedKey;

    public JwtTokenProvider(
            @Value("${security.jwt.secret}") String jwtSecret,
            @Value("${security.jwt.expiration-ms:3600000}") long expirationMs
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalArgumentException("JWT secret configuration must not be null or blank");
        }
        this.jwtSecret = jwtSecret.trim();
        this.expirationMs = expirationMs;
        this.cachedKey = initSigningKey(this.jwtSecret);
    }

    private static SecretKey initSigningKey(String secret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (Exception e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            byte[] rawUtf8Bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (rawUtf8Bytes.length >= 32) {
                keyBytes = rawUtf8Bytes;
            }
        }
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException(
                    "JWT secret key must be at least 256 bits (32 bytes) for HS256 algorithm. Current length: " + (keyBytes.length * 8) + " bits"
            );
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private SecretKey getSigningKey() {
        return cachedKey;
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    /**
     * Generates a signed JWT access token with HS256 algorithm.
     * Strictly emits only standard claims: sub (userId), iat, exp.
     * Email, role, and companyId claims are strictly excluded.
     */
    public String generateToken(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID must not be null when generating token");
        }
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Backward-compatible overload for callers passing email and role.
     * Strictly emits only sub, iat, exp.
     * The email and role arguments are ignored and not included in claims.
     */
    public String generateToken(UUID userId, String email, String role) {
        return generateToken(userId);
    }

    /**
     * Validates signature, structure, and expiration safely without logging sensitive token data.
     */
    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Expired, unsupported, malformed, or invalid signature
            return false;
        }
    }

    /**
     * Parses claims using the verified signing key.
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts and validates user UUID from subject claim.
     */
    public UUID getUserIdFromToken(String token) {
        Claims claims = parseClaims(token);
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Subject claim is missing or blank");
        }
        return UUID.fromString(subject);
    }

    /**
     * Extracts email claim (informational display only).
     */
    public String getEmailFromToken(String token) {
        Claims claims = parseClaims(token);
        return claims.get("email", String.class);
    }

    /**
     * Extracts role claim (informational display only; authorization MUST use DB lookup).
     */
    public String getRoleFromToken(String token) {
        Claims claims = parseClaims(token);
        return claims.get("role", String.class);
    }
}
