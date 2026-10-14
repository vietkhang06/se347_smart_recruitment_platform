package com.matchajob.user.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(CompanyMemberId.class)
@Table(name = "company_members")
public class CompanyMember {

    @Id
    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Builder.Default
    @Column(name = "role", nullable = false, length = 20)
    private String role = "member";

    @Builder.Default
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (this.joinedAt == null) {
            this.joinedAt = Instant.now();
        }
        if (this.role == null) {
            this.role = "member";
        }
    }
}
