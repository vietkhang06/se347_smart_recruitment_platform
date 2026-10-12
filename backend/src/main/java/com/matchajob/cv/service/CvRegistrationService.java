package com.matchajob.cv.service;

import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class CvRegistrationService {

    private final CvVersionRepository cvVersionRepository;
    private final ProcessingJobService processingJobService;

    public CvRegistrationService(
            CvVersionRepository cvVersionRepository,
            ProcessingJobService processingJobService) {
        this.cvVersionRepository = cvVersionRepository;
        this.processingJobService = processingJobService;
    }

    @Transactional
    public RegistrationResult register(UUID candidateId, CvStorageService.StorageResult storage) {
        CvVersion cv = CvVersion.builder()
                .candidateId(candidateId)
                .filePath(storage.objectKey())
                .fileName(storage.fileName())
                .fileSizeBytes(storage.fileSizeBytes())
                .mimeType(storage.mimeType())
                .sha256Hash(storage.sha256Hash())
                .status("uploaded")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        CvVersion savedCv = cvVersionRepository.save(cv);
        ProcessingJob job = processingJobService.createJob(
                "CV_TEXT_EXTRACTION",
                "cv_version",
                savedCv.getId(),
                "cv_extract_" + savedCv.getId());
        return new RegistrationResult(savedCv, job);
    }

    public record RegistrationResult(CvVersion cv, ProcessingJob job) {}
}
