import { apiJobService } from "./apiJobService";
import { apiApplicationService } from "./apiApplicationService";
import { apiInterviewService } from "./apiInterviewService";
import { apiAdminService } from "./apiAdminService";
import { toEmployerStatisticsViewModel, toAdminStatisticsViewModel } from "../../mappers/statisticsMapper";
import { mockStatisticsService } from "../mock/mockStatisticsService";

/**
 * apiStatisticsService
 * Tổng hợp & chuyển đổi số liệu cho Employer và Admin từ API thật.
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
    const [jobStats, usersPage, reviews, reports] = await Promise.all([
      apiAdminService.getJobStats(),
      apiAdminService.getUsersPage({ page: 0, size: 1 }),
      apiAdminService.getReviews().catch(() => []),
      apiAdminService.getReports().catch(() => [])
    ]);

    return toAdminStatisticsViewModel({
      totalUsers: usersPage.totalElements,
      users: usersPage.items,
      activeJobsCount: Number(jobStats?.activeJobs ?? 0),
      pendingJobsCount: Number(jobStats?.pendingJobs ?? 0),
      jobStats,
      reviews,
      reports
    });
  }
};
