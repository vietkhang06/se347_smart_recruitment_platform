package com.matchajob.cv.service;

import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.processing.model.ProcessingJob;
import com.matchajob.processing.service.ProcessingJobService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.NoSuchElementException;

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
        cvVersionRepository.lockCandidate(candidateId)
                .orElseThrow(() -> new NoSuchElementException("Candidate profile was not found."));
        cvVersionRepository.clearActive(candidateId);
        CvVersion cv = CvVersion.builder()
                .candidateId(candidateId)
                .filePath(storage.objectKey())
                .fileName(storage.fileName())
                .fileSizeBytes(storage.fileSizeBytes())
                .mimeType(storage.mimeType())
                .sha256Hash(storage.sha256Hash())
                .active(true)
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

    @Transactional
    public CvVersion activate(UUID candidateId, UUID cvId) {
        cvVersionRepository.lockCandidate(candidateId)
                .orElseThrow(() -> new NoSuchElementException("Candidate profile was not found."));
        cvVersionRepository.findByIdAndCandidateId(cvId, candidateId)
                .orElseThrow(() -> new NoSuchElementException("CV version was not found for this candidate."));
        cvVersionRepository.clearActive(candidateId);
        cvVersionRepository.selectActive(candidateId, cvId);
        return cvVersionRepository.findByIdAndCandidateId(cvId, candidateId).orElseThrow();
    }
}
