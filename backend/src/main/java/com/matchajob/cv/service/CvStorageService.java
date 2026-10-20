package com.matchajob.cv.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipFile;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;

@Service
public class CvStorageService {

    private static final Logger log = LoggerFactory.getLogger(CvStorageService.class);
    private static final String PDF_MIME = "application/pdf";
    private static final String DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final Set<String> GENERIC_MIME_TYPES = Set.of("", "application/octet-stream");

    private final Path storageDirectory;
    private final long maxFileSizeBytes;

    public CvStorageService(
            @Value("${matchajob.upload-dir:target/uploads/cv}") String uploadDir,
            @Value("${matchajob.cv.max-file-size:10MB}") DataSize maxFileSize) {
        this.maxFileSizeBytes = maxFileSize.toBytes();
        if (maxFileSizeBytes <= 0 || maxFileSizeBytes > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("CV size limit must be positive and fit the metadata size field.");
        }
        try {
            this.storageDirectory = Files.createDirectories(Path.of(uploadDir).toAbsolutePath().normalize()).toRealPath();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot initialize CV storage directory", e);
        }
    }

    public StorageResult store(UUID candidateId, MultipartFile file) throws IOException {
        if (candidateId == null) {
            throw new IllegalArgumentException("Candidate ID is required.");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store an empty file.");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("File size exceeds the configured limit.");
        }

        String originalFilename = sanitizeOriginalFilename(file.getOriginalFilename());
        FileType fileType = validateExtensionAndDeclaredMime(originalFilename, file.getContentType());
        String generatedFilename = UUID.randomUUID() + fileType.extension();
        String objectKey = "candidates/" + candidateId + "/" + generatedFilename;
        Path destination = resolveObjectKey(objectKey);
        Files.createDirectories(destination.getParent());

        Path temporaryFile = Files.createTempFile(destination.getParent(), ".upload-", ".tmp");
        MessageDigest digest = sha256Digest();
        byte[] header = new byte[4];
        int headerLength = 0;
        long totalBytes = 0;

        try {
            try (InputStream input = file.getInputStream();
                 OutputStream output = Files.newOutputStream(
                         temporaryFile,
                         StandardOpenOption.TRUNCATE_EXISTING,
                         StandardOpenOption.WRITE)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    totalBytes += read;
                    if (totalBytes > maxFileSizeBytes) {
                        throw new IllegalArgumentException("File size exceeds the configured limit.");
                    }
                    if (headerLength < header.length) {
                        int copyLength = Math.min(read, header.length - headerLength);
                        System.arraycopy(buffer, 0, header, headerLength, copyLength);
                        headerLength += copyLength;
                    }
                    digest.update(buffer, 0, read);
                    output.write(buffer, 0, read);
                }
            }

            if (totalBytes == 0) {
                throw new IllegalArgumentException("Cannot store an empty file.");
            }
            validateMagicBytes(header, headerLength, fileType);
            if (DOCX_MIME.equals(fileType.mimeType())) {
                validateDocxPackage(temporaryFile);
            }
            moveAtomicallyWhenSupported(temporaryFile, destination);
        } catch (IOException | RuntimeException e) {
            Files.deleteIfExists(temporaryFile);
            throw e;
        }

