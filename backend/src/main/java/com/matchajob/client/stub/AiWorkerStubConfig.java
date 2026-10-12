package com.matchajob.client.stub;

import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import java.util.List;
import java.util.Map;

/**
 * Spring configuration that replaces the real AiWorkerClient with a stub
 * implementation when the "ai-stub" profile is active.
 *
 * Usage in tests:
 *   @ActiveProfiles({"test", "ai-stub"})
 *
 * Or in application-ai-stub.yml:
 *   ai-worker.mode: stub
 */
@Configuration
@Profile("ai-stub")
public class AiWorkerStubConfig {

    private static final Logger log = LoggerFactory.getLogger(AiWorkerStubConfig.class);

    @Bean
    public AiWorkerStub aiWorkerStub() {
        log.info("AI Worker Stub activated — all AI calls will use deterministic offline responses.");
        return new AiWorkerStub();
    }

    /**
     * Creates a primary AiWorkerClient bean that delegates to the stub.
     * The @Primary annotation ensures this takes precedence over the real client.
     */
    @Bean
    @Primary
    public AiWorkerClient aiWorkerClientStub(AiWorkerStub stub) {
        return new AiWorkerClient(null) {

            @Override
            public Map<String, Object> checkHealth() {
                return stub.checkHealth();
            }

            @Override
            public boolean isHealthy() {
                return true;
            }

            @Override
            public CVExtractResponse extractCv(byte[] fileBytes, String filename, String contentType) {
                return stub.extractCv(fileBytes, filename);
            }

            @Override
            public EmbeddingsResponse generateEmbeddings(List<String> texts) {
                return stub.generateEmbeddings(texts);
            }

            @Override
            public MatchScoreResponse calculateMatchScore(MatchScoreRequest request) {
                return stub.calculateMatchScore(request);
            }
        };
    }
}
