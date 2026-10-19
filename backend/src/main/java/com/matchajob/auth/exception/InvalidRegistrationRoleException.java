package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public class InvalidRegistrationRoleException extends AuthException {

    public InvalidRegistrationRoleException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_REGISTRATION_ROLE", "Invalid Registration Role", message);
    }
}
