import { apiJobService } from "./apiJobService";
import { apiApplicationService } from "./apiApplicationService";
import { apiInterviewService } from "./apiInterviewService";
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
      const [jobs, apps, interviews] = await Promise.all([
        apiJobService.getEmployerJobs(companyId),
        apiApplicationService.getApplications(companyId),
        apiInterviewService.getInterviews(companyId).catch(() => [])
      ]);
      return toEmployerStatisticsViewModel(jobs, apps, interviews);
    } catch {
      return mockStatisticsService.getEmployerStatistics(companyId);
    }
  },

  async getAdminStatistics() {
    return mockStatisticsService.getAdminStatistics();
  }
};
