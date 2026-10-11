package com.matchajob.api.recruitment.model.enums;

public enum WorkType {
    FULL_TIME("full_time"),
    PART_TIME("part_time"),
    HYBRID("hybrid"),
    REMOTE("remote"),
    CONTRACT("contract");

    private final String value;

    WorkType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static WorkType fromValue(String value) {
        if (value == null) return null;
        for (WorkType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown WorkType: " + value);
    }
}
