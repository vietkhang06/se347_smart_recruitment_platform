import { mockStore } from "../mockStore";
import { ADMIN_SKILLS_FIXTURE } from "../../fixtures/admin.fixture";
import { toJobViewModel } from "../../mappers/jobMapper";

function resolveCompanyId(requestedId) {
  const currentId = mockStore.getHRCompanyId();

  if (
    requestedId != null &&
    String(requestedId) !== String(currentId)
  ) {
    throw new Error(
      "Bạn không có quyền quản lý doanh nghiệp này."
    );
  }

  return currentId;
}

function getOwnedJob(jobId) {
  const companyId = resolveCompanyId();
  const job = mockStore.getJobById(jobId);

  if (
    !job ||
    String(job.companyId) !== String(companyId)
  ) {
    throw new Error(
      "Tin không tồn tại hoặc không thuộc doanh nghiệp của bạn."
    );
  }

  return job;
}

function normalizeStatus(status) {
  const labels = {
    active: "Đang tuyển",
    paused: "Tạm dừng",
    pending: "Chờ duyệt",
    closed: "Đã đóng",
    draft: "Bản nháp"
  };

  return labels[status] || status;
}

export const mockJobService = {
  async getEmployerJobs(companyId, filters = {}) {
    const ownerId = resolveCompanyId(companyId);

    let jobs = mockStore
      .getJobs()
      .filter(
        (job) => String(job.companyId) === String(ownerId)
      )
      .map(toJobViewModel);

    if (
      filters.status &&
      !["all", "Tất cả"].includes(filters.status)
    ) {
      const status = String(filters.status).toLowerCase();

      jobs = jobs.filter(
        (job) =>
          job.statusCode === status ||
          job.status.toLowerCase() === status
      );
    }

    const keyword = String(filters.keyword || "")
      .trim()
      .toLowerCase();

    if (keyword) {
      jobs = jobs.filter((job) =>
        [job.title, job.department, ...job.skills].some(
          (value) =>
            String(value).toLowerCase().includes(keyword)
        )
      );
    }

    return jobs;
  },

  async getJobById(jobId) {
    const job = mockStore.getJobById(jobId);
    return job ? toJobViewModel(job) : null;
  },

  async createJob(jobInput, companyId) {
    const ownerId = resolveCompanyId(companyId);

    const created = mockStore.saveJob({
      ...jobInput,
      id: `JOB-${crypto.randomUUID()}`,
      companyId: ownerId
    });

    if (!mockStore.getJobById(created.id)) {
      throw new Error(
        "Không lưu được tin tuyển dụng. Vui lòng thử lại."
      );
    }

    return toJobViewModel(created);
  },

  async updateJob(jobId, jobUpdate) {
    const job = getOwnedJob(jobId);

    const updates = {
      ...jobUpdate,
      id: job.id,
      companyId: job.companyId
    };

    if (updates.status !== undefined) {
      updates.status = normalizeStatus(updates.status);
      const currentNorm = normalizeStatus(job.status);
      const nextNorm = updates.status;

      // Kiểm tra quy tắc chuyển trạng thái hợp lệ
      const validTransitions = {
        "Bản nháp": ["Đang tuyển", "Đã đóng", "Bản nháp"],
        "Đang tuyển": ["Tạm dừng", "Đã đóng", "Đang tuyển"],
        "Tạm dừng": ["Đang tuyển", "Đã đóng", "Tạm dừng"],
        "Đã đóng": ["Đang tuyển", "Đã đóng"],
        "Chờ duyệt": ["Đang tuyển", "Đã đóng", "Chờ duyệt"]
      };

      const allowed = validTransitions[currentNorm] || ["Đang tuyển", "Tạm dừng", "Đã đóng", "Bản nháp"];
      if (!allowed.includes(nextNorm)) {
        throw new Error(
          `Không thể chuyển trạng thái từ "${currentNorm}" sang "${nextNorm}".`
        );
      }
    }

    mockStore.updateJob(job.id, updates);

    const saved = mockStore.getJobById(job.id);

    const persisted =
      saved &&
      Object.entries(updates).every(
        ([key, value]) =>
          value === undefined ||
          JSON.stringify(saved[key]) === JSON.stringify(value)
      );

    if (!persisted) {
      throw new Error(
        "Không lưu được thay đổi tin tuyển dụng."
      );
    }

    return toJobViewModel(saved);
  },

  async updateJobStatus(jobId, status) {
    return mockJobService.updateJob(jobId, { status });
  },

  async deleteJob(jobId) {
    const job = getOwnedJob(jobId);

    mockStore.deleteJob(job.id);

    if (mockStore.getJobById(job.id)) {
      throw new Error(
        "Không xóa được tin tuyển dụng. Vui lòng thử lại."
      );
    }

    return true;
  },

  async getCategories() {
    return mockStore.getCategories();
  },

  async getSkills(categoryId = null) {
    if (!categoryId) return ADMIN_SKILLS_FIXTURE;

    return ADMIN_SKILLS_FIXTURE.filter(
      (skill) =>
        !skill.categoryId ||
        String(skill.categoryId) === String(categoryId)
    );
  },

  getJobDraft() {
    return mockStore.getJobDraft();
  },

  saveJobDraft(draft) {
    return Boolean(mockStore.saveJobDraft(draft));
  },

  clearJobDraft() {
    mockStore.clearJobDraft();
    return mockStore.getJobDraft() === null;
  }
};