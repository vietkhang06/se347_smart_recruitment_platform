package com.matchajob.cv.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.matchajob.cv.model.CvVersion;

import java.time.Instant;
import java.util.UUID;

public record CvVersionResponse(
        UUID id,
        @JsonProperty("candidate_id") UUID candidateId,
        @JsonProperty("file_name") String fileName,
        @JsonProperty("file_size_bytes") Integer fileSizeBytes,
        @JsonProperty("mime_type") String mimeType,
        @JsonProperty("sha256_hash") String sha256Hash,
        String status,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("updated_at") Instant updatedAt,
        @JsonProperty("is_active") boolean active,
        @JsonProperty("processing_job_id") UUID processingJobId
) {
    public static CvVersionResponse from(CvVersion cv) {
        return from(cv, null);
    }

    public static CvVersionResponse from(CvVersion cv, UUID processingJobId) {
        return new CvVersionResponse(
                cv.getId(), cv.getCandidateId(), cv.getFileName(), cv.getFileSizeBytes(),
                cv.getMimeType(), cv.getSha256Hash(), cv.getStatus(), cv.getCreatedAt(), cv.getUpdatedAt(), cv.isActive(), processingJobId);
    }
}
