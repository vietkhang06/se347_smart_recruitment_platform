package com.matchajob.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvProcessingPersistenceService;
import com.matchajob.cv.service.CvProcessingScheduler;
import com.matchajob.processing.dto.ProcessingJobResponse;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.repository.ProcessingJobRepository;
import com.matchajob.processing.service.ProcessingJobService;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CvQueueTest {
    @Test
    void pollClaimsAndProcessesCvAndCanRecoverAfterAnUnavailableDatabase() {
        ProcessingJobService jobs = mock(ProcessingJobService.class);
        CvProcessingOrchestrator worker = mock(CvProcessingOrchestrator.class);
        CvProcessingPersistenceService persistence = mock(CvProcessingPersistenceService.class);
        var poller = new CvProcessingScheduler(jobs, worker, persistence);
        doThrow(new IllegalStateException("database unavailable")).doNothing().when(persistence).recoverExpiredLeases();
        poller.poll();
        ProcessingJob job = ProcessingJob.builder().id(UUID.randomUUID()).build();
        when(jobs.claimNextCvJob()).thenReturn(Optional.of(job));
        poller.poll();
        verify(worker).processSingleJob(job);
    }

    @Test
    void synchronousAttemptCannotRestartCompletedJobOrTakeAnotherLease() {
        ProcessingJobRepository repository = mock(ProcessingJobRepository.class);
        var service = new ProcessingJobService(repository);
        UUID id = UUID.randomUUID();
        var submitted = ProcessingJob.builder().id(id).build();
        var current = ProcessingJob.builder().id(id).status("COMPLETED").build();
        when(repository.findByIdForUpdate(id)).thenReturn(Optional.of(current));
        assertThat(service.startCvJob(submitted)).isEmpty();
        current.setStatus("PROCESSING"); current.setLeaseToken("another-worker");
        assertThat(service.startCvJob(submitted)).isEmpty();
        verify(repository, never()).save(any());
    }

    @Test
    void publicJobProgressDoesNotExposeInternalLeasesOrRawErrors() throws Exception {
        var job = ProcessingJob.builder().id(UUID.randomUUID()).leaseToken("private-token")
                .idempotencyKey("private-key").lastError("/private/storage/file.pdf SQL sensitive error").build();
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(ProcessingJobResponse.from(job));
        assertThat(json).doesNotContain("private-token", "private-key", "/private/storage", "SQL sensitive", "leaseToken", "idempotencyKey");
        assertThat(json).contains("PENDING");
    }
}
