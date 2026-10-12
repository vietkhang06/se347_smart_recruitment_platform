package com.matchajob.cv;

import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.dto.CvVersionResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.CvProcessingOrchestrator;
import com.matchajob.cv.service.CvRegistrationService;
import com.matchajob.cv.service.CvStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    @Test
    void metadataIsCandidateScopedAndDoesNotExposeObjectKey() {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        CvVersion cv = cv(candidateId, cvId);
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv));

        CvVersionResponse response = controller().getCvVersion(candidateId, cvId);

        assertThat(response.id()).isEqualTo(cvId);
        assertThat(response.fileName()).isEqualTo("resume.pdf");
        assertThat(response.toString()).doesNotContain("candidates/");
    }

    @Test
    void metadataRejectsCvOwnedByAnotherCandidate() {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller().getCvVersion(candidateId, cvId))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void downloadUsesStoredObjectKeyAndSafeContentDisposition() throws Exception {
        UUID candidateId = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();
        CvVersion cv = cv(candidateId, cvId);
        byte[] content = "%PDF-1.4".getBytes(StandardCharsets.UTF_8);
        when(cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(cv));
        when(storageService.readFile("candidates/key.pdf")).thenReturn(content);

        ResponseEntity<byte[]> response = controller().downloadCv(candidateId, cvId, "attachment");

        assertThat(response.getBody()).isEqualTo(content);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("attachment");
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
    }

    private CvController controller() {
        return new CvController(storageService, cvVersionRepository, registrationService, orchestrator);
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
}
