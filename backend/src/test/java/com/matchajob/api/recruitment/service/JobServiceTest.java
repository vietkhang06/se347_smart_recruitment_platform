package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.model.enums.JobStatus;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.api.recruitment.repository.SkillRepository;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobService Lifecycle & Deadline Validation Tests")
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private ResourceOwnershipService resourceOwnershipService;

    private JobService jobService;

    private UUID userId;
    private UUID companyId;
    private UUID jobId;

    @BeforeEach
    void setUp() {
        jobService = new JobService(
                jobRepository,
                categoryRepository,
                skillRepository,
                resourceOwnershipService
        );
        userId = UUID.randomUUID();
        companyId = UUID.randomUUID();
        jobId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Deadline validation: Rejects null deadline for active jobs")
    void testDeadlineNullThrowsException() {
        assertThatThrownBy(() -> jobService.validateDeadlineForActiveJob(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hạn nộp hồ sơ không được để trống");
    }

    @Test
    @DisplayName("Deadline validation: Rejects deadline less than 7 days from today")
    void testDeadlineLessThan7DaysThrowsException() {
        LocalDate tooSoon = LocalDate.now().plusDays(5);
        assertThatThrownBy(() -> jobService.validateDeadlineForActiveJob(tooSoon))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("phải tối thiểu 7 ngày kể từ ngày đăng tin");
    }

    @Test
    @DisplayName("Deadline validation: Accepts deadline >= 7 days")
    void testDeadlineValidPasses() {
        LocalDate validDeadline = LocalDate.now().plusDays(10);
        // Should not throw
        jobService.validateDeadlineForActiveJob(validDeadline);
    }

    @Test
    @DisplayName("createJob: Fails when creating ACTIVE job with deadline < 7 days")
    void testCreateActiveJobWithInvalidDeadline() {
        JobCreateRequest request = JobCreateRequest.builder()
                .companyId(companyId)
                .title("Software Engineer")
                .status("active")
                .deadline(LocalDate.now().plusDays(3))
                .build();

        assertThatThrownBy(() -> jobService.createJob(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("phải tối thiểu 7 ngày");
        verify(jobRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("createJob: Succeeds for DRAFT job even without deadline")
    void testCreateDraftJobWithoutDeadline() {
        JobCreateRequest request = JobCreateRequest.builder()
                .companyId(companyId)
                .title("Software Engineer")
                .status("draft")
                .deadline(null)
                .build();

        when(jobRepository.saveAndFlush(any(Job.class))).thenAnswer(inv -> {
            Job j = inv.getArgument(0);
            j.setId(jobId);
            return j;
        });

        JobDetailResponse res = jobService.createJob(request);
        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("draft");
        assertThat(res.getPostedAt()).isNull();
        verify(jobRepository).saveAndFlush(any());
    }

    @Test
    @DisplayName("updateJobStatus: Rejects moving DRAFT to ACTIVE if deadline is expired")
    void testPublishDraftWithExpiredDeadlineThrows() {
        Job existingDraft = Job.builder()
                .id(jobId)
                .companyId(companyId)
                .title("Frontend Dev")
                .status(JobStatus.DRAFT.getValue())
                .deadline(LocalDate.now().minusDays(1)) // Expired
                .jobSkills(new ArrayList<>())
                .build();

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(existingDraft));

        assertThatThrownBy(() -> jobService.updateJobStatus(jobId, "active"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("phải tối thiểu 7 ngày");
    }

    @Test
    @DisplayName("updateJobStatus: Transitions DRAFT -> ACTIVE and sets postedAt when deadline >= 7 days")
    void testPublishDraftToActiveSetsPostedAt() {
        Job existingDraft = Job.builder()
                .id(jobId)
                .companyId(companyId)
                .title("Frontend Dev")
                .status(JobStatus.DRAFT.getValue())
                .deadline(LocalDate.now().plusDays(15))
                .jobSkills(new ArrayList<>())
                .build();

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(existingDraft));
        when(jobRepository.saveAndFlush(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        JobDetailResponse res = jobService.updateJobStatus(jobId, "Đang tuyển");
        assertThat(res.getStatus()).isEqualTo(JobStatus.ACTIVE.getValue());
        assertThat(res.getPostedAt()).isNotNull();
        verify(jobRepository).saveAndFlush(existingDraft);
    }

    @Test
    @DisplayName("updateJobStatus: Full lifecycle ACTIVE -> PAUSED -> CLOSED -> ACTIVE")
    void testFullJobLifecycleTransitions() {
        Job job = Job.builder()
                .id(jobId)
                .companyId(companyId)
                .title("DevOps Engineer")
                .status(JobStatus.ACTIVE.getValue())
                .postedAt(Instant.now())
                .deadline(LocalDate.now().plusDays(20))
                .jobSkills(new ArrayList<>())
                .build();

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(job));
        when(jobRepository.saveAndFlush(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. ACTIVE -> PAUSED
        JobDetailResponse pausedRes = jobService.updateJobStatus(jobId, "Tạm dừng");
        assertThat(pausedRes.getStatus()).isEqualTo(JobStatus.PAUSED.getValue());

        // 2. PAUSED -> CLOSED
        JobDetailResponse closedRes = jobService.updateJobStatus(jobId, "Đã đóng");
        assertThat(closedRes.getStatus()).isEqualTo(JobStatus.CLOSED.getValue());

        // 3. CLOSED -> ACTIVE (Reopen)
        JobDetailResponse reopenedRes = jobService.updateJobStatus(jobId, "Đang tuyển");
        assertThat(reopenedRes.getStatus()).isEqualTo(JobStatus.ACTIVE.getValue());
    }

    @Test
    @DisplayName("deleteJob: Sets deletedAt on Job entity")
    void testDeleteJob() {
        Job job = Job.builder()
                .id(jobId)
                .companyId(companyId)
                .title("QA Engineer")
                .status(JobStatus.ACTIVE.getValue())
                .jobSkills(new ArrayList<>())
                .build();

        when(jobRepository.findByIdAndDeletedAtIsNull(jobId)).thenReturn(Optional.of(job));

        jobService.deleteJob(jobId);
        assertThat(job.getDeletedAt()).isNotNull();
        verify(jobRepository).saveAndFlush(job);
    }
}
