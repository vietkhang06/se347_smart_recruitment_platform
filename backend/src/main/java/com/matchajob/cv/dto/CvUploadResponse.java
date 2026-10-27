package com.matchajob.cv.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record CvUploadResponse(
        @JsonProperty("cv_version_id") UUID cvVersionId,
        @JsonProperty("candidate_id") UUID candidateId,
        @JsonProperty("file_name") String fileName,
        @JsonProperty("file_size_bytes") Integer fileSizeBytes,
        @JsonProperty("mime_type") String mimeType,
        String status,
        @JsonProperty("processing_job_id") UUID processingJobId,
        String message,
        @JsonProperty("is_active") boolean active
) {}
