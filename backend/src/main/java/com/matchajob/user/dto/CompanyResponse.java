package com.matchajob.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.matchajob.user.model.Company;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResponse {

    private UUID id;

    @JsonProperty("owner_id")
    private UUID ownerId;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("logo_url")
    private String logoUrl;

    @JsonProperty("cover_image_url")
    private String coverImageUrl;

    private String industry;

    private String size;

    private String location;

    private String address;

    private String website;

    private String email;

    private String phone;

    @JsonProperty("tax_code")
    private String taxCode;

    @JsonProperty("is_verified")
    private Boolean isVerified;

    private String about;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("updated_at")
    private Instant updatedAt;

    public static CompanyResponse fromEntity(Company company) {
        if (company == null) {
            return null;
        }
        return CompanyResponse.builder()
                .id(company.getId())
                .ownerId(company.getOwnerId())
                .name(company.getName())
                .shortName(company.getShortName())
                .logoUrl(company.getLogoUrl())
                .coverImageUrl(company.getCoverImageUrl())
                .industry(company.getIndustry())
                .size(company.getSize())
                .location(company.getLocation())
                .address(company.getAddress())
                .website(company.getWebsite())
                .email(company.getEmail())
                .phone(company.getPhone())
                .taxCode(company.getTaxCode())
                .isVerified(company.getIsVerified())
                .about(company.getAbout())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .build();
    }
}
