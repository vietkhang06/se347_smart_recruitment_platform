package com.matchajob.client.stub;

import com.matchajob.client.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * Deterministic AI Worker stub for offline testing.
 * Produces consistent, reproducible results based on keyword matching
 * and SHA-256 seeded scoring — no network calls, no AI provider required.
 *
 * Activate via Spring profile "ai-stub" or config property ai-worker.mode=stub.
 */
public class AiWorkerStub {

    private static final Logger log = LoggerFactory.getLogger(AiWorkerStub.class);

    // Keywords used for deterministic skill matching
    private static final Set<String> COMMON_SKILLS = Set.of(
            "java", "spring boot", "spring", "postgresql", "python",
            "javascript", "react", "typescript", "docker", "kubernetes",
            "sql", "git", "aws", "rest", "api", "microservices",
            "html", "css", "node.js", "fastapi", "redis", "mongodb"
    );

    /**
     * Simulates CV text extraction from binary file bytes.
     * Returns a deterministic parsed result based on the filename.
     */
    public CVExtractResponse extractCv(byte[] fileBytes, String filename) {
        log.info("[AI Stub] Extracting CV: {} ({} bytes)", filename, fileBytes.length);

        String rawText = new String(fileBytes, StandardCharsets.UTF_8);
        if (rawText.length() > 500) {
            rawText = rawText.substring(0, 500);
        }

        // Deterministic parsed data based on filename hash
        Map<String, Object> parsedData = new LinkedHashMap<>();
        parsedData.put("full_name", "Stub Candidate (" + filename + ")");
        parsedData.put("email", "stub@matchajob.test");
        parsedData.put("phone", "+84-000-000-000");
        parsedData.put("skills", List.of("Java", "Spring Boot", "PostgreSQL", "Docker"));
        parsedData.put("experience_years", 3);
        parsedData.put("education", "Bachelor of Computer Science");

        return CVExtractResponse.builder()
                .rawText(rawText)
                .parsedData(parsedData)
                .charCount(rawText.length())
                .pageCount(1)
                .build();
    }

    /**
     * Simulates embedding generation. Returns deterministic vectors
     * using SHA-256 seeded coordinate generation (same approach as
     * the Python AI Worker's test provider).
     */
    public EmbeddingsResponse generateEmbeddings(List<String> texts) {
        log.info("[AI Stub] Generating embeddings for {} text chunk(s)", texts.size());

        List<List<Float>> embeddings = new ArrayList<>();
        for (String text : texts) {
            embeddings.add(generateDeterministicVector(text, 1536));
        }

        return EmbeddingsResponse.builder()
                .embeddings(embeddings)
                .dimension(1536)
                .model("stub-deterministic")
                .build();
    }

    /**
     * Simulates match scoring. Uses keyword overlap (Jaccard-like)
     * between job requirements and CV text to produce a deterministic score.
     */
    public MatchScoreResponse calculateMatchScore(MatchScoreRequest request) {
        log.info("[AI Stub] Scoring match for job: {}", request.getJobTitle());

        String cvText = request.getCvText() != null ? request.getCvText().toLowerCase() : "";
        String requirements = request.getJobRequirements() != null
                ? request.getJobRequirements().toLowerCase() : "";
        String jobTitle = request.getJobTitle() != null
                ? request.getJobTitle().toLowerCase() : "";

        // Extract skill keywords from requirements
        Set<String> requiredSkills = new LinkedHashSet<>();
        for (String skill : COMMON_SKILLS) {
            if (requirements.contains(skill) || jobTitle.contains(skill)) {
                requiredSkills.add(skill);
            }
        }
        if (requiredSkills.isEmpty()) {
            // Default skills if none detected
            requiredSkills.addAll(List.of("java", "spring boot", "postgresql"));
        }

        // Count how many required skills appear in the CV text
        Set<String> matchedSkills = new LinkedHashSet<>();
        for (String skill : requiredSkills) {
            if (cvText.contains(skill)) {
                matchedSkills.add(skill);
            }
        }

        // Also check candidate_skills from request
        if (request.getCandidateSkills() != null) {
            for (String candidateSkill : request.getCandidateSkills()) {
                String lower = candidateSkill.toLowerCase();
                if (requiredSkills.contains(lower)) {
                    matchedSkills.add(lower);
                }
            }
        }

        // Deterministic scoring
        double matchRatio = requiredSkills.isEmpty() ? 0.5
                : (double) matchedSkills.size() / requiredSkills.size();
        int skillsScore = (int) Math.round(matchRatio * 100);
        int experienceScore = cvText.contains("experience") || cvText.contains("năm") ? 80 : 60;
        int overallScore = (int) Math.round(skillsScore * 0.6 + experienceScore * 0.4);

        // Clamp to 0–100
        overallScore = Math.max(0, Math.min(100, overallScore));
        skillsScore = Math.max(0, Math.min(100, skillsScore));
        experienceScore = Math.max(0, Math.min(100, experienceScore));

        // Build breakdown
        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("required_skills", new ArrayList<>(requiredSkills));
        breakdown.put("matched_skills", new ArrayList<>(matchedSkills));
        breakdown.put("match_ratio", matchRatio);

        String rationale = String.format(
                "[Stub] Matched %d/%d required skills. Skills score: %d, Experience score: %d.",
                matchedSkills.size(), requiredSkills.size(), skillsScore, experienceScore);

        return MatchScoreResponse.builder()
                .overallScore(overallScore)
                .skillsScore(skillsScore)
                .experienceScore(experienceScore)
                .breakdown(breakdown)
                .rationale(rationale)
                .build();
    }

    /**
     * Checks stub health — always returns healthy.
     */
    public Map<String, Object> checkHealth() {
        return Map.of(
                "status", "healthy",
                "service", "ai-worker-stub",
                "version", "1.0.0-stub",
                "environment", "test"
        );
    }

    // =========================================================================
    // Internal: SHA-256 seeded deterministic vector generation
    // =========================================================================

    private List<Float> generateDeterministicVector(String text, int dimensions) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            long seed = bytesToLong(hash);

            List<Float> vector = new ArrayList<>(dimensions);
            double normSquared = 0.0;
            for (int i = 0; i < dimensions; i++) {
                float v = (float) Math.sin(seed * 0.001 * (i + 1));
                vector.add(v);
                normSquared += v * v;
            }

            // Normalize to unit length
            float norm = (float) Math.sqrt(normSquared);
            if (norm > 0) {
                for (int i = 0; i < dimensions; i++) {
                    vector.set(i, vector.get(i) / norm);
                }
            }

            return vector;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private long bytesToLong(byte[] bytes) {
        long result = 0;
        for (int i = 0; i < Math.min(8, bytes.length); i++) {
            result = (result << 8) | (bytes[i] & 0xFF);
        }
        return result;
    }
}
