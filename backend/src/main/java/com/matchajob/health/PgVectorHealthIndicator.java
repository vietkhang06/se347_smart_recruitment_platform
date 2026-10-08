package com.matchajob.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PgVectorHealthIndicator implements HealthIndicator {

    private final JdbcClient jdbcClient;

    public PgVectorHealthIndicator(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Health health() {
        try {
            // Query PostgreSQL system catalog pg_extension to verify pgvector is actively installed
            Optional<String> versionOpt = jdbcClient.sql("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                    .query(String.class)
                    .optional();

            if (versionOpt.isPresent()) {
                return Health.up()
                        .withDetail("extension", "vector")
                        .withDetail("version", versionOpt.get())
                        .withDetail("status", "INSTALLED_AND_ACTIVE")
                        .build();
            } else {
                return Health.down()
                        .withDetail("extension", "vector")
                        .withDetail("error", "Extension 'vector' is not installed in current database")
                        .build();
            }
        } catch (Exception ex) {
            return Health.down(ex)
                    .withDetail("error", "Cannot query PostgreSQL pg_extension catalog")
                    .build();
        }
    }
}
