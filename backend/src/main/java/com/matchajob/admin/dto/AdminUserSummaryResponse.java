package com.matchajob.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.matchajob.user.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserSummaryResponse {

    private UUID id;

    private String email;

    @JsonProperty("full_name")
    private String fullName;

    private String phone;

    private String role;

    private String status;

    @JsonProperty("is_verified")
    private Boolean isVerified;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("last_login_at")
    private Instant lastLoginAt;

    public static AdminUserSummaryResponse fromEntity(User user) {
        return AdminUserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().toUpperCase(Locale.ROOT) : null)
                .status(user.getStatus())
                .isVerified(user.getIsVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
