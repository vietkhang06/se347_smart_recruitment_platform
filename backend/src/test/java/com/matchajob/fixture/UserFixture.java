package com.matchajob.fixture;

import com.matchajob.user.model.User;

import java.time.Instant;
import java.util.UUID;

public final class UserFixture {

    private UserFixture() {
    }

    public static User createCandidateUser(UUID userId, String email) {
        return User.builder()
                .id(userId != null ? userId : UUID.randomUUID())
                .email(email != null ? email : "candidate." + UUID.randomUUID() + "@example.com")
                .fullName("Test Candidate")
                .role("candidate")
                .status("active")
                .isVerified(true)
                .passwordHash("$2a$10$N9qo8uLOickgx2ZMRZoMye.I5tL2a44p1h7rYqZ2j8qW1aF1v1W1q")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    public static User createEmployerUser(UUID userId, String email) {
        return User.builder()
                .id(userId != null ? userId : UUID.randomUUID())
                .email(email != null ? email : "employer." + UUID.randomUUID() + "@example.com")
                .fullName("Test Employer")
                .role("employer")
                .status("active")
                .isVerified(true)
                .passwordHash("$2a$10$N9qo8uLOickgx2ZMRZoMye.I5tL2a44p1h7rYqZ2j8qW1aF1v1W1q")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    public static User createAdminUser(UUID userId, String email) {
        return User.builder()
                .id(userId != null ? userId : UUID.randomUUID())
                .email(email != null ? email : "admin." + UUID.randomUUID() + "@example.com")
                .fullName("Test Admin")
                .role("admin")
                .status("active")
                .isVerified(true)
                .passwordHash("$2a$10$N9qo8uLOickgx2ZMRZoMye.I5tL2a44p1h7rYqZ2j8qW1aF1v1W1q")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
