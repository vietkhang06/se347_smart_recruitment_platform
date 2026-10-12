package com.matchajob.user.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyMemberId implements Serializable {
    private UUID companyId;
    private UUID userId;
}
