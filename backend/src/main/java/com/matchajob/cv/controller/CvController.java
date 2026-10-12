package com.matchajob.cv.controller;

import com.matchajob.cv.dto.CvUploadResponse;
import com.matchajob.cv.dto.CvVersionResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/v1/candidates")
public class CvController {

    private static final Logger log = LoggerFactory.getLogger(CvController.class);

    private final CvStorageService storageService;
    private final CvVersionRepository cvVersionRepository;
    private final CvRegistrationService registrationService;
    private final CvProcessingOrchestrator orchestrator;

    public CvController(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            CvRegistrationService registrationService,
            CvProcessingOrchestrator orchestrator) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.registrationService = registrationService;
        this.orchestrator = orchestrator;
    }

    @PostMapping(value = "/{candidateId}/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CvUploadResponse> uploadCv(
            @PathVariable UUID candidateId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sync", defaultValue = "false") boolean sync) throws IOException {

        log.info("Received CV upload for candidate {} ({} bytes)", candidateId, file.getSize());
        CvStorageService.StorageResult storageResult = storageService.store(candidateId, file);

        CvRegistrationService.RegistrationResult registration;
        try {
            registration = registrationService.register(candidateId, storageResult);
        } catch (RuntimeException e) {
            storageService.deleteFile(storageResult.objectKey());
            throw e;
        }

        if (sync) {
            orchestrator.processSingleJob(registration.job());
        }

        CvVersion cv = registration.cv();
        CvUploadResponse response = new CvUploadResponse(
                cv.getId(),
                candidateId,
                cv.getFileName(),
                cv.getFileSizeBytes(),
                cv.getMimeType(),
                cv.getStatus(),
                registration.job().getId(),
                "CV uploaded successfully. Processing queued.");
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{candidateId}/cv/{cvVersionId}")
    public CvVersionResponse getCvVersion(
            @PathVariable UUID candidateId,
            @PathVariable UUID cvVersionId) {
        return CvVersionResponse.from(findCandidateCv(candidateId, cvVersionId));
    }

    @GetMapping("/{candidateId}/cv")
    public List<CvVersionResponse> listCandidateCvs(@PathVariable UUID candidateId) {
        return cvVersionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)
                .stream()
                .map(CvVersionResponse::from)
                .toList();
    }

    @GetMapping("/{candidateId}/cv/{cvVersionId}/download")
    public ResponseEntity<byte[]> downloadCv(
            @PathVariable UUID candidateId,
            @PathVariable UUID cvVersionId,
            @RequestParam(value = "disposition", defaultValue = "attachment") String disposition) throws IOException {
        CvVersion cv = findCandidateCv(candidateId, cvVersionId);
        byte[] content = storageService.readFile(cv.getFilePath());
        boolean inline = "inline".equals(disposition.toLowerCase(Locale.ROOT));
        if (!inline && !"attachment".equals(disposition.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Disposition must be either 'attachment' or 'inline'.");
        }

        ContentDisposition contentDisposition = (inline
                ? ContentDisposition.inline()
                : ContentDisposition.attachment())
                .filename(cv.getFileName(), StandardCharsets.UTF_8)
                .build();

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(cv.getMimeType());
        } catch (IllegalArgumentException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(content.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .cacheControl(CacheControl.noStore())
                .body(content);
    }

    private CvVersion findCandidateCv(UUID candidateId, UUID cvVersionId) {
        return cvVersionRepository.findByIdAndCandidateId(cvVersionId, candidateId)
                .orElseThrow(() -> new NoSuchElementException("CV version was not found for this candidate."));
    }
}
