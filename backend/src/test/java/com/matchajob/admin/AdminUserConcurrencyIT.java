package com.matchajob.admin;

import com.matchajob.MatchaJobApplication;
import com.matchajob.admin.dto.UpdateUserStatusRequest;
import com.matchajob.admin.exception.AdminOperationNotAllowedException;
import com.matchajob.admin.service.AdminUserService;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@DisplayName("Admin user status update concurrency test")
public class AdminUserConcurrencyIT {

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID adminAId;
    private UUID adminBId;

    @BeforeEach
    void setUp() {
        cleanUpAdmins();

        adminAId = UUID.randomUUID();
        adminBId = UUID.randomUUID();

        jdbcClient.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified)
                VALUES (?, ?, 'mock-hash', 'Admin Concurrency A', 'admin', 'active', true)
                """).params(adminAId, "admin.concurrency.a." + adminAId + "@example.com").update();

        jdbcClient.sql("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified)
                VALUES (?, ?, 'mock-hash', 'Admin Concurrency B', 'admin', 'active', true)
                """).params(adminBId, "admin.concurrency.b." + adminBId + "@example.com").update();
    }

    @AfterEach
    void tearDown() {
        cleanUpAdmins();
    }

    private void cleanUpAdmins() {
        jdbcClient.sql("""
                DELETE FROM audit_logs
                WHERE actor_id IN (
                    SELECT id FROM users WHERE email LIKE 'admin.concurrency.%'
                ) OR target_id IN (
                    SELECT id::text FROM users WHERE email LIKE 'admin.concurrency.%'
                )
                """).update();
        jdbcClient.sql("DELETE FROM users WHERE email LIKE 'admin.concurrency.%'").update();
    }

    @RepeatedTest(10)
    @DisplayName("Concurrent suspension of the last two admins must protect at least one admin")
    void concurrentSuspension_mustNotAllowBothRemainingAdminsToBeSuspended() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger protectedCount = new AtomicInteger(0);
        AtomicInteger otherErrors = new AtomicInteger(0);

        UpdateUserStatusRequest suspendRequest = UpdateUserStatusRequest.builder()
                .status("suspended")
                .reason("Concurrent suspension test")
                .build();

        // Thread 1: Admin B suspends Admin A
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                adminUserService.updateStatus(adminBId, adminAId, suspendRequest);
                successCount.incrementAndGet();
            } catch (AdminOperationNotAllowedException ex) {
                if ("LAST_ADMIN_PROTECTED".equals(ex.getErrorCode())) {
                    protectedCount.incrementAndGet();
                } else {
                    System.err.println("Thread 1 AdminOperationNotAllowedException code: " + ex.getErrorCode());
                    otherErrors.incrementAndGet();
                }
            } catch (Exception ex) {
                System.err.println("Thread 1 Exception: " + ex.getClass().getName() + " - " + ex.getMessage());
                otherErrors.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 2: Admin A suspends Admin B
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                adminUserService.updateStatus(adminAId, adminBId, suspendRequest);
                successCount.incrementAndGet();
            } catch (AdminOperationNotAllowedException ex) {
                if ("LAST_ADMIN_PROTECTED".equals(ex.getErrorCode())) {
                    protectedCount.incrementAndGet();
                } else {
                    System.err.println("Thread 2 AdminOperationNotAllowedException code: " + ex.getErrorCode());
                    otherErrors.incrementAndGet();
                }
            } catch (Exception ex) {
                System.err.println("Thread 2 Exception: " + ex.getClass().getName() + " - " + ex.getMessage());
                otherErrors.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        boolean ready = readyLatch.await(5, TimeUnit.SECONDS);
        assertThat(ready).isTrue();

        startLatch.countDown();

        boolean done = doneLatch.await(10, TimeUnit.SECONDS);
        assertThat(done).isTrue();

        executor.shutdown();

        long remainingActive = userRepository.countByRoleAndStatusAndDeletedAtIsNull("admin", "active");
        System.out.println("TEST RUN SUMMARY: success=" + successCount.get() + ", protected=" + protectedCount.get() + ", otherErrors=" + otherErrors.get() + ", remainingActive=" + remainingActive);

        assertThat(otherErrors.get()).isZero();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(protectedCount.get()).isEqualTo(1);
        assertThat(remainingActive).isEqualTo(1L);
    }
}
