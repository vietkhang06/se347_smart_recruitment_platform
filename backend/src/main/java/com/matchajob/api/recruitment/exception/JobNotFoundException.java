package com.matchajob.api.recruitment.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

import java.util.UUID;

public class JobNotFoundException extends AuthException {

    public JobNotFoundException(UUID id) {
        super(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Job Not Found", "Job not found with id: " + id);
    }

    public JobNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Job Not Found", message);
    }
}
