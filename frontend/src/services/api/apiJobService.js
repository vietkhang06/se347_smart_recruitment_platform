import { httpClient } from "../httpClient";
import { toJobViewModel, toJobCreateRequest, toJobUpdateRequest } from "../../mappers/jobMapper";
import { mockJobService } from "../mock/mockJobService";

/**
 * Helper gọi endpoint linh hoạt xử lý tiền tố /v1 hoặc /api/v1 của Backend
 */
async function getWithPrefixFallback(path, queryParams = "") {
  const queryStr = queryParams ? `?${queryParams}` : "";
  try {
    return await httpClient.get(`/v1${path}${queryStr}`);
  } catch (err) {
    if (err.status === 404) {
      return await httpClient.get(`/api/v1${path}${queryStr}`);
    }
    throw err;
  }
}

export const apiJobService = {
  async getEmployerJobs(companyId = "COMP-01", filters = {}) {
    const params = new URLSearchParams();
    if (companyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      params.append("companyId", companyId);
    }
    if (filters.status && filters.status !== "all" && filters.status !== "Tất cả") {
      let st = filters.status.toLowerCase().trim();
      if (st === "đang tuyển") st = "active";
      else if (st === "bản nháp") st = "draft";
      else if (st === "tạm dừng") st = "paused";
      else if (st === "đã đóng") st = "closed";
      else if (st === "chờ duyệt") st = "pending";
      params.append("status", st);
    }
    params.append("page", String(filters.page || 0));
    params.append("size", String(filters.size || 50));

    try {
      const response = await getWithPrefixFallback("/employer/jobs", params.toString());
      const content = response?.content || (Array.isArray(response) ? response : []);
      let jobs = content.map(toJobViewModel);

      // Lọc từ khóa phía client nếu backend chưa hỗ trợ param keyword
      if (filters.keyword && filters.keyword.trim()) {
        const kw = filters.keyword.toLowerCase().trim();
        jobs = jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(kw) ||
            j.department.toLowerCase().includes(kw) ||
            j.skills.some((s) => s.toLowerCase().includes(kw))
        );
      }
      return jobs;
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("[apiJobService] Lỗi gọi API /employer/jobs, fallback sang mock:", err.message);
      return mockJobService.getEmployerJobs(companyId, filters);
    }
  },

  async getJobById(jobId) {
    try {
      const response = await getWithPrefixFallback(`/jobs/${jobId}`);
      return toJobViewModel(response);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403) throw err;
      console.warn(`[apiJobService] Lỗi lấy chi tiết job ${jobId}, fallback sang mock:`, err.message);
      return mockJobService.getJobById(jobId);
    }
  },

  async createJob(jobInput, companyId = "COMP-01") {
    const payload = toJobCreateRequest(jobInput, companyId);
    try {
      let created;
      try {
        created = await httpClient.post("/v1/employer/jobs", payload);
      } catch (err) {
        if (err.status === 404) {
          created = await httpClient.post("/api/v1/employer/jobs", payload);
        } else {
          throw err;
        }
      }
      return toJobViewModel(created);
    } catch (err) {
      // Nếu là lỗi nghiệp vụ từ backend (400, 403, validation) thì ném ra cho UI xử lý
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 422) {
        throw err;
      }
      console.warn("[apiJobService] Lỗi kết nối tạo job qua API, fallback sang mock:", err.message);
      return mockJobService.createJob(jobInput, companyId);
    }
  },

  async updateJob(jobId, jobUpdate) {
    const payload = toJobUpdateRequest(jobUpdate);
    try {
      let updated;
      try {
        updated = await httpClient.put(`/v1/employer/jobs/${jobId}`, payload);
      } catch (err) {
        if (err.status === 404) {
          updated = await httpClient.put(`/api/v1/employer/jobs/${jobId}`, payload);
        } else {
          throw err;
        }
      }
      return toJobViewModel(updated);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 422) {
        throw err;
      }
      console.warn(`[apiJobService] Lỗi cập nhật job ${jobId}, fallback sang mock:`, err.message);
      return mockJobService.updateJob(jobId, jobUpdate);
    }
  },

  async updateJobStatus(jobId, status) {
    let statusCode = status.toLowerCase().trim();
    if (statusCode === "đang tuyển") statusCode = "active";
    else if (statusCode === "chờ duyệt") statusCode = "pending";
    else if (statusCode === "tạm dừng") statusCode = "paused";
    else if (statusCode === "đã đóng") statusCode = "closed";
    else if (statusCode === "bản nháp") statusCode = "draft";

    try {
      let updated;
      const payload = { status: statusCode };
      try {
        updated = await httpClient.patch(`/v1/employer/jobs/${jobId}/status`, payload);
      } catch (err) {
        if (err.status === 404) {
          updated = await httpClient.patch(`/api/v1/employer/jobs/${jobId}/status`, payload);
        } else {
          throw err;
        }
      }
      return toJobViewModel(updated);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 422) {
        throw err;
      }
      console.warn(`[apiJobService] Lỗi đổi status job ${jobId}, fallback sang mock:`, err.message);
      return mockJobService.updateJobStatus(jobId, status);
    }
  },

  async deleteJob(jobId) {
    try {
      try {
        await httpClient.delete(`/v1/employer/jobs/${jobId}`);
      } catch (err) {
        if (err.status === 404) {
          await httpClient.delete(`/api/v1/employer/jobs/${jobId}`);
        } else {
          throw err;
        }
      }
      return true;
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
      console.warn(`[apiJobService] Lỗi xóa job ${jobId}, fallback sang mock:`, err.message);
      return mockJobService.deleteJob(jobId);
    }
  },

  async getCategories() {
    try {
      return await getWithPrefixFallback("/categories");
    } catch (err) {
      console.warn("[apiJobService] Lỗi lấy danh mục, fallback sang mock:", err.message);
      return mockJobService.getCategories();
    }
  },

  async getSkills(categoryId = null) {
    try {
      const q = categoryId ? `categoryId=${categoryId}` : "";
      return await getWithPrefixFallback("/skills", q);
    } catch (err) {
      console.warn("[apiJobService] Lỗi lấy kỹ năng, fallback sang mock:", err.message);
      return mockJobService.getSkills(categoryId);
    }
  },

  getJobDraft: () => mockJobService.getJobDraft(),
  saveJobDraft: (draft) => mockJobService.saveJobDraft(draft),
  clearJobDraft: () => mockJobService.clearJobDraft()
};
