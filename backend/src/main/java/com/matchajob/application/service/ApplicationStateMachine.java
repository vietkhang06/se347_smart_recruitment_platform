package com.matchajob.application.service;

import com.matchajob.application.model.ApplicationStage;
import org.springframework.stereotype.Component;

/**
 * Encapsulates the state machine validation logic for application stage transitions.
 * Validates that a requested transition from one stage to another is allowed
 * according to the recruitment pipeline rules.
 */
@Component
public class ApplicationStateMachine {

    /**
     * Validates whether the transition from currentStage to targetStage is allowed.
     *
     * @param currentStage the current stage of the application
     * @param targetStage  the desired next stage
     * @throws IllegalStateException if the transition is not allowed
     */
    public void validateTransition(ApplicationStage currentStage, ApplicationStage targetStage) {
        if (currentStage == targetStage) {
            throw new IllegalStateException(
                    String.format("Application is already in stage '%s'.", currentStage.getDbValue()));
        }

        if (currentStage.isTerminal()) {
            throw new IllegalStateException(
                    String.format("Cannot transition from terminal stage '%s'. " +
                                  "Applications in '%s' state are final.",
                                  currentStage.getDbValue(), currentStage.getDbValue()));
        }

        if (!currentStage.canTransitionTo(targetStage)) {
            throw new IllegalStateException(
                    String.format("Invalid stage transition from '%s' to '%s'. " +
                                  "Allowed transitions from '%s': %s",
                                  currentStage.getDbValue(),
                                  targetStage.getDbValue(),
                                  currentStage.getDbValue(),
                                  currentStage.getAllowedTransitions()));
        }
    }
}
