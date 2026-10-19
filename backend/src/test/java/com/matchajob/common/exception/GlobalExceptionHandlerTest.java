package com.matchajob.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    void handleGenericException_returnsProblemDetailWith500() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        ProblemDetail problem = handler.handleGenericException(new RuntimeException("Simulated failure"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problem.getTitle()).isEqualTo("Internal Server Error");
        assertThat(problem.getDetail()).isEqualTo("Simulated failure");
        assertThat(problem.getProperties()).containsKey("timestamp");
    }
}
