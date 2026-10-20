import { httpClient } from "../httpClient";
import { toApplicationViewModel, toApplicationStageUpdateRequest, STAGE_TEXT_TO_CODE } from "../../mappers/applicationMapper";
import { toRankingListViewModel } from "../../mappers/rankingMapper";
import { mockApplicationService } from "../mock/mockApplicationService";
import { mockStore } from "../mockStore";
import MATCHING_RESULT_FIXTURE from "../../fixtures/matching-result.fixture.json";

function normalizeMatchingResult(response, applicationId, source = "API") {
  return {
    applicationId: response?.applicationId || applicationId,
    jobId: response?.jobId ?? null,
    cvVersionId: response?.cvVersionId ?? null,
    status: response?.status || "NOT_STARTED",
    overallScore: response?.overallScore ?? null,
    skillsScore: response?.skillsScore ?? null,
    experienceScore: response?.experienceScore ?? null,
    criteriaScores: response?.criteriaScores || {},
    matchedSkills: Array.isArray(response?.matchedSkills) ? response.matchedSkills : [],
    missingSkills: Array.isArray(response?.missingSkills) ? response.missingSkills : [],
    breakdown: response?.breakdown || {},
    explanation: response?.explanation || null,
    processingJobId: response?.processingJobId ?? null,
    evaluatedAt: response?.evaluatedAt ?? null,
    message: response?.message || "",
    source
  };
}

function shouldUseMatchingFixture(applicationId, error) {
  const fixtureEnabled = import.meta.env.DEV
    && import.meta.env.VITE_MATCHING_FIXTURE_FALLBACK !== "false";
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(String(applicationId || ""));
  return fixtureEnabled && (!looksLikeUuid || error?.status === 0);
}

function fixtureMatchingResult(applicationId, message) {
  return {
    ...MATCHING_RESULT_FIXTURE,
    applicationId,
    source: "FIXTURE",
    message
  };
}

function matchingErrorResult(applicationId, error) {
  return {
    applicationId,
    status: "ERROR",
    overallScore: null,
    skillsScore: null,
    experienceScore: null,
    criteriaScores: {},
    matchedSkills: [],
    missingSkills: [],
    breakdown: {},
    explanation: null,
    source: "API",
    message: error?.message || "Không thể tải kết quả đối sánh CV–JD."
  };
}

export const apiApplicationService = {
  /**
   * Lấy danh sách toàn bộ hồ sơ ứng tuyển của công ty từ API backend:
   * GET /v1/employer/applications (hỗ trợ lọc theo companyId, jobId, stage, search)
   */
  async getApplications(companyId, filters = {}) {
    try {
      const params = {};
      if (companyId && companyId !== "COMP-01") {
        params.companyId = companyId;
      }
      if (filters.jobId && filters.jobId !== "all") {
        params.jobId = filters.jobId;
      }
      if (filters.stage && filters.stage !== "all") {
        params.stage = STAGE_TEXT_TO_CODE[filters.stage] || filters.stage.toLowerCase();
      }
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }

      const response = await httpClient.get("/v1/employer/applications", { params });
      if (Array.isArray(response)) {
        return response.map((item) => toApplicationViewModel(item));
      }
    } catch (err) {
      console.warn("[apiApplicationService] Không thể tải applications từ /v1/employer/applications, fallback sang mock:", err.message);
    }

    return mockApplicationService.getApplications(companyId, filters);
  },

  /**
   * Lấy chi tiết hồ sơ ứng tuyển: GET /v1/employer/applications/{applicationId} (hoặc fallback /v1/applications/{id})
   */
  async getApplicationById(applicationId) {
    try {
      const response = await httpClient.get(`/v1/employer/applications/${applicationId}`);
      if (response && (response.id || response.applicationId)) {
        return toApplicationViewModel(response);
      }
    } catch {
      try {
        const fallbackRes = await httpClient.get(`/v1/applications/${applicationId}`);
        if (fallbackRes && (fallbackRes.id || fallbackRes.applicationId)) {
          return toApplicationViewModel(fallbackRes);
        }
      } catch (err) {
        console.warn(`[apiApplicationService] Lỗi lấy app ${applicationId} qua API, fallback sang mock:`, err.message);
      }
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
      
      // Đồng bộ vào mockStore nếu có bản ghi cục bộ
      try {
        mockStore.updateCandidateStage(applicationId, nextStage);
      } catch {}

      return toApplicationViewModel({
        id: applicationId,
        applicationId,
        stage: response?.currentStage || nextStage
      });
    } catch (err) {
      console.warn(`[apiApplicationService] Lỗi cập nhật stage cho ${applicationId}:`, err.message);
      // Nếu backend trả về lỗi nghiệp vụ 400 (Invalid transition...), ném lỗi để UI hiển thị thông báo
      if (err.status === 400 || err.response?.status === 400) {
        const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
        throw new Error(detail || "Không thể chuyển giai đoạn.");
      }
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
  async getMatchingResult(applicationId) {
    try {
      const response = await httpClient.get(`/v1/applications/${applicationId}/match`);
      return normalizeMatchingResult(response, applicationId);
    } catch (err) {
      if (shouldUseMatchingFixture(applicationId, err)) {
        console.warn(`[apiApplicationService] Matching API unavailable; displaying a labelled fixture: ${err.message}`);
        return fixtureMatchingResult(
          applicationId,
          "Đang hiển thị fixture minh họa vì API matching chưa khả dụng. Đây không phải kết quả AI của hồ sơ hiện tại."
        );
      }
      return matchingErrorResult(applicationId, err);
    }
  },

  /** Trigger synchronous matching using the persisted Application, CV snapshot, and Job. */
  async triggerMatchingEvaluation(applicationId) {
    try {
      const response = await httpClient.post(`/v1/applications/${applicationId}/match`);
      return normalizeMatchingResult(response, applicationId);
    } catch (err) {
      if (shouldUseMatchingFixture(applicationId, err)) {
        console.warn(`[apiApplicationService] Matching trigger failed; displaying a labelled fixture: ${err.message}`);
        return fixtureMatchingResult(
          applicationId,
          "Không thể chạy matching trên API; đang hiển thị fixture minh họa, không phải kết quả AI của hồ sơ hiện tại."
        );
      }
      return matchingErrorResult(applicationId, err);
    }
  },

  /**
   * Backward-compatible score helper. Missing scores remain null instead of becoming zero.
   */
  async getApplicationMatchScore(applicationId) {
    const result = await this.getMatchingResult(applicationId);
    return {
      applicationId,
      status: result.status,
      overallScore: result.overallScore,
      skillsScore: result.skillsScore,
      experienceScore: result.experienceScore,
      rationale: result.explanation,
      explanation: result.explanation,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      source: result.source,
      message: result.message
    };
  }
};
