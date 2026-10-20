package com.matchajob.cv.service;

import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.util.List;

@Service
public class CvProcessingOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(CvProcessingOrchestrator.class);

    private final CvStorageService storageService;
    private final CvVersionRepository cvVersionRepository;
    private final ProcessingJobService jobService;
    private final AiWorkerClient aiWorkerClient;
    private final CvProcessingPersistenceService persistence;

    public CvProcessingOrchestrator(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            ProcessingJobService jobService,
            AiWorkerClient aiWorkerClient,
            CvProcessingPersistenceService persistence) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.jobService = jobService;
        this.aiWorkerClient = aiWorkerClient;
        this.persistence = persistence;
    }

    /**
     * Executes CV processing WITHOUT holding a database transaction during external HTTP calls.
     */
    public boolean processSingleJob(ProcessingJob job) {
        var started = jobService.startCvJob(job);
        if (started.isEmpty()) {
            return jobService.getJob(job.getId()).map(current -> "COMPLETED".equals(current.getStatus())).orElse(false);
        }
        ProcessingJob lease = started.get();
        CvVersion cv = cvVersionRepository.findById(lease.getEntityId()).orElse(null);
        if (cv == null) {
            persistence.fail(lease.getEntityId(), lease, "CV metadata was not found.", false);
            return false;
        }

        try {
            byte[] fileBytes = storageService.readFile(cv.getFilePath());
            // STEP 1: HTTP Network call to AI Worker (OUTSIDE TRANSACTION)
            CVExtractResponse extractResponse = aiWorkerClient.extractCv(
                    fileBytes,
                    cv.getFileName(),
                    cv.getMimeType()
            );

            // STEP 2: HTTP Network call for Embeddings (OUTSIDE TRANSACTION)
            String textForEmbedding = extractResponse.getRawText();
            if (textForEmbedding == null || textForEmbedding.isBlank()) {
                throw new IllegalArgumentException("CV text extraction returned no content.");
            }
            EmbeddingsResponse embeddingsResponse = aiWorkerClient.generateEmbeddings(List.of(textForEmbedding));

            // STEP 3: Short Database Transaction to Persist Results
            persistence.complete(cv.getId(), extractResponse, embeddingsResponse, lease);
            return true;

        } catch (Exception ex) {
            boolean isRetryable = isRetryableException(ex);
            String safeReason = ex instanceof IOException ? "CV file could not be read."
                    : ex instanceof ResourceAccessException ? "AI Worker is temporarily unavailable."
                    : ex instanceof HttpStatusCodeException http ? "AI Worker returned HTTP " + http.getStatusCode().value() + "."
                    : "CV processing failed.";
            log.warn("CV job {} failed; retryable={}, cause={}", lease.getId(), isRetryable, ex.getClass().getSimpleName());
            persistence.fail(cv.getId(), lease, safeReason, isRetryable);
            return false;
        }
    }

    private boolean isRetryableException(Exception ex) {
        if (ex instanceof ResourceAccessException) {
            // Timeout or connection refusal
            return true;
        }
        if (ex instanceof HttpStatusCodeException statusEx) {
            return statusEx.getStatusCode().is5xxServerError();
        }
        return false;
    }
}
