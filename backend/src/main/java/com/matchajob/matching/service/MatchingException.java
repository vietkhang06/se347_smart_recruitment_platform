package com.matchajob.matching.service;

import java.time.Instant;
import org.springframework.http.HttpStatus;

/** Safe matching error contract; never contains raw provider response text. */
public class MatchingException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final boolean retryable;
    private final Instant retryAfter;
    public MatchingException(HttpStatus status, String code, String message, boolean retryable, Instant retryAfter) {
        super(message);
        this.status = status; this.code = code; this.retryable = retryable; this.retryAfter = retryAfter;
    }
    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public boolean isRetryable() { return retryable; }
    public Instant getRetryAfter() { return retryAfter; }
}