        String sha256 = HexFormat.of().formatHex(digest.digest());
        log.info("Stored CV object {} ({} bytes)", objectKey, totalBytes);
        return new StorageResult(objectKey, originalFilename, Math.toIntExact(totalBytes), fileType.mimeType(), sha256);
    }

    public byte[] readFile(String objectKey) throws IOException {
        return Files.readAllBytes(resolveObjectKey(objectKey));
    }

    public Resource loadResource(String objectKey) throws IOException {
        Path file = resolveObjectKey(objectKey);
        if (!Files.isRegularFile(file)) {
            throw new NoSuchFileException("CV object is missing.");
        }
        return new FileSystemResource(file);
    }

    public void deleteFile(String objectKey) {
        try {
            Files.deleteIfExists(resolveObjectKey(objectKey));
        } catch (IOException e) {
            log.warn("Could not remove CV object {} after a failed persistence operation", objectKey, e);
        }
    }

    private Path resolveObjectKey(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("CV object key is required.");
        }
        Path suppliedPath = Path.of(objectKey);
        Path resolved = suppliedPath.isAbsolute()
                ? suppliedPath.normalize()
                : storageDirectory.resolve(suppliedPath).normalize();
        if (!resolved.startsWith(storageDirectory)) {
            throw new IllegalArgumentException("Invalid CV object key.");
        }
        Path existing = resolved;
        while (!Files.exists(existing, LinkOption.NOFOLLOW_LINKS)) {
            existing = existing.getParent();
        }
        try {
            if (!existing.toRealPath().startsWith(storageDirectory)) {
                throw new IllegalArgumentException("Invalid CV object key.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid CV object key.", e);
        }
        return resolved;
    }

    private String sanitizeOriginalFilename(String suppliedFilename) {
        if (suppliedFilename == null || suppliedFilename.isBlank()) {
            throw new IllegalArgumentException("Original filename is required.");
        }
        String normalizedSeparators = suppliedFilename.replace('\\', '/');
        String baseName = normalizedSeparators.substring(normalizedSeparators.lastIndexOf('/') + 1);
        String sanitized = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (sanitized.isBlank() || sanitized.equals(".") || sanitized.equals("..")) {
            throw new IllegalArgumentException("Invalid original filename.");
        }
        if (sanitized.length() > 255) {
            throw new IllegalArgumentException("CV filename must not exceed 255 characters.");
        }
        return sanitized;
    }

    private void validateDocxPackage(Path file) throws IOException {
        // Inspect the archive without extracting entries or trusting ZIP size declarations.
        long expandedLimit = Math.min(maxFileSizeBytes * 10, 100L * 1024 * 1024);
        try (ZipFile zip = new ZipFile(file.toFile())) {
            if (zip.size() > 2048) {
                throw new IllegalArgumentException("DOCX contains too many archive entries.");
            }
            for (String required : Set.of("[Content_Types].xml", "_rels/.rels", "word/document.xml")) {
                ZipEntry entry = zip.getEntry(required);
                if (entry == null || entry.isDirectory()) {
                    throw new IllegalArgumentException("Invalid DOCX package: required document parts are missing.");
                }
            }
            long total = 0;
            var entries = zip.entries();
            byte[] buffer = new byte[8192];
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                if (entry.isDirectory()) {
                    continue;
                }
                try (InputStream input = zip.getInputStream(entry)) {
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > expandedLimit) {
                            throw new IllegalArgumentException("DOCX expanded content exceeds the configured safety limit.");
                        }
                    }
                }
            }
        } catch (ZipException e) {
            throw new IllegalArgumentException("Invalid DOCX archive.", e);
        }
    }

    private FileType validateExtensionAndDeclaredMime(String filename, String declaredMime) {
        String lowerFilename = filename.toLowerCase(Locale.ROOT);
        String normalizedMime = declaredMime == null ? "" : declaredMime.toLowerCase(Locale.ROOT).trim();
        FileType type;
        if (lowerFilename.endsWith(".pdf")) {
            type = new FileType(".pdf", PDF_MIME);
        } else if (lowerFilename.endsWith(".docx")) {
            type = new FileType(".docx", DOCX_MIME);
        } else {
            throw new IllegalArgumentException("Unsupported file format. Only PDF and DOCX files are supported.");
        }
        if (!GENERIC_MIME_TYPES.contains(normalizedMime) && !type.mimeType().equals(normalizedMime)) {
            throw new IllegalArgumentException("Declared MIME type does not match the file extension.");
        }
        return type;
    }

    private void validateMagicBytes(byte[] header, int headerLength, FileType type) {
        boolean valid;
        if (PDF_MIME.equals(type.mimeType())) {
            valid = headerLength >= 4
                    && header[0] == 0x25
                    && header[1] == 0x50
                    && header[2] == 0x44
                    && header[3] == 0x46;
        } else {
            valid = headerLength >= 4
                    && header[0] == 0x50
                    && header[1] == 0x4B
                    && header[2] == 0x03
                    && header[3] == 0x04;
        }
        if (!valid) {
            throw new IllegalArgumentException("The file signature does not match the declared CV format.");
        }
    }

    private MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", e);
        }
    }

    private void moveAtomicallyWhenSupported(Path source, Path destination) throws IOException {
        try {
            Files.move(source, destination, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, destination);
        }
    }

    private record FileType(String extension, String mimeType) {}

    public record StorageResult(
            String objectKey,
            String fileName,
            int fileSizeBytes,
            String mimeType,
            String sha256Hash
    ) {}
}
