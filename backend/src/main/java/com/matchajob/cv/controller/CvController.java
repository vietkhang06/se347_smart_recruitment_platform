package com.matchajob.cv.controller;

import com.matchajob.cv.dto.CvUploadResponse;
import com.matchajob.cv.dto.CvVersionResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.cv.service.CvAccessAuditService;
import org.springframework.core.io.Resource;
import com.matchajob.security.ResourceOwnershipService;
import com.matchajob.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final ResourceOwnershipService resourceOwnershipService;
    private final CvAccessAuditService auditService;

    public CvController(
            CvStorageService storageService,
            CvVersionRepository cvVersionRepository,
            CvRegistrationService registrationService,
            CvProcessingOrchestrator orchestrator,
            ResourceOwnershipService resourceOwnershipService,
            CvAccessAuditService auditService) {
        this.storageService = storageService;
        this.cvVersionRepository = cvVersionRepository;
        this.registrationService = registrationService;
        this.orchestrator = orchestrator;
        this.resourceOwnershipService = resourceOwnershipService;
        this.auditService = auditService;
    }

    @PostMapping(value = "/{candidateId}/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CvUploadResponse> uploadCv(
            @PathVariable UUID candidateId,
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sync", defaultValue = "false") boolean sync) throws IOException {
        UUID userId = SecurityUtils.extractUserId(authentication);
        resourceOwnershipService.checkCandidateProfileOwnership(userId, candidateId);

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
                cv.getId(), candidateId, cv.getFileName(), cv.getFileSizeBytes(), cv.getMimeType(),
                cv.getStatus(), registration.job().getId(),
                "CV uploaded successfully. Processing queued.", cv.isActive());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{candidateId}/cv/{cvVersionId}")
    public CvVersionResponse getCvVersion(
            @PathVariable UUID candidateId,
            @PathVariable UUID cvVersionId,
            Authentication authentication) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        checkReadAccess(authentication, userId, candidateId, cvVersionId);
        CvVersion cv = findCandidateCv(candidateId, cvVersionId);
        auditAdmin(authentication, userId, cvVersionId, "VIEW_CV_METADATA");
        return CvVersionResponse.from(cv);
    }

    @GetMapping("/{candidateId}/cv/active")
    public CvVersionResponse getActiveCv(@PathVariable UUID candidateId, Authentication authentication) {
        resourceOwnershipService.checkCandidateProfileOwnership(SecurityUtils.extractUserId(authentication), candidateId);
        return CvVersionResponse.from(cvVersionRepository.findByCandidateIdAndActiveTrue(candidateId)
                .orElseThrow(() -> new NoSuchElementException("No active CV was found for this candidate.")));
    }

    @PutMapping("/{candidateId}/cv/{cvVersionId}/active")
    public CvVersionResponse activateCv(
            @PathVariable UUID candidateId, @PathVariable UUID cvVersionId, Authentication authentication) {
        resourceOwnershipService.checkCandidateProfileOwnership(SecurityUtils.extractUserId(authentication), candidateId);
        return CvVersionResponse.from(registrationService.activate(candidateId, cvVersionId));
    }

    @GetMapping("/{candidateId}/cv")
    public List<CvVersionResponse> listCandidateCvs(
            @PathVariable UUID candidateId,
            Authentication authentication) {
        UUID userId = SecurityUtils.extractUserId(authentication);
        resourceOwnershipService.checkCandidateProfileOwnership(userId, candidateId);
        return cvVersionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)
                .stream()
                .map(CvVersionResponse::from)
                .toList();
    }

    @GetMapping("/{candidateId}/cv/{cvVersionId}/download")
    public ResponseEntity<Resource> downloadCv(
            @PathVariable UUID candidateId,
            @PathVariable UUID cvVersionId,
            Authentication authentication,
            @RequestParam(value = "disposition", defaultValue = "attachment") String disposition) throws IOException {
        String normalizedDisposition = disposition.toLowerCase(Locale.ROOT);
        boolean inline = "inline".equals(normalizedDisposition);
        if (!inline && !"attachment".equals(normalizedDisposition)) {
            throw new IllegalArgumentException("Disposition must be either 'attachment' or 'inline'.");
        }

        UUID userId = SecurityUtils.extractUserId(authentication);
        checkReadAccess(authentication, userId, candidateId, cvVersionId);
        CvVersion cv = findCandidateCv(candidateId, cvVersionId);
        Resource content = storageService.loadResource(cv.getFilePath());
        auditAdmin(authentication, userId, cvVersionId, inline ? "PREVIEW_CV" : "DOWNLOAD_CV");

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
                .contentLength(content.contentLength())
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(content);
    }

    private void checkReadAccess(Authentication authentication, UUID userId, UUID candidateId, UUID cvVersionId) {
        if (!SecurityUtils.hasRole(authentication, "ADMIN")) {
            resourceOwnershipService.checkCvVersionAccess(userId, candidateId, cvVersionId);
        }
    }

    private void auditAdmin(Authentication authentication, UUID userId, UUID cvVersionId, String action) {
        if (SecurityUtils.hasRole(authentication, "ADMIN")) {
            auditService.recordAdminRead(userId, cvVersionId, action);
        }
    }

    private CvVersion findCandidateCv(UUID candidateId, UUID cvVersionId) {
        return cvVersionRepository.findByIdAndCandidateId(cvVersionId, candidateId)
                .orElseThrow(() -> new NoSuchElementException("CV version was not found for this candidate."));
    }
}
