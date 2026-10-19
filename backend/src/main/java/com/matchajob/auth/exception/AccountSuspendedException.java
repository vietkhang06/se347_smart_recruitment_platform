package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public class AccountSuspendedException extends AuthException {

    public AccountSuspendedException(String message) {
        super(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "Account Suspended", message);
    }
}
