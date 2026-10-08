package com.matchajob.client;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiWorkerClientTest {

    private MockRestServiceServer mockServer;
    private AiWorkerClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8001");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new AiWorkerClient(builder.build());
    }

    @Test
    void checkHealth_whenHealthy_returnsStatusMap() {
        mockServer.expect(requestTo("http://localhost:8001/health"))
                .andRespond(withSuccess("{\"status\":\"healthy\",\"version\":\"0.1.0\",\"service\":\"ai-worker\"}", MediaType.APPLICATION_JSON));

        Map<String, Object> response = client.checkHealth();

        assertThat(response).containsEntry("status", "healthy");
        assertThat(response).containsEntry("service", "ai-worker");
        mockServer.verify();
    }

    @Test
    void isHealthy_whenHealthy_returnsTrue() {
        mockServer.expect(requestTo("http://localhost:8001/health"))
                .andRespond(withSuccess("{\"status\":\"healthy\",\"version\":\"0.1.0\",\"service\":\"ai-worker\"}", MediaType.APPLICATION_JSON));

        boolean healthy = client.isHealthy();

        assertThat(healthy).isTrue();
        mockServer.verify();
    }

    @Test
    void isHealthy_whenServerError_returnsFalse() {
        mockServer.expect(requestTo("http://localhost:8001/health"))
                .andRespond(withServerError());

        boolean healthy = client.isHealthy();

        assertThat(healthy).isFalse();
        mockServer.verify();
    }
}
