package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @InjectMocks
    private JobService jobService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testStateTransition_PendingToActive_Success() {
        Job job = new Job();
        job.setId(1L);
        job.setStatus("PENDING");
        job.setEmployerId(100L);

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        Job updated = jobService.updateJobStatus(1L, "ACTIVE", 100L, false);
        assertEquals("ACTIVE", updated.getStatus());
    }

    @Test
    void testStateTransition_ClosedIsTerminal_ThrowsException() {
        Job job = new Job();
        job.setId(1L);
        job.setStatus("CLOSED");
        job.setEmployerId(100L);

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

        assertThrows(IllegalStateException.class, () -> {
            jobService.updateJobStatus(1L, "ACTIVE", 100L, false);
        });
    }

    @Test
    void testOwnership_IdorProtection_ThrowsSecurityException() {
        Job job = new Job();
        job.setId(1L);
        job.setStatus("ACTIVE");
        job.setEmployerId(100L); // Owned by employer 100

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

        // Employer 200 tries to modify job owned by 100
        assertThrows(SecurityException.class, () -> {
            jobService.updateJobStatus(1L, "PAUSED", 200L, false);
        });
    }

    @Test
    void testAdminOverrideOwnership_Success() {
        Job job = new Job();
        job.setId(1L);
        job.setStatus("ACTIVE");
        job.setEmployerId(100L); // Owned by employer 100

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        // Admin (isAdmin = true) can modify regardless of employerId
        Job updated = jobService.updateJobStatus(1L, "CLOSED", 999L, true);
        assertEquals("CLOSED", updated.getStatus());
    }
}
