package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class UserNotFoundException extends AuthException {

    public UserNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User Not Found", message);
    }
}
