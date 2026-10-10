package com.matchajob.health;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PgVectorHealthIndicatorTest {

    @Mock
    private JdbcClient jdbcClient;

    @Mock
    private JdbcClient.StatementSpec statementSpec;

    @Mock
    private JdbcClient.MappedQuerySpec<String> querySpec;

    @Test
    void health_whenPgVectorInstalled_returnsUpWithDetails() {
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
        when(statementSpec.query(String.class)).thenReturn(querySpec);
        when(querySpec.optional()).thenReturn(Optional.of("0.8.0"));

        PgVectorHealthIndicator indicator = new PgVectorHealthIndicator(jdbcClient);
        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsEntry("extension", "vector");
        assertThat(health.getDetails()).containsEntry("version", "0.8.0");
        assertThat(health.getDetails()).containsEntry("status", "INSTALLED_AND_ACTIVE");
    }

    @Test
    void health_whenPgVectorNotInstalled_returnsDownWithDetails() {
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
        when(statementSpec.query(String.class)).thenReturn(querySpec);
        when(querySpec.optional()).thenReturn(Optional.empty());

        PgVectorHealthIndicator indicator = new PgVectorHealthIndicator(jdbcClient);
        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsEntry("extension", "vector");
        assertThat(health.getDetails()).containsKey("error");
    }

    @Test
    void health_whenQueryFails_returnsDownWithException() {
        when(jdbcClient.sql(anyString())).thenThrow(new RuntimeException("DB Connection refused"));

        PgVectorHealthIndicator indicator = new PgVectorHealthIndicator(jdbcClient);
        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsEntry("error", "Cannot query PostgreSQL pg_extension catalog");
    }
}
