import { httpClient } from "../httpClient";
import { mockAdminService } from "../mock/mockAdminService";
import { formatDate } from "../../mappers/jobMapper";

function mapApiUser(u) {
  const roleCode = String(u?.role || "candidate").toLowerCase();
  const role =
    roleCode === "admin"
      ? "Quản trị viên"
      : roleCode === "employer"
        ? "Nhà tuyển dụng"
        : "Ứng viên";

  const statusCode = String(u?.status || "active").toLowerCase();
  const status =
    statusCode === "active"
      ? "Hoạt động"
      : statusCode === "suspended"
        ? "Tạm khóa"
        : statusCode === "pending_verification"
          ? "Chờ xác minh"
          : u?.status || "Hoạt động";

  const fullName = u?.full_name || u?.fullName || u?.name || "Người dùng";

  return {
    ...u,
    id: String(u?.id || ""),
    name: fullName,
    fullName,
    roleCode,
    role,
    statusCode,
    status,
    isVerified: Boolean(u?.is_verified ?? u?.isVerified),
    joined: formatDate(u?.created_at || u?.createdAt || u?.joined) || "Mới gia nhập",
    avatar: u?.avatar || fullName.slice(0, 2).toUpperCase()
  };
}

function mapApiCategory(cat, jobCountByCategory = {}) {
  const statusCode = String(cat?.status || "visible").toLowerCase();
  const status = statusCode === "visible" || statusCode === "active" ? "Hiển thị" : "Ẩn";
  const name = cat?.name || "";
  const rawJobs = cat?.jobs ?? cat?.jobCount ?? jobCountByCategory[name] ?? 0;

  return {
    ...cat,
    id: String(cat?.id || ""),
    name,
    icon: cat?.icon || "bi-folder",
    statusCode,
    status,
    jobs: Number(rawJobs) || 0,
    skills: Number(cat?.skills ?? cat?.skillCount ?? 0)
  };
}

/**
 * apiAdminService
 * Adapter gọi các API quản trị thực tế từ Spring Boot Backend:
 * - GET /v1/admin/users
 * - PATCH /v1/admin/users/{id}/status
 * - GET /v1/admin/stats/jobs
 * - GET /v1/categories & POST/DELETE /api/v1/recruitment/taxonomies/categories
 */
export const apiAdminService = {
  async getCategories(jobCountByCategory = {}) {
    try {
      let response;
      try {
        response = await httpClient.get("/api/api/v1/recruitment/taxonomies/categories");
      } catch (err) {
        if (err.status === 404) {
          response = await httpClient.get("/v1/categories");
        } else {
          throw err;
        }
      }
      const list = Array.isArray(response) ? response : response?.content || [];
      return list.map((c) => mapApiCategory(c, jobCountByCategory));
    } catch (err) {
      if (err.status === 401 || err.status === 403) throw err;
      return mockAdminService.getCategories();
    }
  },

  async createCategory({ name, icon = "bi-folder", status = "Hiển thị", sortOrder = 0 }) {
    const statusCode = status === "Hiển thị" || status === "visible" ? "visible" : "hidden";
    const payload = {
      name: String(name || "").trim(),
      icon: icon || "bi-folder",
      status: statusCode,
      sortOrder: Number(sortOrder) || 0
    };
    const created = await httpClient.post("/api/api/v1/recruitment/taxonomies/categories", payload);
    return mapApiCategory(created);
  },

  async deleteCategory(categoryId) {
    await httpClient.delete(`/api/api/v1/recruitment/taxonomies/categories/${encodeURIComponent(categoryId)}`);
    return true;
  },

  async getJobStats() {
    return await httpClient.get("/v1/admin/stats/jobs");
  },

  async getUsersPage(params = {}) {
    const query = {
      page: params.page ?? 0,
      size: params.size ?? 100
    };
    if (params.role && params.role !== "all") query.role = params.role;
    if (params.status && params.status !== "all") query.status = params.status;
    if (params.keyword?.trim()) query.keyword = params.keyword.trim();

    const response = await httpClient.get("/v1/admin/users", { params: query });
    const content = Array.isArray(response?.content) ? response.content : Array.isArray(response) ? response : [];
    return {
      items: content.map(mapApiUser),
      page: Number(response?.page ?? 0),
      size: Number(response?.size ?? content.length),
      totalElements: Number(response?.total_elements ?? response?.totalElements ?? content.length),
      totalPages: Number(response?.total_pages ?? response?.totalPages ?? 1)
    };
  },

  async getUsers(params = {}) {
    const pageData = await this.getUsersPage(params);
    return pageData.items;
  },

  async updateUserStatus(userId, nextStatus, reason = "") {
    const statusCode =
      nextStatus === "Tạm khóa" || String(nextStatus).toLowerCase() === "suspended"
        ? "suspended"
        : "active";
    const payload = { status: statusCode };
    if (reason && reason.trim()) payload.reason = reason.trim();

    const updated = await httpClient.patch(`/v1/admin/users/${encodeURIComponent(userId)}/status`, payload);
    return mapApiUser(updated);
  },

  async getReviews() {
    return mockAdminService.getReviews();
  },

  async approveReview(reviewId, notes = "") {
    return mockAdminService.approveReview(reviewId, notes);
  },

  async rejectReview(reviewId, reason = "") {
    return mockAdminService.rejectReview(reviewId, reason);
  },

  async getReports() {
    return mockAdminService.getReports();
  },

  async resolveReport(reportId, actionTaken, resolution = "") {
    return mockAdminService.resolveReport(reportId, actionTaken, resolution);
  },

  async getAuditLogs() {
    return mockAdminService.getAuditLogs();
  }
};
