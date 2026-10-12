package com.matchajob.cv.controller;

import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final ResourceOwnershipService resourceOwnershipService;

    @org.springframework.beans.factory.annotation.Autowired
    public CvController(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            ProcessingJobService jobService,
            CvProcessingOrchestrator orchestrator,
            ResourceOwnershipService resourceOwnershipService) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.jobService = jobService;
        this.orchestrator = orchestrator;
        this.resourceOwnershipService = resourceOwnershipService;
    }

    public CvController(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            ProcessingJobService jobService,
            CvProcessingOrchestrator orchestrator) {
        this(storageService, cvVersionRepository, jobService, orchestrator, null);
    }

    @PostMapping("/{candidateId}/cv")
    public ResponseEntity<Map<String, Object>> uploadCv(
            @PathVariable UUID candidateId,
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sync", defaultValue = "false") boolean sync) throws IOException {

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkCandidateProfileOwnership(userId, candidateId);
        }

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

    /**
     * Programmatic overload without Authentication for legacy internal integration tests.
     */
    public ResponseEntity<Map<String, Object>> uploadCv(
            UUID candidateId,
            MultipartFile file,
            boolean sync) throws IOException {
        return uploadCv(candidateId, null, file, sync);
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
            @PathVariable UUID cvVersionId,
            Authentication authentication) {

        CvVersion cv = cvVersionRepository.findById(cvVersionId).orElse(null);
        if (cv == null || !cv.getCandidateId().equals(candidateId)) {
            return ResponseEntity.notFound().build();
        }

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkCvVersionAccess(userId, candidateId, cvVersionId);
        }

        return ResponseEntity.ok(cv);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<CvVersion> getCvVersion(
            UUID candidateId,
            UUID cvVersionId) {
        return getCvVersion(candidateId, cvVersionId, null);
    }

    @GetMapping("/{candidateId}/cv")
    public ResponseEntity<List<CvVersion>> listCandidateCvs(
            @PathVariable UUID candidateId,
            Authentication authentication) {

        if (authentication != null && resourceOwnershipService != null) {
            UUID userId = SecurityUtils.extractUserId(authentication);
            resourceOwnershipService.checkCandidateProfileOwnership(userId, candidateId);
        }

        List<CvVersion> list = cvVersionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId);
        return ResponseEntity.ok(list);
    }

    /**
     * Programmatic overload for internal integration tests.
     */
    public ResponseEntity<List<CvVersion>> listCandidateCvs(UUID candidateId) {
        return listCandidateCvs(candidateId, null);
    }

    public record CvUploadResult(CvVersion cv, ProcessingJob job) {}
}
