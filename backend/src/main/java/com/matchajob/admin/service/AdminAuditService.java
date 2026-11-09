package com.matchajob.admin.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Writes admin actions to {@code audit_logs}, mirroring {@code CvAccessAuditService}.
 *
 * <p>The metadata payload is serialized by {@link #jsonString(String)} rather than a
 * shared ObjectMapper so this service has no extra bean dependency; the escaping
 * covers quotes, backslashes and every control character below U+0020, which is
 * exactly what makes a {@code CAST(? AS jsonb)} fail.</p>
 *
 * <p>Audit failures propagate, rolling back the surrounding transaction: an account
 * state change that cannot be attributed must not be committed.</p>
 */
@Slf4j
@Service
public class AdminAuditService {

    private final JdbcClient jdbcClient;

    public AdminAuditService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void recordUserStatusChange(
            UUID actorId,
            UUID targetUserId,
            String action,
            String previousStatus,
            String newStatus,
            String reason
    ) {
        String metadata = "{"
                + "\"previous_status\":" + jsonString(previousStatus) + ","
                + "\"new_status\":" + jsonString(newStatus) + ","
                + "\"reason\":" + jsonString(reason != null ? reason : "")
                + "}";

        jdbcClient.sql("""
                INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, metadata, status)
                VALUES (?, 'user', ?, 'user', ?, CAST(? AS jsonb), 'success')
                """)
                .params(actorId, action, targetUserId.toString(), metadata)
                .update();

        log.info("Audit: actor {} performed {} on user {} ({} -> {})",
                actorId, action, targetUserId, previousStatus, newStatus);
    }

    /**
     * Renders a Java string as a JSON string literal, escaping everything the JSON
     * grammar forbids. Control characters other than the named escapes become \\uXXXX
     * so no input can break the surrounding jsonb document.
     */
    private String jsonString(String value) {
        StringBuilder sb = new StringBuilder(value.length() + 2);
        sb.append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }
}
