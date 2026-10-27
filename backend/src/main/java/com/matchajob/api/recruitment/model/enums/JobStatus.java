package com.matchajob.api.recruitment.model.enums;

public enum JobStatus {
    DRAFT("draft"),
    PENDING("pending"),
    ACTIVE("active"),
    PAUSED("paused"),
    CLOSED("closed");

    private final String value;

    JobStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static JobStatus fromValue(String value) {
        if (value == null) return null;
        for (JobStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown JobStatus: " + value);
    }
}
