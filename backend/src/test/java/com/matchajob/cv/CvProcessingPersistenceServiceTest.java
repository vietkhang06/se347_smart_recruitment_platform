package com.matchajob.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.dto.CVExtractResponse;
import com.matchajob.client.dto.EmbeddingsResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingPersistenceService;
import com.matchajob.matching.repository.EmbeddingRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CvProcessingPersistenceServiceTest {
    @Mock CvVersionRepository cvs;
    @Mock ProcessingJobRepository jobs;
    @Mock ProcessingJobService jobService;
    @Mock EmbeddingRepository embeddings;
    @Mock JdbcClient jdbc;
    CvProcessingPersistenceService service;
    ProcessingJob lease;
    CvVersion cv;

    @BeforeEach
    void setup() {
        service = new CvProcessingPersistenceService(cvs, jobs, jobService, embeddings, new ObjectMapper(), jdbc);
        cv = CvVersion.builder().id(UUID.randomUUID()).status("uploaded").build();
        lease = ProcessingJob.builder().id(UUID.randomUUID()).entityId(cv.getId())
                .status("PROCESSING").leaseToken("current").build();
        when(jobs.findByIdForUpdate(lease.getId())).thenReturn(Optional.of(lease));
    }

    @Test
    void retryableFailureKeepsCvUploadedButPermanentFailureMarksFailed() {
        when(jobService.getJob(lease.getId())).thenReturn(Optional.of(lease));
        doAnswer(invocation -> { lease.setStatus("PENDING"); return null; })
                .when(jobService).markJobFailed(lease.getId(), "temporary", true);
        service.fail(cv.getId(), lease, "temporary", true);
        verify(cvs).updateProcessingStatus(eq(cv.getId()), eq("uploaded"), any(Instant.class));

        lease.setStatus("PROCESSING");
        doAnswer(invocation -> { lease.setStatus("FAILED"); return null; })
                .when(jobService).markJobFailed(lease.getId(), "permanent", false);
        service.fail(cv.getId(), lease, "permanent", false);
        verify(cvs).updateProcessingStatus(eq(cv.getId()), eq("failed"), any(Instant.class));
        verify(cvs, never()).findById(any());
        verify(cvs, never()).save(any());
    }

    @Test
    void successUpdatesOnlyProcessingColumnsWithoutLoadingOrSavingAnEntity() {
        when(cvs.updateProcessingResult(eq(cv.getId()), anyString(), anyString(), any(Instant.class)))
                .thenReturn(1);
        var extraction = CVExtractResponse.builder().rawText("Synthetic CV")
                .parsedData(Map.of("skills", List.of("Java"))).build();
        var vector = Collections.nCopies(1536, 0.1f);
        service.complete(cv.getId(), extraction,
                EmbeddingsResponse.builder().embeddings(List.of(vector)).build(), lease);

        verify(cvs).updateProcessingResult(eq(cv.getId()), eq("Synthetic CV"),
                eq("{\"skills\":[\"Java\"]}"), any(Instant.class));
        verify(embeddings).saveEmbedding(any(UUID.class), eq("cv_version"), eq(cv.getId()),
                eq(0), eq("Synthetic CV"), eq(vector));
        verify(jobService).markJobCompleted(lease.getId());
        verify(cvs, never()).findById(any());
        verify(cvs, never()).save(any());
    }

    @Test
    void missingCvCannotProduceAnEmbeddingOrCompleteItsJob() {
        assertThatThrownBy(() -> service.complete(cv.getId(),
                CVExtractResponse.builder().rawText("Synthetic CV").parsedData(Map.of()).build(),
                EmbeddingsResponse.builder().embeddings(List.of(Collections.nCopies(1536, 0.1f))).build(), lease))
                .isInstanceOf(NoSuchElementException.class);
        verifyNoInteractions(embeddings, jobService);
        verify(cvs, never()).save(any());
    }

    @Test
    void staleLeaseCannotOverwriteNewerWorkerResults() {
        ProcessingJob stale = ProcessingJob.builder().id(lease.getId()).leaseToken("obsolete").build();
        assertThatThrownBy(() -> service.complete(cv.getId(),
                CVExtractResponse.builder().rawText("Synthetic CV").parsedData(Map.of()).build(), null, stale))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("lease");
        verifyNoInteractions(cvs, embeddings, jobService);
    }
}
