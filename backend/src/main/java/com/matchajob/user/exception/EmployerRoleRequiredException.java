package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class EmployerRoleRequiredException extends AuthException {

    public EmployerRoleRequiredException(String message) {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden", message);
    }
}
