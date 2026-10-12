package com.matchajob.auth.exception;

import org.springframework.http.HttpStatus;

public abstract class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;
    private final String title;

    protected AuthException(HttpStatus status, String errorCode, String title, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.title = title;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getTitle() {
        return title;
    }
}
