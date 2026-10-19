package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends AuthException {

    public EmailAlreadyExistsException(String message) {
        super(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email Already Exists", message);
    }
}
