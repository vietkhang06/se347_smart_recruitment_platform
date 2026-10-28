package com.matchajob.matching.service;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.matching.repository.EmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for generating and persisting 1536-dimensional
 * dense vector embeddings for Job Descriptions (JDs).
 */
@Service
public class JobEmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(JobEmbeddingService.class);

    private final AiWorkerClient aiWorkerClient;
    private final EmbeddingRepository embeddingRepository;

    public JobEmbeddingService(AiWorkerClient aiWorkerClient, EmbeddingRepository embeddingRepository) {
        this.aiWorkerClient = aiWorkerClient;
        this.embeddingRepository = embeddingRepository;
    }

    /**
     * Extracts full JD text, generates a 1536d vector embedding via AI Worker,
     * and persists it into the embeddings table.
     *
     * @param job The recruitment Job entity
     * @return true if embedding was successfully generated and persisted, false otherwise
     */
    public boolean generateAndSaveJobEmbedding(Job job) {
        if (job == null || job.getId() == null) {
            return false;
        }
        String jdText = extractJobText(job);
        if (jdText.isBlank()) {
            log.warn("Job {} has no extractable text content for embedding generation.", job.getId());
            deleteJobEmbedding(job.getId());
            return false;
        }

        try {
            log.info("Generating 1536d vector embedding for job {} ({})", job.getId(), job.getTitle());
            EmbeddingsResponse response = aiWorkerClient.generateEmbeddings(List.of(jdText));
            if (response == null || response.getEmbeddings() == null || response.getEmbeddings().isEmpty()) {
                log.warn("AI Worker returned no embedding for job {}", job.getId());
                deleteJobEmbedding(job.getId());
                return false;
            }
            List<Float> vector = response.getEmbeddings().get(0);
            if (vector == null || vector.size() != EmbeddingRepository.VECTOR_DIMENSION) {
                int size = vector == null ? 0 : vector.size();
                log.warn("Job embedding dimension invalid for job {}: expected {}, got {}",
                        job.getId(), EmbeddingRepository.VECTOR_DIMENSION, size);
                deleteJobEmbedding(job.getId());
                return false;
            }

            // Remove any stale or previous chunk embeddings for this job before saving fresh vector
            embeddingRepository.deleteEmbedding("job", job.getId());
            embeddingRepository.saveEmbedding(UUID.randomUUID(), "job", job.getId(), 0, jdText, vector);
            log.info("Successfully persisted 1536d embedding for job {}", job.getId());
            return true;
        } catch (Exception ex) {
            log.warn("Failed to generate or persist embedding for job {}: {}", job.getId(), ex.getMessage());
            deleteJobEmbedding(job.getId());
            return false;
        }
    }

    /**
     * Deletes any persisted embedding for the specified job.
     * Prevents stale embeddings when an update cannot be indexed or when a job is deleted.
     */
    public void deleteJobEmbedding(UUID jobId) {
        if (jobId == null) {
            return;
        }
        try {
            embeddingRepository.deleteEmbedding("job", jobId);
            log.info("Cleared embedding for job {}", jobId);
        } catch (Exception ex) {
            log.warn("Failed to delete embedding for job {}: {}", jobId, ex.getMessage());
        }
    }

    /**
     * Composes a comprehensive textual representation of a Job for semantic embedding.
     */
    public String extractJobText(Job job) {
        if (job == null) return "";
        List<String> parts = new ArrayList<>();
        if (job.getTitle() != null && !job.getTitle().isBlank()) {
            parts.add("Job Title: " + job.getTitle().trim());
        }
        if (job.getDescription() != null && !job.getDescription().isBlank()) {
            parts.add("Description:\n" + job.getDescription().trim());
        }
        if (job.getRequirements() != null && !job.getRequirements().isBlank()) {
            parts.add("Requirements:\n" + job.getRequirements().trim());
        }
        if (job.getSummaryIndustry() != null && !job.getSummaryIndustry().isBlank()) {
            parts.add("Industry: " + job.getSummaryIndustry().trim());
        }
        if (job.getSummaryRequired() != null && !job.getSummaryRequired().isBlank()) {
            parts.add("Key Skills: " + job.getSummaryRequired().trim());
        }
        if (job.getSummaryPreferred() != null && !job.getSummaryPreferred().isBlank()) {
            parts.add("Preferred Skills: " + job.getSummaryPreferred().trim());
        }
        return String.join("\n\n", parts).trim();
    }
}
