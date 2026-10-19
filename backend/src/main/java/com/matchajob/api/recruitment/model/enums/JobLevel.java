package com.matchajob.api.recruitment.model.enums;

public enum JobLevel {
    INTERN("intern"),
    FRESHER("fresher"),
    JUNIOR("junior"),
    MIDDLE("middle"),
    SENIOR("senior"),
    LEAD("lead"),
    DIRECTOR("director");

    private final String value;

    JobLevel(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static JobLevel fromValue(String value) {
        if (value == null) return null;
        for (JobLevel level : values()) {
            if (statusMatch(level, value)) {
                return level;
            }
        }
        throw new IllegalArgumentException("Unknown JobLevel: " + value);
    }

    private static boolean statusMatch(JobLevel level, String value) {
        return level.value.equalsIgnoreCase(value) || level.name().equalsIgnoreCase(value);
    }
}
