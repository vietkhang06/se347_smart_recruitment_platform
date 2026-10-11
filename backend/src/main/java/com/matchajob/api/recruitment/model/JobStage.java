package com.matchajob.api.recruitment.model;

public enum JobStage {
    NEW("new"),
    SCREENING("screening"),
    TESTING("testing"),
    INTERVIEW("interview"),
    OFFER("offer"),
    REJECTED("rejected");

    private final String value;

    JobStage(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static JobStage fromValue(String value) {
        for (JobStage stage : values()) {
            if (stage.value.equalsIgnoreCase(value)) {
                return stage;
            }
        }
        throw new IllegalArgumentException("Unknown stage: " + value);
    }
}