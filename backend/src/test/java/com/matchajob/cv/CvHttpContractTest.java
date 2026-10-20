package com.matchajob.cv;

import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.*;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.unit.DataSize;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CvHttpContractTest {
    @TempDir Path root;
    final UUID candidate = UUID.randomUUID(), user = UUID.randomUUID(), cvId = UUID.randomUUID();
    final CvVersionRepository cvs = mock(CvVersionRepository.class);
    final CvRegistrationService registrations = mock(CvRegistrationService.class);
    final ResourceOwnershipService ownership = mock(ResourceOwnershipService.class);
    CvStorageService storage;
    MockMvc mvc;

    @BeforeEach
    void setup() {
        storage = new CvStorageService(root.toString(), DataSize.ofMegabytes(10));
        mvc = MockMvcBuilders.standaloneSetup(new CvController(storage, cvs, registrations,
                mock(CvProcessingOrchestrator.class), ownership, mock(CvAccessAuditService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void multipartUploadProduces202AndStreamingDownloadPreservesBytes() throws Exception {
        byte[] bytes = "%PDF-1.4 synthetic HTTP test".getBytes();
        when(registrations.register(eq(candidate), any())).thenAnswer(call -> {
            var stored = (CvStorageService.StorageResult) call.getArgument(1);
            CvVersion cv = CvVersion.builder().id(cvId).candidateId(candidate).fileName(stored.fileName())
                    .filePath(stored.objectKey()).mimeType(stored.mimeType()).fileSizeBytes(stored.fileSizeBytes())
                    .sha256Hash(stored.sha256Hash()).createdAt(Instant.now()).build();
            when(cvs.findByIdAndCandidateId(cvId, candidate)).thenReturn(Optional.of(cv));
            return new CvRegistrationService.RegistrationResult(cv, ProcessingJob.builder().id(UUID.randomUUID()).build());
        });
        mvc.perform(multipart("/v1/candidates/{candidate}/cv", candidate)
                .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", bytes)).principal(principal()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.cv_version_id").value(cvId.toString()))
                .andExpect(jsonPath("$.file_path").doesNotExist());
        mvc.perform(get("/v1/candidates/{candidate}/cv/{cv}/download", candidate, cvId)
                .queryParam("disposition", "inline").principal(principal()))
                .andExpect(status().isOk()).andExpect(content().bytes(bytes))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Type", "application/pdf"));
    }

    @Test
    void invalidDocxReturnsProblem400AndLeavesNoStoredObject() throws Exception {
        mvc.perform(multipart("/v1/candidates/{candidate}/cv", candidate)
                .file(new MockMultipartFile("file", "fake.docx", "application/octet-stream", new byte[]{0x50,0x4b,3,4,1}))
                .principal(principal()))
                .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        try (var files = java.nio.file.Files.walk(root)) {
            assertThat(files.filter(java.nio.file.Files::isRegularFile)).isEmpty();
        }
    }

    @Test
    void unauthorizedCandidateGets403BeforeStorageAndMissingObjectGetsSafe404() throws Exception {
        doThrow(new AccessDeniedException("private")).when(ownership).checkCvVersionAccess(user, candidate, cvId);
        mvc.perform(get("/v1/candidates/{candidate}/cv/{cv}/download", candidate, cvId).principal(principal()))
                .andExpect(status().isForbidden());
        reset(ownership);
        when(cvs.findByIdAndCandidateId(cvId, candidate)).thenReturn(Optional.of(CvVersion.builder()
                .id(cvId).candidateId(candidate).filePath("missing.pdf").build()));
        var response = mvc.perform(get("/v1/candidates/{candidate}/cv/{cv}/download", candidate, cvId).principal(principal()))
                .andExpect(status().isNotFound()).andReturn();
        assertThat(response.getResponse().getContentAsString()).doesNotContain(root.toString());
    }

    private UsernamePasswordAuthenticationToken principal() {
        return new UsernamePasswordAuthenticationToken(user, null, java.util.List.of());
    }

    @Test
    void anonymousUploadReturns401() throws Exception {
        mvc.perform(multipart("/v1/candidates/{candidate}/cv", candidate)
                .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", "%PDF-1.4".getBytes())))
                .andExpect(status().isUnauthorized());
    }
}
