import { httpClient } from "../httpClient";
import { toApplicationViewModel, toApplicationStageUpdateRequest } from "../../mappers/applicationMapper";
import { toRankingListViewModel } from "../../mappers/rankingMapper";
import { mockApplicationService } from "../mock/mockApplicationService";
import { apiJobService } from "./apiJobService";

export const apiApplicationService = {
  /**
   * Lấy danh sách toàn bộ hồ sơ ứng tuyển của công ty.
   * Do Backend hiện chưa có endpoint /v1/employer/applications, service sẽ tự động
   * tổng hợp ranking từ các job đang hoạt động hoặc fallback an toàn sang Mock.
   */
  async getApplications(companyId = "COMP-01", filters = {}) {
    try {
      if (filters.jobId && filters.jobId !== "all") {
        const ranking = await this.getJobRanking(filters.jobId);
        if (ranking && ranking.length > 0) {
          return ranking.map((r) =>
            toApplicationViewModel({
              id: r.applicationId,
              candidateId: r.candidateId,
              candidateName: r.candidateName,
              jobId: filters.jobId,
              stage: r.stage,
              matchScore: r.overallScore,
              appliedDate: r.appliedDate
            })
          );
        }
      }

      // Thử lấy danh sách các job rồi gom candidate ranking
      const jobs = await apiJobService.getEmployerJobs(companyId);
      if (jobs && jobs.length > 0) {
        const aggregated = [];
        for (const job of jobs.slice(0, 5)) {
          try {
            const ranking = await this.getJobRanking(job.id);
            if (ranking && ranking.length > 0) {
              ranking.forEach((r) => {
                aggregated.push(
                  toApplicationViewModel({
                    id: r.applicationId,
                    candidateId: r.candidateId,
                    candidateName: r.candidateName,
                    appliedJobId: job.id,
                    appliedJobTitle: job.title,
                    stage: r.stage,
                    matchScore: r.overallScore,
                    appliedDate: r.appliedDate
                  })
                );
              });
            }
          } catch {}
        }
        if (aggregated.length > 0) {
          let result = aggregated;
          if (filters.stage && filters.stage !== "all") {
            const target = filters.stage.toLowerCase();
            result = result.filter((a) => a.stageCode === target || a.stage.toLowerCase() === target);
          }
          return result;
        }
      }
    } catch (err) {
      console.warn("[apiApplicationService] Không thể tổng hợp applications qua API, fallback sang mock:", err.message);
    }

    return mockApplicationService.getApplications(companyId, filters);
  },

  async getApplicationById(applicationId) {
    try {
      // Gọi chi tiết nếu có endpoint, hiện tại fallback kết hợp match score
      const matchScore = await this.getApplicationMatchScore(applicationId);
      const mockApp = await mockApplicationService.getApplicationById(applicationId);
      if (mockApp && matchScore) {
        return {
          ...mockApp,
          matchScore: matchScore.overallScore || mockApp.matchScore
        };
      }
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi lấy app ${applicationId}, fallback sang mock:`, err.message);
    }
    return mockApplicationService.getApplicationById(applicationId);
  },

  /**
   * Gọi API lấy bảng xếp hạng ứng viên theo Job: GET /v1/jobs/{jobId}/applications/ranking
   */
  async getJobRanking(jobId) {
    try {
      const response = await httpClient.get(`/v1/jobs/${jobId}/applications/ranking`);
      return toRankingListViewModel(response);
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi lấy ranking job ${jobId}, fallback sang mock:`, err.message);
      return mockApplicationService.getJobRanking(jobId);
    }
  },

  /**
   * Gọi API cập nhật stage: PATCH /v1/applications/{applicationId}/stage
   */
  async updateApplicationStage(applicationId, nextStage, reason = "", notes = "") {
    const payload = toApplicationStageUpdateRequest(nextStage, reason, notes);
    try {
      const response = await httpClient.patch(`/v1/applications/${applicationId}/stage`, payload);
      return toApplicationViewModel({
        id: applicationId,
        stage: response?.currentStage || nextStage
      });
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi cập nhật stage cho ${applicationId}, fallback sang mock:`, err.message);
      return mockApplicationService.updateApplicationStage(applicationId, nextStage, reason, notes);
    }
  },

  /**
   * Gọi API lịch sử chuyển trạng thái: GET /v1/applications/{applicationId}/history
   */
  async getApplicationHistory(applicationId) {
    try {
      const response = await httpClient.get(`/v1/applications/${applicationId}/history`);
      return response?.history || response || [];
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi lấy lịch sử app ${applicationId}, fallback sang mock:`, err.message);
      return mockApplicationService.getApplicationHistory(applicationId);
    }
  },

  /**
   * Gọi API điểm phù hợp AI: GET /v1/applications/{applicationId}/match
   */
  async getApplicationMatchScore(applicationId) {
    try {
      const response = await httpClient.get(`/v1/applications/${applicationId}/match`);
      return {
        applicationId,
        overallScore: response?.overallScore ?? 0,
        skillsScore: response?.skillsScore ?? 0,
        experienceScore: response?.experienceScore ?? 0,
        rationale: response?.rationale || "Đánh giá từ AI Matching Service."
      };
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi lấy match score app ${applicationId}, fallback sang mock:`, err.message);
      return mockApplicationService.getApplicationMatchScore(applicationId);
    }
  }
};
