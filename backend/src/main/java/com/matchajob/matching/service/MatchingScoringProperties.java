package com.matchajob.matching.service;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Matching and Hybrid Scoring.
 * Fully externalized and validated against business invariants.
 */
@Component
@ConfigurationProperties(prefix = "matchajob.matching.scoring")
public class MatchingScoringProperties {

    private String configVersion = "v1.0-hybrid-60-40";
    private String algorithmId = "hybrid-rule-semantic-v1";
    private double ruleWeight = 0.60;
    private double semanticWeight = 0.40;
    private int shortlistThreshold = 70;
    private int reviewThreshold = 50;

    public MatchingScoringProperties() {
    }

    public MatchingScoringProperties(String configVersion, String algorithmId, double ruleWeight, double semanticWeight, int shortlistThreshold) {
        this.configVersion = configVersion;
        this.algorithmId = algorithmId;
        this.ruleWeight = ruleWeight;
        this.semanticWeight = semanticWeight;
        this.shortlistThreshold = shortlistThreshold;
        validate();
    }

    @PostConstruct
    public void validate() {
        if (!Double.isFinite(ruleWeight) || !Double.isFinite(semanticWeight)) {
            throw new IllegalArgumentException(
                    "ruleWeight and semanticWeight must be finite numbers, got: ruleWeight="
                            + ruleWeight + ", semanticWeight=" + semanticWeight);
        }
        if (ruleWeight < 0.0 || ruleWeight > 1.0) {
            throw new IllegalArgumentException("ruleWeight must be between 0.0 and 1.0, got: " + ruleWeight);
        }
        if (semanticWeight < 0.0 || semanticWeight > 1.0) {
            throw new IllegalArgumentException("semanticWeight must be between 0.0 and 1.0, got: " + semanticWeight);
        }
        double sum = ruleWeight + semanticWeight;
        if (Math.abs(sum - 1.0) > 0.001) {
            throw new IllegalArgumentException("ruleWeight and semanticWeight must sum to 1.0, got sum: " + sum);
        }
        if (shortlistThreshold < 0 || shortlistThreshold > 100) {
            throw new IllegalArgumentException("shortlistThreshold must be between 0 and 100, got: " + shortlistThreshold);
        }
        if (reviewThreshold < 0 || reviewThreshold > shortlistThreshold) {
            throw new IllegalArgumentException(
                    "reviewThreshold must be between 0 and shortlistThreshold (" + shortlistThreshold + "), got: " + reviewThreshold);
        }
    }

    public String getConfigVersion() {
        return configVersion;
    }

    public void setConfigVersion(String configVersion) {
        this.configVersion = configVersion;
    }

    public String getAlgorithmId() {
        return algorithmId;
    }

    public void setAlgorithmId(String algorithmId) {
        this.algorithmId = algorithmId;
    }

    public double getRuleWeight() {
        return ruleWeight;
    }

    public void setRuleWeight(double ruleWeight) {
        this.ruleWeight = ruleWeight;
    }

    public double getSemanticWeight() {
        return semanticWeight;
    }

    public void setSemanticWeight(double semanticWeight) {
        this.semanticWeight = semanticWeight;
    }

    public int getShortlistThreshold() {
        return shortlistThreshold;
    }

    public void setShortlistThreshold(int shortlistThreshold) {
        this.shortlistThreshold = shortlistThreshold;
    }

    public int getReviewThreshold() {
        return reviewThreshold;
    }

    public void setReviewThreshold(int reviewThreshold) {
        this.reviewThreshold = reviewThreshold;
    }
}
