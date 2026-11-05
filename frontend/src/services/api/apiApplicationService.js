import { httpClient } from "../httpClient";
import { toApplicationViewModel, toApplicationStageUpdateRequest, STAGE_TEXT_TO_CODE } from "../../mappers/applicationMapper";
import { toRankingListViewModel } from "../../mappers/rankingMapper";
import { validateMatchingResult, MatchingContractError } from "../contracts/matchingResult.contract";
const path = id => encodeURIComponent(id);
export const apiApplicationService = {
  async getApplications(companyId, filters = {}) {
    const params = {};
    if (companyId && companyId !== "COMP-01") params.companyId = companyId;
    if (filters.jobId && filters.jobId !== "all") params.jobId = filters.jobId;
    if (filters.stage && filters.stage !== "all") params.stage = STAGE_TEXT_TO_CODE[filters.stage] || filters.stage.toLowerCase();
    if (filters.search?.trim()) params.search = filters.search.trim();
    const response = await httpClient.get("/v1/employer/applications", { params });
    if (!Array.isArray(response)) throw new MatchingContractError("employer applications[]");
    return response.map(item => toApplicationViewModel(item));
  },
  async getApplicationById(applicationId) {
    const response = await httpClient.get(`/v1/employer/applications/${path(applicationId)}`);
    if (!response || !(response.id || response.applicationId)) throw new MatchingContractError("applicationId");
    return toApplicationViewModel(response);
  },
  async getJobRanking(jobId) {
    return toRankingListViewModel(await httpClient.get(`/v1/jobs/${path(jobId)}/applications/ranking`));
  },
  async updateApplicationStage(applicationId, nextStage, reason = "", notes = "") {
    const response = await httpClient.patch(`/v1/applications/${path(applicationId)}/stage`, toApplicationStageUpdateRequest(nextStage, reason, notes));
    return toApplicationViewModel({ applicationId, stage: response?.currentStage || nextStage });
  },
  async getApplicationHistory(applicationId) {
    const response = await httpClient.get(`/v1/applications/${path(applicationId)}/history`);
    const items = Array.isArray(response) ? response : response?.history;
    if (!Array.isArray(items)) throw new MatchingContractError("history[]");
    return items;
  },
  async getMatchingResult(applicationId, options = {}) {
    return validateMatchingResult(await httpClient.get(`/v1/applications/${path(applicationId)}/match`, options), applicationId);
  },
  async triggerMatchingEvaluation(applicationId, options = {}) {
    // Worker processing timeout is 60s; the browser allows transport overhead as well.
    return validateMatchingResult(await httpClient.post(`/v1/applications/${path(applicationId)}/match`, undefined, { timeout: 75000, ...options }), applicationId);
  },
  async getApplicationMatchScore(applicationId) {
    const result = await this.getMatchingResult(applicationId);
    return { ...result, rationale: result.explanation };
  }
};
