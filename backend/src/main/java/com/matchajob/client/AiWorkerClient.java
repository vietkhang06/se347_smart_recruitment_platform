package com.matchajob.client;

import com.matchajob.client.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class AiWorkerClient {

    private static final Logger log = LoggerFactory.getLogger(AiWorkerClient.class);

    private final RestClient healthRestClient;
    private final RestClient processingRestClient;

    public AiWorkerClient(@Qualifier("aiWorkerRestClient") RestClient healthRestClient) {
        this(healthRestClient, healthRestClient);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AiWorkerClient(
            @Qualifier("aiWorkerRestClient") RestClient healthRestClient,
            @Qualifier("aiWorkerProcessingClient") RestClient processingRestClient) {
        this.healthRestClient = healthRestClient;
        this.processingRestClient = processingRestClient;
    }

    public Map<String, Object> checkHealth() {
        try {
            Map<String, Object> response = healthRestClient.get()
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

    public CVExtractResponse extractCv(byte[] fileBytes, String filename, String contentType) {
        log.info("Streaming CV to AI Worker for extraction: {} (size: {} bytes)", filename, fileBytes.length);
        ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);

        return processingRestClient.post()
                .uri("/api/v1/cv/extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(CVExtractResponse.class);
    }

    public EmbeddingsResponse generateEmbeddings(List<String> texts) {
        log.info("Requesting 1536-dim embeddings for {} text chunk(s)", texts.size());
        EmbeddingsRequest request = EmbeddingsRequest.builder().texts(texts).build();

        return processingRestClient.post()
                .uri("/api/v1/embeddings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(EmbeddingsResponse.class);
    }

    public MatchScoreResponse calculateMatchScore(MatchScoreRequest request) {
        log.info("Requesting match score evaluation for job: {}", request.getJobTitle());
        return processingRestClient.post()
                .uri("/api/v1/match/score")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(MatchScoreResponse.class);
    }
}
