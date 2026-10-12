import { STATISTICS_FIXTURE } from "../../fixtures/statistics.fixture";
import { mockJobService } from "./mockJobService";
import { mockApplicationService } from "./mockApplicationService";
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
    return toAdminStatisticsViewModel({
      activeJobsCount: 1285
    });
  }
};
