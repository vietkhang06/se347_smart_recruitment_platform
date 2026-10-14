package com.matchajob.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {

    private UUID id;

    private String email;

    @JsonProperty("full_name")
    private String fullName;

    private String role;

    private String status;

    @JsonProperty("is_verified")
    private Boolean isVerified;

    private String message;
}
