package com.matchajob.common.exception;

import com.matchajob.auth.exception.AuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.nio.file.NoSuchFileException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ProblemDetail> handleAuthException(AuthException ex) {
        log.warn("Authentication error [{}]: {}", ex.getErrorCode(), ex.getMessage());
        ProblemDetail problem = problem(
                ex.getStatus(),
                ex.getTitle(),
                ex.getMessage(),
                ex.getErrorCode().toLowerCase().replace('_', '-'));
        problem.setProperty("code", ex.getErrorCode());
        return ResponseEntity.status(ex.getStatus()).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied error: {}", ex.getMessage());
        ProblemDetail problem = problem(
                HttpStatus.FORBIDDEN,
                "Forbidden",
                "Access is denied: insufficient permissions or invalid role",
                "forbidden");
        problem.setProperty("code", "FORBIDDEN");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Database constraint violation: {}", ex.getMessage());
        String constraintName = extractConstraintName(ex);

        if ("uq_companies_tax_code".equalsIgnoreCase(constraintName)) {
            ProblemDetail problem = problem(
                    HttpStatus.CONFLICT,
                    "Conflict",
                    "A company with this tax code already exists",
                    "duplicate-tax-code");
            problem.setProperty("code", "DUPLICATE_TAX_CODE");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
        }

        ProblemDetail problem = problem(
                HttpStatus.CONFLICT,
                "Conflict",
                "Database constraint violation occurred",
                "conflict");
        problem.setProperty("code", "CONSTRAINT_VIOLATION");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException ex) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid request", ex.getMessage(), "invalid-request");
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail handleNotFound(NoSuchElementException ex) {
        return problem(HttpStatus.NOT_FOUND, "Resource not found", ex.getMessage(), "not-found");
    }

    @ExceptionHandler(NoSuchFileException.class)
    public ProblemDetail handleStoredFileNotFound(NoSuchFileException ex) {
        log.warn("Stored file was not found", ex);
        return problem(
                HttpStatus.NOT_FOUND,
                "Resource not found",
                "The stored CV file was not found.",
                "not-found");
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        ProblemDetail problem = problem(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "File is too large",
                "The uploaded file exceeds the configured request limit.",
                "payload-too-large");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        log.warn("Validation error on request: {}", ex.getMessage());
        String defaultDetail = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Validation failed for one or more fields");

        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                "Validation Error",
                defaultDetail,
                "validation-error");
        problem.setProperty("code", "VALIDATION_ERROR");

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
            WebRequest request) {
        log.warn("Malformed HTTP request body: {}", ex.getMessage());
        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                "Malformed Request",
                "Required request body is missing or malformed",
                "malformed-request");
        problem.setProperty("code", "VALIDATION_ERROR");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        log.error("Unhandled server exception: ", ex);
        return problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected server error occurred.",
                "internal-server-error");
    }

    private String extractConstraintName(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof org.hibernate.exception.ConstraintViolationException constraintViolation
                    && constraintViolation.getConstraintName() != null) {
                return constraintViolation.getConstraintName();
            }
            try {
                var getServerErrorMessage = current.getClass().getMethod("getServerErrorMessage");
                Object serverErrorMessage = getServerErrorMessage.invoke(current);
                if (serverErrorMessage != null) {
                    var getConstraint = serverErrorMessage.getClass().getMethod("getConstraint");
                    Object constraint = getConstraint.invoke(serverErrorMessage);
                    if (constraint != null) {
                        return constraint.toString();
                    }
                }
            } catch (ReflectiveOperationException ignored) {
                // This exception type does not expose a PostgreSQL constraint name.
            }
            current = current.getCause();
        }
        return null;
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String errorType) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create("https://matchajob.com/errors/" + errorType));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}
