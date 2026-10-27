package com.matchajob.cv;

import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.dto.CvVersionResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import com.matchajob.cv.service.CvAccessAuditService;
import com.matchajob.processing.repository.ProcessingJobRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvControllerTest {

    @Mock
    CvStorageService storageService;
    @Mock
    CvVersionRepository cvVersionRepository;
    @Mock
    CvRegistrationService registrationService;
    @Mock
    CvProcessingOrchestrator orchestrator;
    @Mock
    ResourceOwnershipService resourceOwnershipService;
    @Mock
    CvAccessAuditService auditService;
    @Mock
    ProcessingJobRepository processingJobs;

    @Test
    void versionListIncludesProcessingJobIdsUsingOneBatchQuery() {
        UUID candidateId = UUID.randomUUID(), cvId = UUID.randomUUID(), jobId = UUID.randomUUID();
        when(cvVersionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId))
                .thenReturn(java.util.List.of(cv(candidateId, cvId)));
        when(processingJobs.findByJobTypeAndEntityTypeAndEntityIdInOrderByCreatedAtDesc(
                "CV_TEXT_EXTRACTION", "cv_version", java.util.List.of(cvId)))
                .thenReturn(java.util.List.of(com.matchajob.processing.model.ProcessingJob.builder()
                        .id(jobId).entityId(cvId).build()));
        var result = controller().listCandidateCvs(candidateId, authentication(UUID.randomUUID()));
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().processingJobId()).isEqualTo(jobId);
        verify(processingJobs).findByJobTypeAndEntityTypeAndEntityIdInOrderByCreatedAtDesc(
                "CV_TEXT_EXTRACTION", "cv_version", java.util.List.of(cvId));
    }

    @Test
    void metadataIsCandidateScopedAndDoesNotExposeObjectKey() {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        CvVersion cv = cv(candidateId, cvId);
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv));

        CvVersionResponse response = controller().getCvVersion(candidateId, cvId, authentication(userId));

        assertThat(response.id()).isEqualTo(cvId);
        assertThat(response.fileName()).isEqualTo("resume.pdf");
        assertThat(response.toString()).doesNotContain("candidates/");
        verify(resourceOwnershipService).checkCvVersionAccess(userId, candidateId, cvId);
    }

    @Test
    void metadataRejectsCvOwnedByAnotherCandidate() {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller().getCvVersion(candidateId, cvId, authentication(UUID.randomUUID())))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void downloadUsesStoredObjectKeyAndSafeContentDisposition() throws Exception {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        CvVersion cv = cv(candidateId, cvId);
        byte[] content = "%PDF-1.4".getBytes(StandardCharsets.UTF_8);
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv));
        when(storageService.loadResource("candidates/key.pdf")).thenReturn(new ByteArrayResource(content));

        ResponseEntity<Resource> response = controller().downloadCv(
                candidateId, cvId, authentication(userId), "attachment");

        assertThat(response.getBody().getInputStream()).hasBinaryContent(content);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("attachment");
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        verify(resourceOwnershipService).checkCvVersionAccess(userId, candidateId, cvId);
    }

    @Test
    void getCvVersion_unauthorized_throwsAccessDenied_withoutAccessingRepository() {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        doThrow(new AccessDeniedException("Access is denied"))
                .when(resourceOwnershipService).checkCvVersionAccess(userId, candidateId, cvId);

        assertThatThrownBy(() -> controller().getCvVersion(candidateId, cvId, authentication(userId)))
                .isInstanceOf(AccessDeniedException.class);

        verify(cvVersionRepository, never()).findByIdAndCandidateId(any(), any());
    }

    @Test
    void downloadCv_unauthorized_throwsAccessDenied_withoutAccessingStorage() throws Exception {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        doThrow(new AccessDeniedException("Access is denied"))
                .when(resourceOwnershipService).checkCvVersionAccess(userId, candidateId, cvId);

        assertThatThrownBy(() -> controller().downloadCv(candidateId, cvId, authentication(userId), "attachment"))
                .isInstanceOf(AccessDeniedException.class);

        verify(storageService, never()).loadResource(any());
        verify(cvVersionRepository, never()).findByIdAndCandidateId(any(), any());
    }

    private CvController controller() {
        return new CvController(
                storageService,
                cvVersionRepository,
                registrationService,
                orchestrator,
                resourceOwnershipService, auditService, processingJobs);
    }

    private Authentication authentication(UUID userId) {
        return new UsernamePasswordAuthenticationToken(
                userId,
                null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE")));
    }

    private CvVersion cv(UUID candidateId, UUID cvId) {
        return CvVersion.builder()
                .id(cvId)
                .candidateId(candidateId)
                .filePath("candidates/key.pdf")
                .fileName("resume.pdf")
                .fileSizeBytes(8)
                .mimeType("application/pdf")
                .sha256Hash("a".repeat(64))
                .status("uploaded")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void uploadRegistrationFailureRemovesNewObject() throws Exception {
        UUID candidateId = UUID.randomUUID();
        var file = new MockMultipartFile("file", "resume.pdf", "application/pdf", "%PDF-1.4".getBytes());
        var stored = new CvStorageService.StorageResult("candidates/new.pdf", "resume.pdf", 8, "application/pdf", "hash");
        when(storageService.store(candidateId, file)).thenReturn(stored);
        when(registrationService.register(candidateId, stored)).thenThrow(new IllegalStateException("DB failed"));
        assertThatThrownBy(() -> controller().uploadCv(candidateId, authentication(UUID.randomUUID()), file, false))
                .isInstanceOf(IllegalStateException.class);
        verify(storageService).deleteFile("candidates/new.pdf");
    }

    @Test
    void adminReadMustBeAuditedAndCandidateRelationshipStillChecked() {
        UUID userId = UUID.randomUUID(), candidateId = UUID.randomUUID(), cvId = UUID.randomUUID();
        Authentication admin = new UsernamePasswordAuthenticationToken(userId, null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv(candidateId, cvId)));
        controller().getCvVersion(candidateId, cvId, admin);
        verify(auditService).recordAdminRead(userId, cvId, "VIEW_CV_METADATA");
        verify(resourceOwnershipService, never()).checkCvVersionAccess(any(), any(), any());
    }

    @Test
    void invalidDispositionIsRejectedBeforeReadingPrivateContent() {
        assertThatThrownBy(() -> controller().downloadCv(UUID.randomUUID(), UUID.randomUUID(),
                authentication(UUID.randomUUID()), "invalid"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deniedActiveSelectionDoesNotModifyVersions() {
        UUID candidateId = UUID.randomUUID(), userId = UUID.randomUUID(), cvId = UUID.randomUUID();
        doThrow(new AccessDeniedException("not owner")).when(resourceOwnershipService)
                .checkCandidateProfileOwnership(userId, candidateId);
        assertThatThrownBy(() -> controller().activateCv(candidateId, cvId, authentication(userId)))
                .isInstanceOf(AccessDeniedException.class);
        verify(registrationService, never()).activate(any(), any());
    }

    @Test
    void adminAuditFailurePreventsPrivateMetadataResponse() {
        UUID userId = UUID.randomUUID(), candidateId = UUID.randomUUID(), cvId = UUID.randomUUID();
        Authentication admin = new UsernamePasswordAuthenticationToken(userId, null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv(candidateId, cvId)));
        doThrow(new IllegalStateException("audit unavailable")).when(auditService).recordAdminRead(userId, cvId, "VIEW_CV_METADATA");
        assertThatThrownBy(() -> controller().getCvVersion(candidateId, cvId, admin))
                .isInstanceOf(IllegalStateException.class);
    }
}
