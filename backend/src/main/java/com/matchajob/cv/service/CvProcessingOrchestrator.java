package com.matchajob.cv.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.repository.EmbeddingRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CvProcessingOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(CvProcessingOrchestrator.class);

    private final CvStorageService storageService;
    private final CvVersionRepository cvVersionRepository;
    private final ProcessingJobService jobService;
    private final AiWorkerClient aiWorkerClient;
    private final EmbeddingRepository embeddingRepository;
    private final ObjectMapper objectMapper;

    public CvProcessingOrchestrator(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            ProcessingJobService jobService,
            AiWorkerClient aiWorkerClient,
            EmbeddingRepository embeddingRepository,
            ObjectMapper objectMapper) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.jobService = jobService;
        this.aiWorkerClient = aiWorkerClient;
        this.embeddingRepository = embeddingRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Executes CV processing WITHOUT holding a database transaction during external HTTP calls.
     */
    public boolean processSingleJob(ProcessingJob job) {
        log.info("Starting processing for job: {} (entity: {})", job.getId(), job.getEntityId());
        jobService.startJob(job.getId());

        Optional<CvVersion> cvOpt = cvVersionRepository.findById(job.getEntityId());
        if (cvOpt.isEmpty()) {
            jobService.markJobFailed(job.getId(), "CvVersion not found for ID: " + job.getEntityId(), false);
            return false;
        }

        CvVersion cv = cvOpt.get();
        byte[] fileBytes;
        try {
            fileBytes = storageService.readFile(cv.getFilePath());
        } catch (IOException e) {
            jobService.markJobFailed(job.getId(), "Failed to read CV file from disk: " + e.getMessage(), false);
            return false;
        }

        try {
            // STEP 1: HTTP Network call to AI Worker (OUTSIDE TRANSACTION)
            CVExtractResponse extractResponse = aiWorkerClient.extractCv(
                    fileBytes,
                    cv.getFileName(),
                    cv.getMimeType()
            );

            // STEP 2: HTTP Network call for Embeddings (OUTSIDE TRANSACTION)
            String textForEmbedding = extractResponse.getRawText();
            if (textForEmbedding == null || textForEmbedding.isBlank()) {
                textForEmbedding = cv.getFileName();
            }
            EmbeddingsResponse embeddingsResponse = aiWorkerClient.generateEmbeddings(List.of(textForEmbedding));

            // STEP 3: Short Database Transaction to Persist Results
            saveResultsTransaction(cv.getId(), extractResponse, embeddingsResponse, job.getId());
            return true;

        } catch (Exception ex) {
            boolean isRetryable = isRetryableException(ex);
            log.error("Error processing CV job {} (retryable={}): {}", job.getId(), isRetryable, ex.getMessage());
            jobService.markJobFailed(job.getId(), ex.getMessage(), isRetryable);
            return false;
        }
    }

    @Transactional
    public void saveResultsTransaction(
            UUID cvId,
            CVExtractResponse extractResponse,
            EmbeddingsResponse embeddingsResponse,
            UUID jobId) {
        CvVersion cv = cvVersionRepository.findById(cvId)
                .orElseThrow(() -> new IllegalStateException("CvVersion missing during commit: " + cvId));

        cv.setRawText(extractResponse.getRawText());
        try {
            cv.setParsedData(objectMapper.writeValueAsString(extractResponse.getParsedData()));
        } catch (Exception e) {
            log.warn("Failed to serialize parsedData JSON: {}", e.getMessage());
        }
        cv.setStatus("extracted");
        cv.setUpdatedAt(Instant.now());
        cvVersionRepository.save(cv);

        if (embeddingsResponse != null && !embeddingsResponse.getEmbeddings().isEmpty()) {
            List<Float> vector = embeddingsResponse.getEmbeddings().get(0);
            embeddingRepository.saveEmbedding(
                    UUID.randomUUID(),
                    "cv_version",
                    cv.getId(),
                    0,
                    extractResponse.getRawText(),
                    vector
            );
        }

        jobService.markJobCompleted(jobId);
        log.info("Successfully persisted extraction results and embeddings for CV: {}", cvId);
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
