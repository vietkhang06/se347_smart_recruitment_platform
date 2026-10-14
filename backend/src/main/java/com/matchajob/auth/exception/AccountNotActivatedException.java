package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public class AccountNotActivatedException extends AuthException {

    public AccountNotActivatedException(String message) {
        super(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVATED", "Account Not Activated", message);
    }
}
