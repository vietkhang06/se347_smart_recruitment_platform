package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class UserNotAuthenticatedException extends AuthException {

    public UserNotAuthenticatedException(String message) {
        super(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized", message);
    }
}
