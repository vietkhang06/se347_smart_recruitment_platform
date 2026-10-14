package com.matchajob.fixture;

import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.CompanyMember;

import java.time.Instant;
import java.util.UUID;

public final class CompanyFixture {

    private CompanyFixture() {
    }

    public static Company createCompany(UUID companyId, UUID ownerId, String name, String taxCode) {
        return Company.builder()
                .id(companyId != null ? companyId : UUID.randomUUID())
                .ownerId(ownerId != null ? ownerId : UUID.randomUUID())
                .name(name != null ? name : "Matcha Solutions Corp")
                .shortName("MatchaCorp")
                .taxCode(taxCode != null ? taxCode : "0312345678")
                .industry("Information Technology")
                .size("50-150")
                .location("Ho Chi Minh City")
                .address("123 Le Loi, District 1")
                .website("https://matchajob.com")
                .email("contact@matchajob.com")
                .phone("+84901234567")
                .about("Leading AI recruitment platform")
                .isVerified(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    public static CompanyMember createOwnerMember(UUID companyId, UUID userId) {
        return CompanyMember.builder()
                .companyId(companyId)
                .userId(userId)
                .role("owner")
                .joinedAt(Instant.now())
                .build();
    }

    public static CreateCompanyRequest createValidRequest() {
        return CreateCompanyRequest.builder()
                .name("Matcha Solutions Corp")
                .shortName("MatchaCorp")
                .taxCode("0312345678")
                .industry("Information Technology")
                .size("50-150")
                .location("Ho Chi Minh City")
                .address("123 Le Loi, District 1")
                .website("https://matchajob.com")
                .email("contact@matchajob.com")
                .phone("+84901234567")
                .about("Leading AI recruitment platform")
                .build();
    }
}
