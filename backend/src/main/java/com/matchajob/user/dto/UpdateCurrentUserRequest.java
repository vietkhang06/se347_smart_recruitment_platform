package com.matchajob.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

/**
 * Allowlisted partial update payload for the authenticated user's base profile.
 *
 * <p>Only these four fields are ever writable. Privileged columns
 * ({@code email}, {@code role}, {@code status}, {@code is_verified}, {@code password_hash},
 * {@code id}, {@code deleted_at}) have no setter and are dropped by
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)}, so a client cannot escalate
 * privileges by adding them to the JSON body.</p>
 */
@Schema(description = "Partial update request payload for the current authenticated user")
@Getter
@ToString
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCurrentUserRequest {

    @Schema(description = "Display name", example = "Nguyen Van A", maxLength = 150)
    @Size(max = 150, message = "Full name must not exceed 150 characters")
    private String fullName;

    @Schema(description = "Contact phone number", example = "+84901234567", maxLength = 20)
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Pattern(regexp = "^$|^[+]?[0-9][0-9 .()\\-]{6,19}$", message = "Phone number is invalid")
    private String phone;

    @Schema(description = "Avatar image URL", example = "https://cdn.example.com/a.png", maxLength = 500)
    @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
    @Pattern(regexp = "^$|^https?://.+", message = "Avatar URL must be an http(s) URL")
    private String avatarUrl;

    @Schema(description = "IANA timezone identifier", example = "Asia/Ho_Chi_Minh", maxLength = 50)
    @Size(max = 50, message = "Timezone must not exceed 50 characters")
    private String timezone;

    @JsonIgnore
    private final Set<String> presentFields = new HashSet<>();

    public void setFullName(String fullName) {
        this.fullName = fullName;
        this.presentFields.add("full_name");
    }

    public void setPhone(String phone) {
        this.phone = phone;
        this.presentFields.add("phone");
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
        this.presentFields.add("avatar_url");
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
        this.presentFields.add("timezone");
    }

    @JsonIgnore
    public boolean hasFullName() {
        return presentFields.contains("full_name");
    }

    @JsonIgnore
    public boolean hasPhone() {
        return presentFields.contains("phone");
    }

    @JsonIgnore
    public boolean hasAvatarUrl() {
        return presentFields.contains("avatar_url");
    }

    @JsonIgnore
    public boolean hasTimezone() {
        return presentFields.contains("timezone");
    }

    @JsonIgnore
    public boolean hasAnyUpdate() {
        return !presentFields.isEmpty();
    }
}
