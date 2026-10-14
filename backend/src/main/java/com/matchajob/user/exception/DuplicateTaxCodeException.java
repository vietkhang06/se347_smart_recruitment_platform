package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class DuplicateTaxCodeException extends AuthException {

    public DuplicateTaxCodeException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_TAX_CODE", "Conflict", message);
    }
}
