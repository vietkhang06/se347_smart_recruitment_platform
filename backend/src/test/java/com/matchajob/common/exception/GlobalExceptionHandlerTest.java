package com.matchajob.common.exception;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

    @Test
    @DisplayName("1. handleDataIntegrity with uq_companies_tax_code constraint name returns 409 DUPLICATE_TAX_CODE")
    void handleDataIntegrity_taxCodeConstraint_returnsDuplicateTaxCode() {
        ConstraintViolationException cve = new ConstraintViolationException(
                "duplicate key value",
                new SQLException("duplicate key", "23505"),
                "uq_companies_tax_code"
        );
        DataIntegrityViolationException dive = new DataIntegrityViolationException("error", cve);

        ResponseEntity<ProblemDetail> response = exceptionHandler.handleDataIntegrityViolation(dive);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ProblemDetail problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(409);
        assertThat(problem.getTitle()).isEqualTo("Conflict");
        assertThat(problem.getProperties()).containsEntry("code", "DUPLICATE_TAX_CODE");
        assertThat(problem.getDetail()).isEqualTo("A company with this tax code already exists");
    }

    @Test
    @DisplayName("2. handleDataIntegrity with other constraint name returns 409 CONSTRAINT_VIOLATION")
    void handleDataIntegrity_otherConstraint_returnsConstraintViolation() {
        ConstraintViolationException cve = new ConstraintViolationException(
                "duplicate key value",
                new SQLException("duplicate key", "23505"),
                "uq_users_email"
        );
        DataIntegrityViolationException dive = new DataIntegrityViolationException("error", cve);

        ResponseEntity<ProblemDetail> response = exceptionHandler.handleDataIntegrityViolation(dive);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ProblemDetail problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(409);
        assertThat(problem.getTitle()).isEqualTo("Conflict");
        assertThat(problem.getProperties()).containsEntry("code", "CONSTRAINT_VIOLATION");
        assertThat(problem.getDetail()).isEqualTo("Database constraint violation occurred");
    }

    @Test
    @DisplayName("3. handleDataIntegrity without constraint name falls back to 409 CONSTRAINT_VIOLATION")
    void handleDataIntegrity_nullConstraint_returnsConstraintViolation() {
        DataIntegrityViolationException dive = new DataIntegrityViolationException("generic db integrity failure");

        ResponseEntity<ProblemDetail> response = exceptionHandler.handleDataIntegrityViolation(dive);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ProblemDetail problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.getProperties()).containsEntry("code", "CONSTRAINT_VIOLATION");
    }
}
