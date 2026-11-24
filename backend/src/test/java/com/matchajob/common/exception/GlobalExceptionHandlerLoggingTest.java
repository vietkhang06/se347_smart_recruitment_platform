package com.matchajob.common.exception;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.matchajob.auth.dto.LoginRequest;
import com.matchajob.auth.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.WebRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("GlobalExceptionHandler & Auth DTO Sensitive Logging Tests (SEC-LOG-01)")
class GlobalExceptionHandlerLoggingTest {

    @SuppressWarnings("unused")
    private void dummyEndpoint(RegisterRequest request) {
    }

    @Test
    @DisplayName("1. Validation error on RegisterRequest.password never logs plaintext rejected password")
    void handleMethodArgumentNotValid_neverLogsRejectedPassword() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            String secretShortPassword = "MyLeakedPwd1!";
            RegisterRequest dto = RegisterRequest.builder()
                    .email("user@example.com")
                    .password(secretShortPassword)
                    .role("CANDIDATE")
                    .build();

            BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(dto, "registerRequest");
            bindingResult.addError(new FieldError(
                    "registerRequest",
                    "password",
                    secretShortPassword,
                    false,
                    null,
                    null,
                    "Password must be at least 8 characters"
            ));

            MethodParameter param = new MethodParameter(
                    GlobalExceptionHandlerLoggingTest.class.getDeclaredMethod("dummyEndpoint", RegisterRequest.class), 0);
            MethodArgumentNotValidException ex = new MethodArgumentNotValidException(param, bindingResult);

            GlobalExceptionHandler handler = new GlobalExceptionHandler();
            ResponseEntity<Object> response = handler.handleMethodArgumentNotValid(
                    ex, new HttpHeaders(), HttpStatus.BAD_REQUEST, mock(WebRequest.class));

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(appender.list).isNotEmpty();
            String combinedLogs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", (a, b) -> a + "\n" + b);

            assertThat(combinedLogs).contains("password: Password must be at least 8 characters");
            assertThat(combinedLogs).doesNotContain(secretShortPassword);
        } finally {
            logger.detachAppender(appender);
        }
    }

    @Test
    @DisplayName("2. RegisterRequest and LoginRequest toString() exclude password field")
    void authRequestDtos_toStringExcludesPassword() {
        String rawSecret = "UltraSecretPass@999!";
        RegisterRequest reg = RegisterRequest.builder()
                .email("candidate@example.com")
                .password(rawSecret)
                .role("CANDIDATE")
                .build();
        LoginRequest login = LoginRequest.builder()
                .email("candidate@example.com")
                .password(rawSecret)
                .build();

        assertThat(reg.toString()).doesNotContain(rawSecret);
        assertThat(login.toString()).doesNotContain(rawSecret);
    }
}
