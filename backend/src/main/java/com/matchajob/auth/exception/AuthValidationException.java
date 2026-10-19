package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public class AuthValidationException extends AuthException {

    public AuthValidationException(String message) {
        super(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Validation Error", message);
    }
}
