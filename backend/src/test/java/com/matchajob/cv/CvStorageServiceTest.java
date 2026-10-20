package com.matchajob.cv;

import com.matchajob.cv.service.CvStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Files;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.zip.ZipOutputStream;
import java.util.zip.ZipEntry;
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
        assertThat(result.sha256Hash()).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content)));
        assertThat(service.readFile(result.objectKey())).isEqualTo(content);
    }

    @Test
    void storeAcceptsValidDocxSignature() throws Exception {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        byte[] content = syntheticDocx();

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

    @Test
    void rejectsFakeDocxAndRemovesTemporaryFiles() throws Exception {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        assertThatThrownBy(() -> service.store(UUID.randomUUID(), new MockMultipartFile(
                "file", "fake.docx", "application/octet-stream", new byte[]{0x50, 0x4b, 0x03, 0x04, 1})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("DOCX");
        try (var files = Files.walk(storageDirectory)) {
            assertThat(files.filter(Files::isRegularFile)).isEmpty();
        }
    }

    @Test
    void rejectsOrdinaryZipRenamedToDocx() throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(buffer)) {
            zip.putNextEntry(new ZipEntry("file.txt"));
            zip.write("ordinary zip".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        assertThatThrownBy(() -> serviceWithLimit(DataSize.ofMegabytes(10)).store(UUID.randomUUID(),
                new MockMultipartFile("file", "fake.docx", "application/octet-stream", buffer.toByteArray())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("required document parts");
    }

    @Test
    void repeatUploadsNeverOverwriteAndRemainReadableFromNewServiceInstance() throws Exception {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        UUID candidateId = UUID.randomUUID();
        byte[] content = "%PDF-1.4 synthetic".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "same.pdf", "application/pdf", content);
        var first = service.store(candidateId, file);
        var second = service.store(candidateId, file);
        assertThat(first.objectKey()).isNotEqualTo(second.objectKey());
        assertThat(first.sha256Hash()).isEqualTo(second.sha256Hash());
        assertThat(serviceWithLimit(DataSize.ofMegabytes(10)).readFile(first.objectKey())).isEqualTo(content);
        assertThat(service.loadResource(second.objectKey()).getInputStream()).hasBinaryContent(content);
    }

    @Test
    void rejectsEmptyUnsupportedAndOverlongNames() {
        CvStorageService service = serviceWithLimit(DataSize.ofMegabytes(10));
        assertThatThrownBy(() -> service.store(UUID.randomUUID(),
                new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0])))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("empty");
        assertThatThrownBy(() -> service.store(UUID.randomUUID(),
                new MockMultipartFile("file", "resume.exe", "application/pdf", "%PDF".getBytes())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Unsupported");
        assertThatThrownBy(() -> service.store(UUID.randomUUID(),
                new MockMultipartFile("file", "x".repeat(256) + ".pdf", "application/pdf", "%PDF".getBytes())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("255");
    }

    @Test
    void missingResourceDoesNotExposeServerPath() {
        assertThatThrownBy(() -> serviceWithLimit(DataSize.ofMegabytes(10)).loadResource("missing.pdf"))
                .isInstanceOf(java.nio.file.NoSuchFileException.class)
                .hasMessageNotContaining(storageDirectory.toString());
    }

    public static byte[] syntheticDocx() throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(buffer)) {
            String[] names = {"[Content_Types].xml", "_rels/.rels", "word/document.xml"};
            String[] content = {
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>",
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>",
                "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Synthetic CV</w:t></w:r></w:p></w:body></w:document>"
            };
            for (int i = 0; i < names.length; i++) {
                zip.putNextEntry(new ZipEntry(names[i]));
                zip.write(content[i].getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return buffer.toByteArray();
    }
}
