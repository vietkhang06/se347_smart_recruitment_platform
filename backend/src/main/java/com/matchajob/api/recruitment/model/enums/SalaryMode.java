package com.matchajob.api.recruitment.model.enums;

public enum SalaryMode {
    RANGE("range"),
    SINGLE("single"),
    NEGOTIABLE("negotiable");

    private final String value;

    SalaryMode(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SalaryMode fromValue(String value) {
        if (value == null) return null;
        for (SalaryMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value) || mode.name().equalsIgnoreCase(value)) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Unknown SalaryMode: " + value);
    }
}
