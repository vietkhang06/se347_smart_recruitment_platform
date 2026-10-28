package com.matchajob.matching.service;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.matching.repository.EmbeddingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("JobEmbeddingService Unit Tests")
class JobEmbeddingServiceTest {

    private AiWorkerClient aiWorkerClient;
    private EmbeddingRepository embeddingRepository;
    private JobEmbeddingService service;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        embeddingRepository = mock(EmbeddingRepository.class);
        service = new JobEmbeddingService(aiWorkerClient, embeddingRepository);
    }

    @Test
    @DisplayName("generateAndSaveJobEmbedding successfully extracts, generates 1536d vector, and persists")
    void generateAndSaveJobEmbedding_success() {
        UUID jobId = UUID.randomUUID();
        Job job = Job.builder()
                .id(jobId)
                .title("Senior Java Developer")
                .description("Build high-concurrency microservices with Spring Boot.")
                .requirements("Java 21, Spring Boot 3, PostgreSQL, Docker.")
                .summaryRequired("Java, Spring Boot")
                .summaryPreferred("Kubernetes, Kafka")
                .build();

        List<Float> mockVector = Collections.nCopies(1536, 0.025f);
        EmbeddingsResponse mockResponse = EmbeddingsResponse.builder()
                .dimension(1536)
                .embeddings(List.of(mockVector))
                .model("text-embedding-3-small")
                .build();

        when(aiWorkerClient.generateEmbeddings(any())).thenReturn(mockResponse);

        boolean result = service.generateAndSaveJobEmbedding(job);

        assertThat(result).isTrue();
        InOrder inOrder = inOrder(embeddingRepository);
        inOrder.verify(embeddingRepository).deleteEmbedding("job", jobId);
        inOrder.verify(embeddingRepository).saveEmbedding(
                any(UUID.class),
                eq("job"),
                eq(jobId),
                eq(0),
                contains("Senior Java Developer"),
                eq(mockVector)
        );
    }

    @Test
    @DisplayName("generateAndSaveJobEmbedding safely rejects empty or null jobs")
    void generateAndSaveJobEmbedding_nullOrEmpty() {
        assertThat(service.generateAndSaveJobEmbedding(null)).isFalse();

        Job emptyJob = Job.builder().id(UUID.randomUUID()).title("").build();
        assertThat(service.generateAndSaveJobEmbedding(emptyJob)).isFalse();

        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("generateAndSaveJobEmbedding catches AI worker failure safely and clears stale embedding")
    void generateAndSaveJobEmbedding_handlesProviderFailure() {
        UUID jobId = UUID.randomUUID();
        Job job = Job.builder()
                .id(jobId)
                .title("DevOps Engineer")
                .requirements("Docker, Kubernetes, AWS")
                .build();

        when(aiWorkerClient.generateEmbeddings(any())).thenThrow(new RuntimeException("AI Worker Connection Refused"));

        boolean result = service.generateAndSaveJobEmbedding(job);

        assertThat(result).isFalse();
        verify(embeddingRepository).deleteEmbedding("job", jobId);
        verify(embeddingRepository, never()).saveEmbedding(any(), any(), any(), anyInt(), any(), any());
    }

    @Test
    @DisplayName("deleteJobEmbedding deletes persisted embedding and swallows errors")
    void deleteJobEmbedding_successAndFailure() {
        UUID jobId = UUID.randomUUID();
        service.deleteJobEmbedding(jobId);
        verify(embeddingRepository).deleteEmbedding("job", jobId);

        doThrow(new RuntimeException("DB Connection Timeout")).when(embeddingRepository).deleteEmbedding(any(), any());
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> service.deleteJobEmbedding(jobId));
    }
}
