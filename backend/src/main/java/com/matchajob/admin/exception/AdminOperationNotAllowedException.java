package com.matchajob.admin.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

/**
 * Raised when an admin action is refused by a business safety rule
 * (self-suspension, last active admin protection). Mapped to HTTP 400.
 */
public class AdminOperationNotAllowedException extends AuthException {

    public AdminOperationNotAllowedException(String errorCode, String message) {
        super(HttpStatus.BAD_REQUEST, errorCode, "Admin Operation Not Allowed", message);
    }
}
