package com.matchajob.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserStatusRequest {

    @Schema(description = "Target account status", example = "suspended",
            allowableValues = {"active", "suspended"})
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(active|suspended)$", message = "Status must be either 'active' or 'suspended'")
    private String status;

    @Schema(description = "Free-text reason recorded in the audit log",
            example = "Violation of terms of service", maxLength = 500)
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;
}
