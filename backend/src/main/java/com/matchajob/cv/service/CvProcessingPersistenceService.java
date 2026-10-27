package com.matchajob.cv.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.repository.EmbeddingRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class CvProcessingPersistenceService {
    private final CvVersionRepository cvRepository;
    private final ProcessingJobRepository jobRepository;
    private final ProcessingJobService jobService;
    private final EmbeddingRepository embeddingRepository;
    private final ObjectMapper objectMapper;
    private final JdbcClient jdbcClient;

    public CvProcessingPersistenceService(CvVersionRepository cvRepository, ProcessingJobRepository jobRepository,
            ProcessingJobService jobService, EmbeddingRepository embeddingRepository, ObjectMapper objectMapper,
            JdbcClient jdbcClient) {
        this.cvRepository = cvRepository;
        this.jobRepository = jobRepository;
        this.jobService = jobService;
        this.embeddingRepository = embeddingRepository;
        this.objectMapper = objectMapper;
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public void complete(UUID cvId, CVExtractResponse extraction, EmbeddingsResponse embeddings, ProcessingJob lease) {
        requireLease(lease);
        if (embeddings == null || embeddings.getEmbeddings() == null || embeddings.getEmbeddings().isEmpty()) {
            throw new IllegalArgumentException("AI Worker returned no CV embedding.");
        }
        String parsedData;
        try {
            parsedData = objectMapper.writeValueAsString(extraction.getParsedData());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot persist CV extraction data.", e);
        }
        if (cvRepository.updateProcessingResult(cvId, extraction.getRawText(), parsedData, Instant.now()) == 0) {
            throw new NoSuchElementException("CV version was not found during processing.");
        }
        embeddingRepository.saveEmbedding(UUID.randomUUID(), "cv_version", cvId, 0,
                extraction.getRawText(), embeddings.getEmbeddings().get(0));
        jobService.markJobCompleted(lease.getId());
    }

    @Transactional
    public void fail(UUID cvId, ProcessingJob lease, String safeReason, boolean retryable) {
        requireLease(lease);
        jobService.markJobFailed(lease.getId(), safeReason, retryable);
        ProcessingJob job = jobService.getJob(lease.getId()).orElseThrow();
        cvRepository.updateProcessingStatus(cvId,
                "FAILED".equals(job.getStatus()) ? "failed" : "uploaded", Instant.now());
    }

    @Transactional
    public void recoverExpiredLeases() {
        jobRepository.recoverExpiredCvLeases(Instant.now());
        jdbcClient.sql("""
                UPDATE cv_versions cv SET status = 'failed'
                WHERE cv.status = 'uploaded' AND EXISTS (
                    SELECT 1 FROM processing_jobs job
                    WHERE job.entity_id = cv.id AND job.entity_type = 'cv_version'
                      AND job.job_type = 'CV_TEXT_EXTRACTION' AND job.status = 'FAILED')
                """).update();
    }

    private void requireLease(ProcessingJob lease) {
        ProcessingJob current = jobRepository.findByIdForUpdate(lease.getId()).orElseThrow();
        if (!"PROCESSING".equals(current.getStatus()) || lease.getLeaseToken() == null
                || !lease.getLeaseToken().equals(current.getLeaseToken())) {
            throw new IllegalStateException("CV processing lease is no longer current.");
        }
    }
}
