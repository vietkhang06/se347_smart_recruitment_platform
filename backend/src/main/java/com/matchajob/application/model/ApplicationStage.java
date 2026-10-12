package com.matchajob.application.model;

import java.util.*;

/**
 * Enum representing all valid stages in the application recruitment pipeline.
 * Maps directly to the CHECK constraint in V2/V5 migration for applications.stage.
 */
public enum ApplicationStage {

    NEW("new"),
    SCREENING("screening"),
    TESTING("testing"),
    INTERVIEW("interview"),
    OFFER("offer"),
    HIRED("hired"),
    REJECTED("rejected");

    private final String dbValue;

    /**
     * Valid state transitions matrix.
     * Key = current stage, Value = set of allowed next stages.
     */
    private static final Map<ApplicationStage, Set<ApplicationStage>> VALID_TRANSITIONS;

    static {
        VALID_TRANSITIONS = new EnumMap<>(ApplicationStage.class);
        VALID_TRANSITIONS.put(NEW, EnumSet.of(SCREENING, REJECTED));
        VALID_TRANSITIONS.put(SCREENING, EnumSet.of(TESTING, INTERVIEW, REJECTED));
        VALID_TRANSITIONS.put(TESTING, EnumSet.of(INTERVIEW, REJECTED));
        VALID_TRANSITIONS.put(INTERVIEW, EnumSet.of(OFFER, REJECTED));
        VALID_TRANSITIONS.put(OFFER, EnumSet.of(HIRED, REJECTED));
        // Terminal states — no further transitions allowed
        VALID_TRANSITIONS.put(HIRED, EnumSet.noneOf(ApplicationStage.class));
        VALID_TRANSITIONS.put(REJECTED, EnumSet.noneOf(ApplicationStage.class));
    }

    ApplicationStage(String dbValue) {
        this.dbValue = dbValue;
    }

    /**
     * Returns the lowercase database value stored in applications.stage column.
     */
    public String getDbValue() {
        return dbValue;
    }

    /**
     * Checks whether transitioning from this stage to the target stage is valid.
     */
    public boolean canTransitionTo(ApplicationStage target) {
        Set<ApplicationStage> allowed = VALID_TRANSITIONS.get(this);
        return allowed != null && allowed.contains(target);
    }

    /**
     * Returns the set of stages that this stage can transition to.
     */
    public Set<ApplicationStage> getAllowedTransitions() {
        return Collections.unmodifiableSet(
                VALID_TRANSITIONS.getOrDefault(this, EnumSet.noneOf(ApplicationStage.class)));
    }

    /**
     * Whether this stage is a terminal (final) state.
     */
    public boolean isTerminal() {
        return this == HIRED || this == REJECTED;
    }

    /**
     * Look up an ApplicationStage from its database string value.
     *
     * @throws IllegalArgumentException if the value doesn't match any stage
     */
    public static ApplicationStage fromDbValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Application stage value cannot be null");
        }
        for (ApplicationStage stage : values()) {
            if (stage.dbValue.equals(value.toLowerCase())) {
                return stage;
            }
        }
        throw new IllegalArgumentException("Unknown application stage: " + value);
    }
}
