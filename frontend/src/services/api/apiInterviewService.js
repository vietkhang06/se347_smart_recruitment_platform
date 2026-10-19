import { httpClient } from "../httpClient";
import {
  toInterviewViewModel,
  toInterviewCreateRequest,
  toInterviewUpdateRequest,
  INTERVIEW_LABEL_TO_CODE
} from "../../mappers/interviewMapper";
import { mockInterviewService } from "../mock/mockInterviewService";

/**
 * apiInterviewService
 * Giao tiếp trực tiếp với Spring Boot Backend /v1/interviews khi VITE_DATA_SOURCE=api.
 * Tự động fallback an toàn sang mockInterviewService nếu xảy ra lỗi kết nối.
 */
export const apiInterviewService = {
  /**
   * Lấy danh sách lịch phỏng vấn theo companyId và bộ lọc
   */
  async getInterviews(companyId = "COMP-01", filters = {}) {
    const params = new URLSearchParams();
    if (companyId) params.append("companyId", companyId);
    if (filters.status && filters.status !== "all" && filters.status !== "Tất cả") {
      params.append("status", filters.status);
    }

    try {
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const response = await httpClient.get(`/v1/interviews${queryStr}`);
      const list = Array.isArray(response) ? response : (response?.content || []);
      return list.map(toInterviewViewModel);
    } catch (err) {
      console.warn("[apiInterviewService] Lỗi gọi GET /v1/interviews, fallback sang mock:", err.message);
      return mockInterviewService.getInterviews(companyId, filters);
    }
  },

  /**
   * Lấy chi tiết lịch phỏng vấn theo ID
   */
  async getInterviewById(id) {
    try {
      const response = await httpClient.get(`/v1/interviews/${id}`);
      return toInterviewViewModel(response);
    } catch (err) {
      console.warn(`[apiInterviewService] Lỗi lấy lịch ${id}, fallback sang mock:`, err.message);
      return mockInterviewService.getInterviewById(id);
    }
  },

  /**
   * Tạo mới lịch phỏng vấn
   */
  async createInterview(form) {
    const payload = toInterviewCreateRequest(form);
    try {
      const created = await httpClient.post("/v1/interviews", payload);
      return toInterviewViewModel(created);
    } catch (err) {
      console.warn("[apiInterviewService] Lỗi tạo lịch phỏng vấn, fallback sang mock:", err.message);
      return mockInterviewService.createInterview(form);
    }
  },

  /**
   * Cập nhật / Điều chỉnh thời gian lịch phỏng vấn
   */
  async updateInterview(id, form) {
    const payload = toInterviewUpdateRequest(form);
    try {
      const updated = await httpClient.put(`/v1/interviews/${id}`, payload);
      return toInterviewViewModel(updated);
    } catch (err) {
      console.warn(`[apiInterviewService] Lỗi cập nhật lịch ${id}, fallback sang mock:`, err.message);
      return mockInterviewService.updateInterview(id, form);
    }
  },

  /**
   * Cập nhật trạng thái lịch (Xác nhận, Hoàn tất, Hủy)
   */
  async updateInterviewStatus(id, newStatus, reason = "") {
    const statusCode = INTERVIEW_LABEL_TO_CODE[newStatus] || newStatus;
    const payload = {
      status: statusCode,
      reason: reason || undefined
    };

    try {
      const updated = await httpClient.patch(`/v1/interviews/${id}/status`, payload);
      return toInterviewViewModel(updated);
    } catch (err) {
      console.warn(`[apiInterviewService] Lỗi cập nhật trạng thái lịch ${id}, fallback sang mock:`, err.message);
      return mockInterviewService.updateInterviewStatus(id, newStatus, reason);
    }
  },

  /**
   * Hủy lịch phỏng vấn
   */
  async cancelInterview(id, reason = "Nhà tuyển dụng hủy lịch") {
    try {
      const encodedReason = encodeURIComponent(reason);
      const response = await httpClient.delete(`/v1/interviews/${id}?reason=${encodedReason}`);
      return toInterviewViewModel(response);
    } catch (err) {
      console.warn(`[apiInterviewService] Lỗi hủy lịch ${id}, fallback sang mock:`, err.message);
      return mockInterviewService.cancelInterview(id, reason);
    }
  }
};
