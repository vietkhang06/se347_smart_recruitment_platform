package com.matchajob.user.dto;

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
public class CompanySummaryResponse {

    private UUID id;

    private String name;

    @JsonProperty("membership_role")
    private String membershipRole;
}
