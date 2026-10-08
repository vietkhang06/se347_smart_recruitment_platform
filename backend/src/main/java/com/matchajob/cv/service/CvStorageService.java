package com.matchajob.cv.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class CvStorageService {

    private static final Logger log = LoggerFactory.getLogger(CvStorageService.class);
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    private final Path storageDirectory;

    public CvStorageService(@Value("${matchajob.upload-dir:target/uploads/cv}") String uploadDir) {
        this.storageDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            log.error("Failed to initialize CV storage directory: {}", storageDirectory, e);
        }
    }

    public StorageResult store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10MB limit.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv.pdf";
        byte[] bytes = file.getBytes();

        validateMagicBytes(bytes, originalFilename);

        String sha256 = calculateSha256(bytes);
        String storedFilename = UUID.randomUUID() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path destination = this.storageDirectory.resolve(storedFilename);

        Files.write(destination, bytes);
        log.info("Stored CV file: {} (size: {} bytes, sha256: {})", destination, bytes.length, sha256);

        return new StorageResult(
                destination.toString(),
                originalFilename,
                (int) file.getSize(),
                file.getContentType() != null ? file.getContentType() : "application/pdf",
                sha256,
                bytes
        );
    }

    public byte[] readFile(String filePath) throws IOException {
        Path path = Paths.get(filePath);
        return Files.readAllBytes(path);
    }

    private void validateMagicBytes(byte[] bytes, String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            // PDF header check (%PDF-)
            if (bytes.length < 4 || bytes[0] != 0x25 || bytes[1] != 0x50 || bytes[2] != 0x44 || bytes[3] != 0x46) {
                throw new IllegalArgumentException("Corrupted or invalid PDF file header.");
            }
        } else if (lower.endsWith(".docx")) {
            // ZIP/DOCX header check (PK\x03\x04)
            if (bytes.length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B || bytes[2] != 0x03 || bytes[3] != 0x04) {
                throw new IllegalArgumentException("Corrupted or invalid DOCX file header.");
            }
        } else {
            throw new IllegalArgumentException("Unsupported file format. Only PDF (.pdf) and Word (.docx) files are supported.");
        }
    }

    private String calculateSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }

    public record StorageResult(
            String filePath,
            String fileName,
            int fileSizeBytes,
            String mimeType,
            String sha256Hash,
            byte[] content
    ) {}
}
