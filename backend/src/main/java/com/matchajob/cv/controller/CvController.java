package com.matchajob.cv.controller;

import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/candidates")
public class CvController {

    private static final Logger log = LoggerFactory.getLogger(CvController.class);

    private final CvStorageService storageService;
    private final CvVersionRepository cvVersionRepository;
    private final ProcessingJobService jobService;
    private final CvProcessingOrchestrator orchestrator;

    public CvController(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            ProcessingJobService jobService,
            CvProcessingOrchestrator orchestrator) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.jobService = jobService;
        this.orchestrator = orchestrator;
    }

    @PostMapping("/{candidateId}/cv")
    public ResponseEntity<Map<String, Object>> uploadCv(
            @PathVariable UUID candidateId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sync", defaultValue = "false") boolean sync) throws IOException {

        log.info("Received CV upload request for candidate: {} (filename: {}, size: {} bytes)",
                candidateId, file.getOriginalFilename(), file.getSize());

        CvStorageService.StorageResult storageResult = storageService.store(file);

        // Save CvVersion and create processing job
        CvUploadResult uploadResult = saveCvAndCreateJob(candidateId, storageResult);

        if (sync) {
            // Synchronous processing request (e.g., in integration tests or urgent flows)
            orchestrator.processSingleJob(uploadResult.job());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("cv_version_id", uploadResult.cv().getId());
        response.put("candidate_id", candidateId);
        response.put("file_name", uploadResult.cv().getFileName());
        response.put("file_size_bytes", uploadResult.cv().getFileSizeBytes());
        response.put("status", uploadResult.cv().getStatus());
        response.put("processing_job_id", uploadResult.job().getId());
        response.put("message", "CV uploaded successfully. Processing queued.");

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @Transactional
    public CvUploadResult saveCvAndCreateJob(UUID candidateId, CvStorageService.StorageResult storage) {
        CvVersion cv = CvVersion.builder()
                .candidateId(candidateId)
                .filePath(storage.filePath())
                .fileName(storage.fileName())
                .fileSizeBytes(storage.fileSizeBytes())
                .mimeType(storage.mimeType())
                .sha256Hash(storage.sha256Hash())
                .status("uploaded")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        CvVersion savedCv = cvVersionRepository.save(cv);

        String idempotencyKey = "cv_extract_" + savedCv.getId();
        ProcessingJob job = jobService.createJob("CV_TEXT_EXTRACTION", "cv_version", savedCv.getId(), idempotencyKey);

        return new CvUploadResult(savedCv, job);
    }

    @GetMapping("/{candidateId}/cv/{cvVersionId}")
    public ResponseEntity<CvVersion> getCvVersion(
            @PathVariable UUID candidateId,
            @PathVariable UUID cvVersionId) {

        return cvVersionRepository.findById(cvVersionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{candidateId}/cv")
    public ResponseEntity<List<CvVersion>> listCandidateCvs(@PathVariable UUID candidateId) {
        List<CvVersion> list = cvVersionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId);
        return ResponseEntity.ok(list);
    }

    public record CvUploadResult(CvVersion cv, ProcessingJob job) {}
}
