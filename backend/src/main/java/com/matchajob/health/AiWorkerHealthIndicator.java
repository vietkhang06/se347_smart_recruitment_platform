package com.matchajob.health;

import com.matchajob.client.AiWorkerClient;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class AiWorkerHealthIndicator implements HealthIndicator {
    private final AiWorkerClient aiWorkerClient;

    public AiWorkerHealthIndicator(AiWorkerClient aiWorkerClient) {
        this.aiWorkerClient = aiWorkerClient;
    }

    @Override
    public Health health() {
        return aiWorkerClient.isHealthy() ? Health.up().build() : Health.down().build();
    }
}
