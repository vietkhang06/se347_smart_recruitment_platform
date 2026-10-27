package com.matchajob.application.service;

import com.matchajob.application.model.ApplicationStage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Application State Machine Tests")
class ApplicationStateMachineTest {

    private ApplicationStateMachine stateMachine;

    @BeforeEach
    void setUp() {
        stateMachine = new ApplicationStateMachine();
    }

    @Nested
    @DisplayName("Valid Transitions")
    class ValidTransitions {

        @Test
        @DisplayName("NEW -> SCREENING is valid")
        void newToScreening() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.NEW, ApplicationStage.SCREENING))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("NEW -> REJECTED is valid")
        void newToRejected() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.NEW, ApplicationStage.REJECTED))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("SCREENING -> TESTING is valid")
        void screeningToTesting() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.SCREENING, ApplicationStage.TESTING))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("SCREENING -> INTERVIEW is valid")
        void screeningToInterview() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.SCREENING, ApplicationStage.INTERVIEW))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("SCREENING -> REJECTED is valid")
        void screeningToRejected() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.SCREENING, ApplicationStage.REJECTED))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("TESTING -> INTERVIEW is valid")
        void testingToInterview() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.TESTING, ApplicationStage.INTERVIEW))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("TESTING -> REJECTED is valid")
        void testingToRejected() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.TESTING, ApplicationStage.REJECTED))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("INTERVIEW -> OFFER is valid")
        void interviewToOffer() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.INTERVIEW, ApplicationStage.OFFER))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("INTERVIEW -> REJECTED is valid")
        void interviewToRejected() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.INTERVIEW, ApplicationStage.REJECTED))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("OFFER -> HIRED is valid")
        void offerToHired() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.OFFER, ApplicationStage.HIRED))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("OFFER -> REJECTED is valid")
        void offerToRejected() {
            assertThatCode(() -> stateMachine.validateTransition(ApplicationStage.OFFER, ApplicationStage.REJECTED))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Invalid Transitions & Terminal States")
    class InvalidTransitions {

        @ParameterizedTest
        @EnumSource(ApplicationStage.class)
        @DisplayName("Transition to identical stage throws IllegalStateException")
        void sameStageTransition_throwsException(ApplicationStage stage) {
            assertThatThrownBy(() -> stateMachine.validateTransition(stage, stage))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already in stage");
        }

        @Test
        @DisplayName("Terminal stage HIRED cannot transition to any other stage")
        void hiredTerminal_throwsException() {
            for (ApplicationStage target : ApplicationStage.values()) {
                if (target == ApplicationStage.HIRED) continue;
                assertThatThrownBy(() -> stateMachine.validateTransition(ApplicationStage.HIRED, target))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("terminal stage");
            }
        }

        @Test
        @DisplayName("Terminal stage REJECTED cannot transition to any other stage")
        void rejectedTerminal_throwsException() {
            for (ApplicationStage target : ApplicationStage.values()) {
                if (target == ApplicationStage.REJECTED) continue;
                assertThatThrownBy(() -> stateMachine.validateTransition(ApplicationStage.REJECTED, target))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("terminal stage");
            }
        }

        @Test
        @DisplayName("Backward transition (e.g. INTERVIEW -> SCREENING) throws IllegalStateException")
        void backwardTransition_throwsException() {
            assertThatThrownBy(() -> stateMachine.validateTransition(ApplicationStage.INTERVIEW, ApplicationStage.SCREENING))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Invalid stage transition");
        }

        @Test
        @DisplayName("Skipping stages (e.g. NEW -> OFFER) throws IllegalStateException")
        void skippingStages_throwsException() {
            assertThatThrownBy(() -> stateMachine.validateTransition(ApplicationStage.NEW, ApplicationStage.OFFER))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Invalid stage transition");
        }
    }

    @Nested
    @DisplayName("ApplicationStage Enum Helper Methods")
    class EnumHelpers {

        @Test
        @DisplayName("fromDbValue converts valid strings case-insensitively")
        void fromDbValue_valid() {
            assertThat(ApplicationStage.fromDbValue("new")).isEqualTo(ApplicationStage.NEW);
            assertThat(ApplicationStage.fromDbValue("SCREENING")).isEqualTo(ApplicationStage.SCREENING);
            assertThat(ApplicationStage.fromDbValue("Hired")).isEqualTo(ApplicationStage.HIRED);
        }

        @Test
        @DisplayName("fromDbValue throws on invalid or null strings")
        void fromDbValue_invalid() {
            assertThatThrownBy(() -> ApplicationStage.fromDbValue("invalid_stage"))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> ApplicationStage.fromDbValue(null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("isTerminal identifies HIRED and REJECTED as terminal")
        void isTerminal_checks() {
            assertThat(ApplicationStage.HIRED.isTerminal()).isTrue();
            assertThat(ApplicationStage.REJECTED.isTerminal()).isTrue();
            assertThat(ApplicationStage.NEW.isTerminal()).isFalse();
            assertThat(ApplicationStage.OFFER.isTerminal()).isFalse();
        }
    }
}
