package com.matchajob.user.exception;

import com.matchajob.auth.exception.AuthException;
import org.springframework.http.HttpStatus;

public class CandidateProfileNotFoundException extends AuthException {

    public CandidateProfileNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "CANDIDATE_PROFILE_NOT_FOUND", "Candidate Profile Not Found", message);
    }
}
