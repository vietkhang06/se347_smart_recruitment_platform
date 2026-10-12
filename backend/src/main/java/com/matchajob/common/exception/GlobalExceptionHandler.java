package com.matchajob.common.exception;

import com.matchajob.auth.exception.AuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ProblemDetail> handleAuthException(AuthException ex) {
        log.warn("Authentication error [{}]: {}", ex.getErrorCode(), ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                ex.getStatus(),
                ex.getMessage()
        );
        problem.setTitle(ex.getTitle());
        problem.setType(URI.create("https://matchajob.com/errors/" + ex.getErrorCode().toLowerCase().replace('_', '-')));
        problem.setProperty("code", ex.getErrorCode());
        problem.setProperty("timestamp", Instant.now().toString());
        return ResponseEntity.status(ex.getStatus()).body(problem);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        log.warn("Access denied error: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "Access is denied: insufficient permissions or invalid role"
        );
        problem.setTitle("Forbidden");
        problem.setType(URI.create("https://matchajob.com/errors/forbidden"));
        problem.setProperty("code", "FORBIDDEN");
        problem.setProperty("timestamp", Instant.now().toString());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Database constraint violation: {}", ex.getMessage());
        String constraintName = extractConstraintName(ex);

        if ("uq_companies_tax_code".equalsIgnoreCase(constraintName)) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.CONFLICT,
                    "A company with this tax code already exists"
            );
            problem.setTitle("Conflict");
            problem.setType(URI.create("https://matchajob.com/errors/duplicate-tax-code"));
            problem.setProperty("code", "DUPLICATE_TAX_CODE");
            problem.setProperty("timestamp", Instant.now().toString());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "Database constraint violation occurred"
        );
        problem.setTitle("Conflict");
        problem.setType(URI.create("https://matchajob.com/errors/conflict"));
        problem.setProperty("code", "CONSTRAINT_VIOLATION");
        problem.setProperty("timestamp", Instant.now().toString());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    private String extractConstraintName(org.springframework.dao.DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof org.hibernate.exception.ConstraintViolationException cve) {
                if (cve.getConstraintName() != null) {
                    return cve.getConstraintName();
                }
            }
            try {
                var method = current.getClass().getMethod("getServerErrorMessage");
                Object sem = method.invoke(current);
                if (sem != null) {
                    var getConstraintMethod = sem.getClass().getMethod("getConstraint");
                    Object constraint = getConstraintMethod.invoke(sem);
                    if (constraint != null) {
                        return constraint.toString();
                    }
                }
            } catch (Exception ignored) {
            }
            current = current.getCause();
        }
        return null;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        log.warn("Validation error on request: {}", ex.getMessage());
        String defaultDetail = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Validation failed for one or more fields");

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, defaultDetail);
        problem.setTitle("Validation Error");
        problem.setType(URI.create("https://matchajob.com/errors/validation-error"));
        problem.setProperty("code", "VALIDATION_ERROR");
        problem.setProperty("timestamp", Instant.now().toString());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        problem.setProperty("errors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        log.warn("Malformed HTTP request body: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Required request body is missing or malformed"
        );
        problem.setTitle("Malformed Request");
        problem.setType(URI.create("https://matchajob.com/errors/malformed-request"));
        problem.setProperty("code", "VALIDATION_ERROR");
        problem.setProperty("timestamp", Instant.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        log.error("Unhandled server exception: ", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage() != null ? ex.getMessage() : "An unexpected server error occurred"
        );
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("https://matchajob.com/errors/internal-server-error"));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}
