import { httpClient } from "../httpClient";
import { mockAdminService } from "../mock/mockAdminService";

/**
 * apiAdminService
 * Adapter gọi các API quản trị của Admin.
 * Lưu ý: Backend hiện chỉ có CategoryController (GET /v1/categories).
 * Các controller quản trị khác (Moderation, Users, Reports, Logs) chưa được Backend hiện thực.
 * Adapter này gọi API khi có và fallback an toàn sang Mock.
 */
export const apiAdminService = {
  async getCategories() {
    try {
      const response = await httpClient.get("/v1/categories");
      return Array.isArray(response) ? response : response?.content || [];
    } catch {
      return mockAdminService.getCategories();
    }
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

  async getUsers() {
    return mockAdminService.getUsers();
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
