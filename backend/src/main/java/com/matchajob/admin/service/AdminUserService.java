package com.matchajob.admin.service;

import com.matchajob.admin.dto.AdminUserListResponse;
import com.matchajob.admin.dto.AdminUserSummaryResponse;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.admin.exception.AdminOperationNotAllowedException;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    static final String STATUS_ACTIVE = "active";
    static final String STATUS_SUSPENDED = "suspended";
    private static final String ROLE_ADMIN = "admin";
    private static final int MAX_PAGE_SIZE = 100;
    private static final long ADMIN_STATUS_LOCK_KEY = 742189312L;

    private final UserRepository userRepository;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public AdminUserListResponse listUsers(int page, int size, String role, String status, String keyword) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        Page<User> result = userRepository.findAll(
                buildSpecification(role, status, keyword),
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<AdminUserSummaryResponse> content = result.getContent().stream()
                .map(AdminUserSummaryResponse::fromEntity)
                .toList();

        return AdminUserListResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    /**
     * Suspends or reactivates an account.
     *
     * <p>Safety rules:</p>
     * <ul>
     *   <li>an admin can never suspend their own account;</li>
     *   <li>the last active admin can never be suspended;</li>
     *   <li>reactivating a {@code pending_verification} account also marks it verified,
     *       otherwise {@code JwtAuthenticationFilter} would keep rejecting its tokens when
     *       {@code app.auth.require-email-verification=true};</li>
     *   <li>every state change is written to {@code audit_logs}.</li>
     * </ul>
     */
    @Transactional(rollbackFor = Exception.class)
    public AdminUserSummaryResponse updateStatus(UUID adminId, UUID targetUserId, UpdateUserStatusRequest request) {
        if (adminId == null) {
            throw new UserNotFoundException("Admin user ID cannot be null");
        }
        if (targetUserId == null) {
            throw new UserNotFoundException("Target user ID cannot be null");
        }

        String newStatus = request.getStatus().toLowerCase(Locale.ROOT);

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + targetUserId));

        if (target.getDeletedAt() != null) {
            throw new UserNotFoundException("User has been deleted: " + targetUserId);
        }

        String previousStatus = target.getStatus();

        if (newStatus.equals(previousStatus)) {
            log.debug("Status for user {} is already {}; no change recorded", targetUserId, newStatus);
            return AdminUserSummaryResponse.fromEntity(target);
        }

        if (STATUS_SUSPENDED.equals(newStatus)) {
            guardAgainstSelfSuspension(adminId, targetUserId);
            guardAgainstLastActiveAdmin(target);
        }

        target.setStatus(newStatus);

        if (STATUS_ACTIVE.equals(newStatus) && Boolean.FALSE.equals(target.getIsVerified())) {
            target.setIsVerified(true);
        }

        User saved = userRepository.save(target);

        String action = STATUS_SUSPENDED.equals(newStatus) ? "SUSPEND_USER" : "ACTIVATE_USER";
        adminAuditService.recordUserStatusChange(
                adminId, targetUserId, action, previousStatus, newStatus, request.getReason());

        log.info("Admin {} changed status of user {}: {} -> {}", adminId, targetUserId, previousStatus, newStatus);
        return AdminUserSummaryResponse.fromEntity(saved);
    }

    private void guardAgainstSelfSuspension(UUID adminId, UUID targetUserId) {
        if (adminId.equals(targetUserId)) {
            throw new AdminOperationNotAllowedException(
                    "SELF_SUSPEND_NOT_ALLOWED",
                    "You cannot suspend your own admin account");
        }
    }

    private void guardAgainstLastActiveAdmin(User target) {
        if (!ROLE_ADMIN.equalsIgnoreCase(target.getRole())) {
            return;
        }
        userRepository.acquireAdvisoryXactLock(ADMIN_STATUS_LOCK_KEY);
        long activeAdmins = userRepository.countByRoleAndStatusAndDeletedAtIsNull(ROLE_ADMIN, STATUS_ACTIVE);
        if (activeAdmins <= 1) {
            throw new AdminOperationNotAllowedException(
                    "LAST_ADMIN_PROTECTED",
                    "At least one active admin account must remain");
        }
    }

    private Specification<User> buildSpecification(String role, String status, String keyword) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (StringUtils.hasText(role)) {
                predicates.add(cb.equal(cb.lower(root.get("role")), role.trim().toLowerCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("fullName")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
