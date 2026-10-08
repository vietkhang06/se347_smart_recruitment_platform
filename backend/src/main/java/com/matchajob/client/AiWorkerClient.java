package com.matchajob.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.Map;

@Component
public class AiWorkerClient {

    private static final Logger log = LoggerFactory.getLogger(AiWorkerClient.class);

    private final RestClient restClient;

    public AiWorkerClient(@Qualifier("aiWorkerRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public Map<String, Object> checkHealth() {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            return response != null ? response : Collections.emptyMap();
        } catch (Exception ex) {
            log.warn("Failed to reach AI Worker /health: {}", ex.getMessage());
            throw ex;
        }
    }

    public boolean isHealthy() {
        try {
            Map<String, Object> response = checkHealth();
            return "healthy".equalsIgnoreCase(String.valueOf(response.get("status")));
        } catch (Exception ex) {
            return false;
        }
    }
}
