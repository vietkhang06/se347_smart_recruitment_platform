package com.matchajob.admin.service;

import com.matchajob.admin.dto.AdminUserSummaryResponse;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.admin.exception.AdminOperationNotAllowedException;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AdminAuditService adminAuditService;

    @InjectMocks
    private AdminUserService adminUserService;

    private User user(UUID id, String role, String status, Boolean verified) {
        return User.builder()
                .id(id)
                .email(id + "@example.com")
                .fullName("Test " + role)
                .role(role)
                .status(status)
                .isVerified(verified)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("suspend: writes status and audit entry")
    void suspend_writesAudit() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        User target = user(targetId, "candidate", "active", true);

        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUserSummaryResponse result = adminUserService.updateStatus(
                adminId, targetId, new UpdateUserStatusRequest("suspended", "spam"));

        assertThat(result.getStatus()).isEqualTo("suspended");
        verify(adminAuditService).recordUserStatusChange(
                adminId, targetId, "SUSPEND_USER", "active", "suspended", "spam");
    }

    @Test
    @DisplayName("self-suspension is rejected before saving or auditing")
    void suspend_self_rejected() {
        UUID adminId = UUID.randomUUID();
        when(userRepository.findById(adminId))
                .thenReturn(Optional.of(user(adminId, "admin", "active", true)));

        assertThatThrownBy(() -> adminUserService.updateStatus(
                adminId, adminId, new UpdateUserStatusRequest("suspended", null)))
                .isInstanceOf(AdminOperationNotAllowedException.class)
                .hasMessageContaining("your own");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(adminAuditService);
    }

    @Test
    @DisplayName("the last active admin cannot be suspended")
    void suspend_lastAdmin_rejected() {
        UUID actorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId))
                .thenReturn(Optional.of(user(targetId, "admin", "active", true)));
        when(userRepository.countByRoleAndStatusAndDeletedAtIsNull("admin", "active")).thenReturn(1L);

        assertThatThrownBy(() -> adminUserService.updateStatus(
                actorId, targetId, new UpdateUserStatusRequest("suspended", null)))
                .isInstanceOf(AdminOperationNotAllowedException.class)
                .hasMessageContaining("At least one active admin");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("activating a pending_verification user also marks it verified")
    void activate_pendingVerification_setsVerified() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        User target = user(targetId, "candidate", "pending_verification", false);

        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUserSummaryResponse result = adminUserService.updateStatus(
                adminId, targetId, new UpdateUserStatusRequest("active", null));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("active");
        assertThat(captor.getValue().getIsVerified()).isTrue();
        assertThat(result.getIsVerified()).isTrue();
    }

    @Test
    @DisplayName("no-op when the target already has the requested status")
    void updateStatus_idempotent() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId))
                .thenReturn(Optional.of(user(targetId, "candidate", "suspended", true)));

        AdminUserSummaryResponse result = adminUserService.updateStatus(
                adminId, targetId, new UpdateUserStatusRequest("suspended", null));

        assertThat(result.getStatus()).isEqualTo("suspended");
        verify(userRepository, never()).save(any());
        verifyNoInteractions(adminAuditService);
    }

    @Test
    @DisplayName("a soft-deleted target is a 404")
    void updateStatus_deletedTarget_notFound() {
        UUID targetId = UUID.randomUUID();
        User target = user(targetId, "candidate", "active", true);
        target.setDeletedAt(Instant.now());
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> adminUserService.updateStatus(
                UUID.randomUUID(), targetId, new UpdateUserStatusRequest("suspended", null)))
                .isInstanceOf(UserNotFoundException.class);
    }
}
