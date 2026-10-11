package com.matchajob.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
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
public class CreateCompanyRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must not exceed 255 characters")
    private String name;

    @JsonProperty("short_name")
    @Size(max = 50, message = "Short name must not exceed 50 characters")
    private String shortName;

    @JsonProperty("tax_code")
    @Size(max = 30, message = "Tax code must not exceed 30 characters")
    private String taxCode;

    @Size(max = 100, message = "Industry must not exceed 100 characters")
    private String industry;

    @Pattern(
            regexp = "^(1-49|50-150|150-500|500-1000|1000\\+)$",
            message = "Size must be one of: 1-49, 50-150, 150-500, 500-1000, 1000+"
    )
    private String size;

    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @Size(max = 1000, message = "Address must not exceed 1000 characters")
    private String address;

    @Size(max = 500, message = "Website URL must not exceed 500 characters")
    private String website;

    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String about;

    @JsonProperty("logo_url")
    @Size(max = 500, message = "Logo URL must not exceed 500 characters")
    private String logoUrl;

    @JsonProperty("cover_image_url")
    @Size(max = 500, message = "Cover image URL must not exceed 500 characters")
    private String coverImageUrl;
}
