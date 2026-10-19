import { mockStore } from "../mockStore";
import { toInterviewViewModel } from "../../mappers/interviewMapper";

export const mockInterviewService = {
  async getInterviews(companyId = "COMP-01", filters = {}) {
    const all = mockStore.getInterviews();
    let result = all;

    if (filters.status && filters.status !== "all" && filters.status !== "Tất cả") {
      result = result.filter(item => item.status === filters.status);
    }

    return result.map(toInterviewViewModel);
  },

  async getInterviewById(id) {
    const interview = mockStore.getInterview(id);
    return toInterviewViewModel(interview);
  },

  async createInterview(form) {
    const created = mockStore.createInterview(form);
    return toInterviewViewModel(created);
  },

  async updateInterview(id, updates) {
    const updated = mockStore.updateInterview(id, updates, updates.scheduleVersion);
    return toInterviewViewModel(updated);
  },

  async updateInterviewStatus(id, newStatus, reason = "") {
    if (newStatus === "Đã hủy" || newStatus === "cancelled") {
      return this.cancelInterview(id, reason || "Hủy lịch bởi người dùng");
    }
    const updated = mockStore.updateInterview(id, { status: newStatus });
    return toInterviewViewModel(updated);
  },

  async cancelInterview(id, reason = "Nhà tuyển dụng hủy lịch") {
    mockStore.cancelInterview(id, reason);
    const item = mockStore.getInterview(id);
    return toInterviewViewModel(item);
  }
};
