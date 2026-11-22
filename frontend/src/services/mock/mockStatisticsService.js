import { STATISTICS_FIXTURE } from "../../fixtures/statistics.fixture";
import { mockJobService } from "./mockJobService";
import { mockApplicationService } from "./mockApplicationService";
import { mockAdminService } from "./mockAdminService";
import { mockStore } from "../mockStore";
import { toEmployerStatisticsViewModel, toAdminStatisticsViewModel } from "../../mappers/statisticsMapper";

function delay(ms = 60) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockStatisticsService = {
  async getEmployerStatistics(companyId = "COMP-01") {
    await delay();
    try {
      const jobs = await mockJobService.getEmployerJobs(companyId);
      const apps = await mockApplicationService.getApplications(companyId);
      return toEmployerStatisticsViewModel(jobs, apps);
    } catch {
      return STATISTICS_FIXTURE.employer;
    }
  },

  async getAdminStatistics() {
    await delay();
    const jobStats = await mockAdminService.getJobStats();
    const users = mockStore.getUsers();
    const reviews = mockStore.getReviews();
    const reports = mockStore.getReports();
    return toAdminStatisticsViewModel({
      totalUsers: users.length,
      users,
      reviews,
      reports,
      activeJobsCount: jobStats.activeJobs,
      jobStats
    });
  }
};
