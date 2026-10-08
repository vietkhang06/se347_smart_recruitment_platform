package com.matchajob.cv.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cv_versions")
public class CvVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size_bytes", nullable = false)
    private Integer fileSizeBytes;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "sha256_hash", nullable = false, length = 64)
    private String sha256Hash;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parsed_data", columnDefinition = "jsonb")
    private String parsedData;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "uploaded";

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
