package com.matchajob.cv;

import com.matchajob.cv.service.CvStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CvStorageServiceTest {

    @TempDir
    Path storageDirectory;

    @Test
    void storeCreatesCandidateScopedObjectKeyAndPreservesContent() throws Exception {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        UUID candidateId = UUID.randomUUID();
        byte[] content = "%PDF-1.4 synthetic CV".getBytes(StandardCharsets.UTF_8);

        CvStorageService.StorageResult result = service.store(
                candidateId,
                new MockMultipartFile("file", "../My CV.pdf", "application/pdf", content));

        assertThat(result.objectKey()).startsWith("candidates/" + candidateId + "/");
        assertThat(result.objectKey()).endsWith(".pdf");
        assertThat(result.objectKey()).doesNotContain("..");
        assertThat(result.fileName()).isEqualTo("My_CV.pdf");
        assertThat(result.mimeType()).isEqualTo("application/pdf");
        assertThat(result.sha256Hash()).hasSize(64);
        assertThat(service.readFile(result.objectKey())).isEqualTo(content);
    }

    @Test
    void storeAcceptsValidDocxSignature() throws Exception {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        byte[] content = new byte[]{0x50, 0x4B, 0x03, 0x04, 0x01};

        CvStorageService.StorageResult result = service.store(
                UUID.randomUUID(),
                new MockMultipartFile(
                        "file",
                        "resume.docx",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        content));

        assertThat(result.mimeType())
                .isEqualTo("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    @Test
    void storeRejectsMismatchedMimeAndInvalidSignature() {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));

        assertThatThrownBy(() -> service.store(
                UUID.randomUUID(),
                new MockMultipartFile("file", "resume.pdf", "text/plain", "%PDF".getBytes())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MIME type");

        assertThatThrownBy(() -> service.store(
                UUID.randomUUID(),
                new MockMultipartFile("file", "resume.pdf", "application/pdf", "not-pdf".getBytes())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("signature");
    }

    @Test
    void storeRejectsFileOverConfiguredLimit() {
        CvStorageService service = serviceWithLimit(DataSize.ofBytes(4));

        assertThatThrownBy(() -> service.store(
                UUID.randomUUID(),
                new MockMultipartFile("file", "resume.pdf", "application/pdf", "%PDF-1.4".getBytes())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("configured limit");
    }

    @Test
    void readRejectsObjectKeyOutsideStorageRoot() {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));

        assertThatThrownBy(() -> service.readFile("../../outside.pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid CV object key");
    }

    private CvStorageService serviceWithLimit(DataSize limit) {
        return new CvStorageService(storageDirectory.toString(), limit);
    }
}
