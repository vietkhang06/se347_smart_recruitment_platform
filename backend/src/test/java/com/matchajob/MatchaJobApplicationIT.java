package com.matchajob;

import com.matchajob.health.PgVectorHealthIndicator;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test connecting to a REAL PostgreSQL database instance.
 * Verifies Spring Boot context boot, HikariCP, Flyway V1 migration execution,
 * and pgvector extension registration in pg_extension.
 *
 * Excluded from standard unit tests (`mvn test`).
 * Executed via integration profile: `mvn verify -Pintegration-test`.
 */
@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@Tag("integration")
class MatchaJobApplicationIT {

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PgVectorHealthIndicator pgVectorHealthIndicator;

    @Test
    void contextLoads() {
        assertThat(jdbcClient).isNotNull();
        assertThat(pgVectorHealthIndicator).isNotNull();
    }

    @Test
    void postgresqlIntegration_provesFlywayAndPgVector() {
        // 1. Verify Flyway schema history recorded V1 execution in matchajob_test
        Integer flywayCount = jdbcClient.sql("SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND success = true")
                .query(Integer.class)
                .single();
        assertThat(flywayCount).isGreaterThanOrEqualTo(1);

        // 2. Verify pgvector extension in PostgreSQL system catalog pg_extension
        Optional<String> vectorVersion = jdbcClient.sql("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                .query(String.class)
                .optional();
        assertThat(vectorVersion).isPresent();

        // 3. Verify PgVectorHealthIndicator reports UP backed by real PostgreSQL
        Health health = pgVectorHealthIndicator.health();
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsEntry("status", "INSTALLED_AND_ACTIVE");
        assertThat(health.getDetails()).containsEntry("extension", "vector");
    }
}
