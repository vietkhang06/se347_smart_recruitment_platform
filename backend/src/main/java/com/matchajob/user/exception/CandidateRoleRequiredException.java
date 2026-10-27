package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class CandidateRoleRequiredException extends AuthException {

    public CandidateRoleRequiredException(String message) {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden", message);
    }
}
