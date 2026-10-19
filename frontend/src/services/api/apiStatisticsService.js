import { apiJobService } from "./apiJobService";
import { apiApplicationService } from "./apiApplicationService";
import { toEmployerStatisticsViewModel, toAdminStatisticsViewModel } from "../../mappers/statisticsMapper";
import { mockStatisticsService } from "../mock/mockStatisticsService";

/**
 * apiStatisticsService
 * Tính toán & chuyển đổi số liệu tổng hợp cho Employer và Admin.
 * Do Backend chưa có endpoint thống kê riêng, service sẽ tự động tính toán từ các entity
 * đã lấy được qua API hoặc fallback sang Mock.
 */
export const apiStatisticsService = {
  async getEmployerStatistics(companyId = "COMP-01") {
    try {
      const jobs = await apiJobService.getEmployerJobs(companyId);
      const apps = await apiApplicationService.getApplications(companyId);
      return toEmployerStatisticsViewModel(jobs, apps);
    } catch {
      return mockStatisticsService.getEmployerStatistics(companyId);
    }
  },

  async getAdminStatistics() {
    return mockStatisticsService.getAdminStatistics();
  }
};
