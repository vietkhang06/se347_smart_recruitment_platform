package com.matchajob.cv.service;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CvAccessAuditService {
    private final JdbcClient jdbcClient;

    public CvAccessAuditService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void recordAdminRead(UUID userId, UUID cvId, String action) {
        // Record authorization before returning private content; fail closed if audit persistence fails.
        jdbcClient.sql("""
                INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, status)
                VALUES (?, 'user', ?, 'cv_version', ?, 'authorized')
                """)
                .params(userId, action, cvId.toString())
                .update();
    }
}
