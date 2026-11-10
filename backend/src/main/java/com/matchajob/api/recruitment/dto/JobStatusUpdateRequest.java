package com.matchajob.api.recruitment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobStatusUpdateRequest {
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(?i)(draft|active|paused|closed)$", message = "Status must be draft, active, paused, or closed")
    private String status; // active, paused, closed
}
