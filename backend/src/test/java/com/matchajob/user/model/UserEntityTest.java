package com.matchajob.user.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserEntityTest {

    @Test
    @DisplayName("User builder and lifecycle defaults set expected values")
    void user_builderAndLifecycleDefaults() {
        User user = User.builder()
                .email("test@example.com")
                .passwordHash("hashed_pwd")
                .fullName("Test User")
                .role("candidate")
                .build();

        user.onCreate();

        assertThat(user.getEmail()).isEqualTo("test@example.com");
        assertThat(user.getStatus()).isEqualTo("pending_verification");
        assertThat(user.getIsVerified()).isFalse();
        assertThat(user.getTimezone()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();

        Instant beforeUpdate = user.getUpdatedAt();
        user.onUpdate();
        assertThat(user.getUpdatedAt()).isAfterOrEqualTo(beforeUpdate);
    }

    @Test
    @DisplayName("CandidateProfile builder and lifecycle defaults set expected values")
    void candidateProfile_builderAndLifecycleDefaults() {
        UUID userId = UUID.randomUUID();
        CandidateProfile profile = CandidateProfile.builder()
                .userId(userId)
                .build();

        profile.onCreate();

        assertThat(profile.getUserId()).isEqualTo(userId);
        assertThat(profile.getCreatedAt()).isNotNull();
        assertThat(profile.getUpdatedAt()).isNotNull();
        assertThat(profile.getHeadline()).isNull();
        assertThat(profile.getBio()).isNull();
    }

    @Test
    @DisplayName("Company builder and lifecycle defaults set expected values")
    void company_builderAndLifecycleDefaults() {
        UUID ownerId = UUID.randomUUID();
        Company company = Company.builder()
                .ownerId(ownerId)
                .name("Matcha Corp")
                .build();

        company.onCreate();

        assertThat(company.getOwnerId()).isEqualTo(ownerId);
        assertThat(company.getName()).isEqualTo("Matcha Corp");
        assertThat(company.getIsVerified()).isFalse();
        assertThat(company.getCreatedAt()).isNotNull();
        assertThat(company.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("CompanyMember and CompanyMemberId composite key equality and defaults")
    void companyMember_compositeKeyAndDefaults() {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        CompanyMemberId id1 = new CompanyMemberId(companyId, userId);
        CompanyMemberId id2 = new CompanyMemberId(companyId, userId);

        assertThat(id1).isEqualTo(id2);
        assertThat(id1.hashCode()).isEqualTo(id2.hashCode());

        CompanyMember member = CompanyMember.builder()
                .companyId(companyId)
                .userId(userId)
                .build();

        member.onCreate();

        assertThat(member.getCompanyId()).isEqualTo(companyId);
        assertThat(member.getUserId()).isEqualTo(userId);
        assertThat(member.getRole()).isEqualTo("member");
        assertThat(member.getJoinedAt()).isNotNull();
    }
}
