package com.matchajob.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.client.AiWorkerClient;
import com.matchajob.client.dto.MatchScoreRequest;
import com.matchajob.client.dto.MatchScoreResponse;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.model.MatchResult;
import com.matchajob.matching.repository.MatchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class MatchingService {

    private static final Logger log = LoggerFactory.getLogger(MatchingService.class);

    private final CvVersionRepository cvVersionRepository;
    private final MatchResultRepository matchResultRepository;
    private final AiWorkerClient aiWorkerClient;
    private final ObjectMapper objectMapper;

    public MatchingService(
            CvVersionRepository cvVersionRepository,
            MatchResultRepository matchResultRepository,
            AiWorkerClient aiWorkerClient,
            ObjectMapper objectMapper) {
        this.cvVersionRepository = cvVersionRepository;
        this.matchResultRepository = matchResultRepository;
        this.aiWorkerClient = aiWorkerClient;
        this.objectMapper = objectMapper;
    }

    public MatchResult evaluateMatch(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            String jobTitle,
            String jobRequirements,
            String jobDescription) {

        Optional<MatchResult> existing = matchResultRepository.findByApplicationId(applicationId);
        if (existing.isPresent()) {
            log.info("Match result already exists for application: {}", applicationId);
            return existing.get();
        }

        CvVersion cv = cvVersionRepository.findById(cvVersionId)
                .orElseThrow(() -> new IllegalArgumentException("CvVersion not found: " + cvVersionId));

        String cvText = cv.getRawText() != null ? cv.getRawText() : cv.getFileName();
        java.util.List<String> skills = new java.util.ArrayList<>();
        if (cv.getParsedData() != null) {
            try {
                var jsonNode = objectMapper.readTree(cv.getParsedData());
                if (jsonNode.has("skills") && jsonNode.get("skills").isArray()) {
                    for (var item : jsonNode.get("skills")) {
                        skills.add(item.asText());
                    }
                }
            } catch (Exception ignored) {
            }
        }

        MatchScoreRequest request = MatchScoreRequest.builder()
                .jobId(jobId != null ? jobId.toString() : null)
                .jobTitle(jobTitle != null ? jobTitle : "Software Engineer")
                .jobDescription(jobDescription)
                .jobRequirements(jobRequirements)
                .cvText(cvText)
                .candidateSkills(skills)
                .build();

        // HTTP call OUTSIDE transaction
        MatchScoreResponse scoreResponse = aiWorkerClient.calculateMatchScore(request);

        // Short transaction to persist
        return saveMatchResultTransaction(applicationId, jobId, cvVersionId, scoreResponse);
    }

    @Transactional
    public MatchResult saveMatchResultTransaction(
            UUID applicationId,
            UUID jobId,
            UUID cvVersionId,
            MatchScoreResponse scoreResponse) {

        String breakdownJson = "{}";
        try {
            breakdownJson = objectMapper.writeValueAsString(scoreResponse.getBreakdown());
        } catch (Exception e) {
            log.warn("Failed to serialize breakdown JSON: {}", e.getMessage());
        }

        MatchResult result = MatchResult.builder()
                .applicationId(applicationId)
                .jobId(jobId != null ? jobId : UUID.randomUUID())
                .cvVersionId(cvVersionId)
                .overallScore(scoreResponse.getOverallScore() != null ? scoreResponse.getOverallScore().shortValue() : (short) 0)
                .skillsScore(scoreResponse.getSkillsScore() != null ? scoreResponse.getSkillsScore().shortValue() : null)
                .experienceScore(scoreResponse.getExperienceScore() != null ? scoreResponse.getExperienceScore().shortValue() : null)
                .breakdown(breakdownJson)
                .rationale(scoreResponse.getRationale())
                .createdAt(Instant.now())
                .build();

        return matchResultRepository.save(result);
    }

    public Optional<MatchResult> getMatchResult(UUID applicationId) {
        return matchResultRepository.findByApplicationId(applicationId);
    }
}
