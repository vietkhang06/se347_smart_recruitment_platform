package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.dto.*;
import com.matchajob.api.recruitment.exception.JobNotFoundException;
import com.matchajob.api.recruitment.model.Category;
import com.matchajob.api.recruitment.model.Job;
import com.matchajob.api.recruitment.model.JobSkill;
import com.matchajob.api.recruitment.model.Skill;
import com.matchajob.api.recruitment.model.enums.JobStatus;
import com.matchajob.api.recruitment.repository.CategoryRepository;
import com.matchajob.api.recruitment.repository.JobRepository;
import com.matchajob.api.recruitment.repository.JobSpecification;
import com.matchajob.api.recruitment.repository.SkillRepository;
import com.matchajob.security.ResourceOwnershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;
    private final ResourceOwnershipService resourceOwnershipService;

    @Transactional(readOnly = true)
    public PageResponse<JobSummaryResponse> searchJobs(JobSearchCriteria criteria) {
        // Public search mặc định chỉ lấy active jobs nếu không truyền status
        if (criteria.getStatus() == null || criteria.getStatus().isBlank()) {
            criteria.setStatus(JobStatus.ACTIVE.getValue());
        }

        Sort sort = resolveSort(criteria.getSortBy());
        int page = Math.max(0, criteria.getPage());
        int size = criteria.getSize() > 0 ? Math.min(criteria.getSize(), 50) : 10;
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<Job> spec = JobSpecification.build(criteria);
        Page<Job> jobPage = jobRepository.findAll(spec, pageable);

        return PageResponse.from(jobPage.map(JobSummaryResponse::from));
    }

    @Transactional(readOnly = true)
    public JobDetailResponse getJobDetail(UUID id) {
        Job job = jobRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new JobNotFoundException(id));
        return JobDetailResponse.from(job);
    }

    @Transactional(readOnly = true)
    public PageResponse<JobSummaryResponse> getEmployerJobs(UUID companyId, String status, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = size > 0 ? Math.min(size, 50) : 10;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Job> jobPage;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            jobPage = jobRepository.findByCompanyIdAndStatusAndDeletedAtIsNull(companyId, status.toLowerCase(), pageable);
        } else {
            jobPage = jobRepository.findByCompanyIdAndDeletedAtIsNull(companyId, pageable);
        }

        return PageResponse.from(jobPage.map(JobSummaryResponse::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<JobSummaryResponse> getEmployerJobs(UUID userId, UUID companyId, String status, int page, int size) {
        if (companyId != null) {
            resourceOwnershipService.checkEmployerCompanyOwnership(userId, companyId);
            return getEmployerJobs(companyId, status, page, size);
        }

        List<UUID> companyIds = resourceOwnershipService.getEmployerCompanyIds(userId);
        if (companyIds.isEmpty()) {
            return PageResponse.<JobSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .page(0)
                    .size(size > 0 ? Math.min(size, 50) : 10)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();
        }

        int safePage = Math.max(0, page);
        int safeSize = size > 0 ? Math.min(size, 50) : 10;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Job> jobPage;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            jobPage = jobRepository.findByCompanyIdInAndStatusAndDeletedAtIsNull(companyIds, status.toLowerCase(), pageable);
        } else {
            jobPage = jobRepository.findByCompanyIdInAndDeletedAtIsNull(companyIds, pageable);
        }

        return PageResponse.from(jobPage.map(JobSummaryResponse::from));
    }

    public void validateDeadlineForActiveJob(LocalDate deadline) {
        if (deadline == null) {
            throw new IllegalArgumentException("Hạn nộp hồ sơ không được để trống khi đăng tin tuyển dụng");
        }
        LocalDate minAllowed = LocalDate.now().plusDays(7);
        if (deadline.isBefore(minAllowed)) {
            throw new IllegalArgumentException(
                    "Hạn nộp hồ sơ (" + deadline + ") phải tối thiểu 7 ngày kể từ ngày đăng tin (từ ngày " + minAllowed + " trở đi)"
            );
        }
    }

    @Transactional
    public JobDetailResponse createJob(JobCreateRequest request) {
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId()).orElse(null);
        }
        if (category == null) {
            category = categoryRepository.findByDeletedAtIsNullOrderBySortOrderAscNameAsc().stream().findFirst().orElse(null);
        }

        String rawStatus = request.getStatus() != null && !request.getStatus().isBlank()
                ? request.getStatus().toLowerCase().trim()
                : JobStatus.DRAFT.getValue();

        String status;
        if ("active".equals(rawStatus) || "đang tuyển".equals(rawStatus)) {
            status = JobStatus.ACTIVE.getValue();
        } else if ("paused".equals(rawStatus) || "tạm dừng".equals(rawStatus)) {
            status = JobStatus.PAUSED.getValue();
        } else if ("closed".equals(rawStatus) || "đã đóng".equals(rawStatus)) {
            status = JobStatus.CLOSED.getValue();
        } else {
            status = JobStatus.DRAFT.getValue();
        }

        if (JobStatus.ACTIVE.getValue().equals(status)) {
            validateDeadlineForActiveJob(request.getDeadline());
        }

        UUID companyUuid = request.getCompanyId();
        if (companyUuid == null) {
            throw new IllegalArgumentException("Company ID is required to create a job");
        }

        String salaryMode = request.getSalaryMode() != null ? request.getSalaryMode().toLowerCase() : "negotiable";
        Long salaryMin = request.getSalaryMin();
        Long salaryMax = request.getSalaryMax();
        if ("range".equals(salaryMode)) {
            if (salaryMin == null && salaryMax == null) {
                salaryMode = "negotiable";
            } else if (salaryMin != null && salaryMax == null) {
                salaryMode = "single";
            }
        } else if ("from".equals(salaryMode) || "under".equals(salaryMode)) {
            salaryMode = "single";
        }

        Job job = Job.builder()
                .companyId(companyUuid)
                .category(category)
                .createdBy(request.getCreatedBy())
                .title(request.getTitle())
                .slug(generateUniqueSlug(request.getTitle()))
                .department(request.getDepartment())
                .level(request.getLevel() != null ? request.getLevel().toLowerCase() : null)
                .workType(request.getWorkType() != null ? request.getWorkType().toLowerCase() : "full_time")
                .location(request.getLocation())
                .address(request.getAddress())
                .mapLink(request.getMapLink())
                .salaryMode(salaryMode)
                .salaryMin(salaryMin)
                .salaryMax(salaryMax)
                .salaryCurrency(request.getSalaryCurrency() != null ? request.getSalaryCurrency() : "VND")
                .experience(request.getExperience())
                .description(request.getDescription())
                .requirements(request.getRequirements())
                .benefits(request.getBenefits())
                .schedule(request.getSchedule())
                .summaryIndustry(request.getSummaryIndustry())
                .summaryRequired(request.getSummaryRequired())
                .summaryPreferred(request.getSummaryPreferred())
                .status(status)
                .postedAt(JobStatus.ACTIVE.getValue().equalsIgnoreCase(status) ? Instant.now() : null)
                .deadline(request.getDeadline())
                .build();

        attachSkills(job, request.getSkills());

        Job savedJob = jobRepository.saveAndFlush(job);
        return JobDetailResponse.from(savedJob);
    }

    @Transactional
    public JobDetailResponse createJob(UUID userId, JobCreateRequest request) {
        UUID companyUuid = request.getCompanyId();
        if (companyUuid == null) {
            List<UUID> companyIds = resourceOwnershipService.getEmployerCompanyIds(userId);
            if (!companyIds.isEmpty()) {
                companyUuid = companyIds.get(0);
                request.setCompanyId(companyUuid);
            } else {
                throw new IllegalArgumentException("Tài khoản chưa được liên kết với công ty nào để đăng tin");
            }
        } else {
            resourceOwnershipService.checkEmployerCompanyOwnership(userId, companyUuid);
        }
        request.setCreatedBy(userId);
        return createJob(request);
    }

    @Transactional
    public JobDetailResponse updateJob(JobUpdateRequest request) {
        throw new UnsupportedOperationException("Job ID is required");
    }

    @Transactional
    public JobDetailResponse updateJob(UUID id, JobUpdateRequest request) {
        Job job = jobRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new JobNotFoundException(id));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId()).orElse(null);
            job.setCategory(category);
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            job.setTitle(request.getTitle());
        }
        if (request.getDepartment() != null) job.setDepartment(request.getDepartment());
        if (request.getLevel() != null) job.setLevel(request.getLevel().toLowerCase());
        if (request.getWorkType() != null) job.setWorkType(request.getWorkType().toLowerCase());
        if (request.getLocation() != null) job.setLocation(request.getLocation());
        if (request.getAddress() != null) job.setAddress(request.getAddress());
        if (request.getSalaryMode() != null) {
            String sm = request.getSalaryMode().toLowerCase();
            if ("from".equals(sm) || "under".equals(sm)) sm = "single";
            job.setSalaryMode(sm);
        }
        if (request.getSalaryMin() != null) job.setSalaryMin(request.getSalaryMin());
        if (request.getSalaryMax() != null) job.setSalaryMax(request.getSalaryMax());
        if ("range".equals(job.getSalaryMode()) && job.getSalaryMin() != null && job.getSalaryMax() == null) {
            job.setSalaryMode("single");
        } else if ("range".equals(job.getSalaryMode()) && job.getSalaryMin() == null && job.getSalaryMax() == null) {
            job.setSalaryMode("negotiable");
        }
        if (request.getSalaryCurrency() != null) job.setSalaryCurrency(request.getSalaryCurrency());
        if (request.getExperience() != null) job.setExperience(request.getExperience());
        if (request.getDescription() != null) job.setDescription(request.getDescription());
        if (request.getRequirements() != null) job.setRequirements(request.getRequirements());
        if (request.getBenefits() != null) job.setBenefits(request.getBenefits());
        if (request.getSchedule() != null) job.setSchedule(request.getSchedule());
        if (request.getSummaryIndustry() != null) job.setSummaryIndustry(request.getSummaryIndustry());
        if (request.getSummaryRequired() != null) job.setSummaryRequired(request.getSummaryRequired());
        if (request.getSummaryPreferred() != null) job.setSummaryPreferred(request.getSummaryPreferred());
        if (request.getDeadline() != null) {
            if (JobStatus.ACTIVE.getValue().equalsIgnoreCase(job.getStatus())) {
                validateDeadlineForActiveJob(request.getDeadline());
            }
            job.setDeadline(request.getDeadline());
        }

        job.setUpdatedAt(Instant.now());

        if (request.getSkills() != null) {
            job.getJobSkills().clear();
            attachSkills(job, request.getSkills());
        }

        return JobDetailResponse.from(jobRepository.saveAndFlush(job));
    }

    @Transactional
    public JobDetailResponse updateJob(UUID userId, UUID id, JobUpdateRequest request) {
        resourceOwnershipService.checkEmployerJobOwnership(userId, id);
        return updateJob(id, request);
    }

    @Transactional
    public JobDetailResponse updateJobStatus(UUID id, String newStatus) {
        Job job = jobRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new JobNotFoundException(id));

        String normalized = newStatus != null ? newStatus.toLowerCase().trim() : "";
        if ("đang tuyển".equals(normalized)) normalized = "active";
        else if ("bản nháp".equals(normalized)) normalized = "draft";
        else if ("tạm dừng".equals(normalized)) normalized = "paused";
        else if ("đã đóng".equals(normalized)) normalized = "closed";

        JobStatus statusEnum = JobStatus.fromValue(normalized);

        // Vòng đời tin đăng: Khi chuyển sang ACTIVE (đăng mới, mở lại, tiếp tục tuyển)
        if (statusEnum == JobStatus.ACTIVE) {
            validateDeadlineForActiveJob(job.getDeadline());
            if (job.getPostedAt() == null) {
                job.setPostedAt(Instant.now());
            }
        }

        job.setStatus(statusEnum.getValue());
        job.setUpdatedAt(Instant.now());

        return JobDetailResponse.from(jobRepository.saveAndFlush(job));
    }

    @Transactional
    public JobDetailResponse updateJobStatus(UUID userId, UUID id, String newStatus) {
        resourceOwnershipService.checkEmployerJobOwnership(userId, id);
        return updateJobStatus(id, newStatus);
    }

    @Transactional
    public void deleteJob(UUID id) {
        Job job = jobRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new JobNotFoundException(id));
        job.setDeletedAt(Instant.now());
        jobRepository.saveAndFlush(job);
    }

    @Transactional
    public void deleteJob(UUID userId, UUID id) {
        resourceOwnershipService.checkEmployerJobOwnership(userId, id);
        deleteJob(id);
    }

    private void attachSkills(Job job, List<JobCreateRequest.JobSkillItem> skillItems) {
        if (skillItems == null || skillItems.isEmpty()) return;

        for (JobCreateRequest.JobSkillItem item : skillItems) {
            Skill resolvedSkill = null;
            if (item.getSkillId() != null) {
                resolvedSkill = skillRepository.findById(item.getSkillId()).orElse(null);
            }
            if (resolvedSkill == null && item.getSkillName() != null && !item.getSkillName().isBlank()) {
                resolvedSkill = skillRepository.findByNameIgnoreCase(item.getSkillName().trim()).orElse(null);
            }
            if (resolvedSkill != null) {
                JobSkill jobSkill = new JobSkill(job, resolvedSkill, item.getIsRequired());
                job.getJobSkills().add(jobSkill);
            }
        }
    }

    private Sort resolveSort(String sortBy) {
        if (sortBy == null) return Sort.by(Sort.Direction.DESC, "postedAt");
        return switch (sortBy.toLowerCase()) {
            case "salary_desc" -> Sort.by(Sort.Direction.DESC, "salaryMax");
            case "title_asc" -> Sort.by(Sort.Direction.ASC, "title");
            case "new", "postedat_desc" -> Sort.by(Sort.Direction.DESC, "postedAt");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private String generateUniqueSlug(String title) {
        if (title == null || title.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String base = pattern.matcher(normalized).replaceAll("")
                .toLowerCase()
                .replaceAll("[đĐ]", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");

        String slug = base;
        int counter = 1;
        while (jobRepository.existsBySlug(slug)) {
            slug = base + "-" + counter++;
        }
        return slug;
    }
}
