import { mockStore } from "../mockStore";
import { STAGE_TEXT_TO_CODE } from "../../mappers/applicationMapper";
function ownedCandidates(companyId) {
  const owner = mockStore.getHRCompanyId();
  if (companyId != null && String(owner) !== String(companyId)) throw new Error("Bạn không có quyền xem doanh nghiệp này.");
  return mockStore.getCandidates();
}
function view(candidate) {
  const app = mockStore.getApplications().find(a => String(a.candidateId) === String(candidate.id) && String(a.jobId) === String(candidate.appliedJobId));
  return { ...app, ...candidate, id: candidate.id, applicationId: app?.id || null,
    candidateId: candidate.id, candidateName: candidate.name || candidate.candidateName || "Ứng viên",
    candidateRole: candidate.role || "", jobId: candidate.appliedJobId,
    cvId: app?.cvId, cvName: app?.cvName, coverLetter: app?.coverLetter || candidate.coverLetter || "",
    stageCode: STAGE_TEXT_TO_CODE[candidate.stage] || candidate.stage,
    matchScore: candidate.matchScore ?? candidate.match };
}
function find(id) {
  const candidates = ownedCandidates();
  return candidates.find(c => String(c.id) === String(id)) || candidates.find(c => view(c).applicationId === id);
}
export const mockApplicationService = {
  async getApplications(companyId, filters = {}) {
    let result = ownedCandidates(companyId).map(view);
    if (filters.jobId && filters.jobId !== "all") result = result.filter(a => String(a.jobId) === String(filters.jobId));
    if (filters.stage && !["all", "Tất cả"].includes(filters.stage)) result = result.filter(a => a.stage === filters.stage || a.stageCode === filters.stage);
    const keyword = String(filters.keyword || "").trim().toLowerCase();
    if (keyword) result = result.filter(a => [a.candidateName, a.candidateRole, ...(a.skills || [])].join(" ").toLowerCase().includes(keyword));
    return result;
  },
  async getApplicationById(id) { const candidate = find(id); return candidate ? view(candidate) : null; },
  async updateApplicationStage(id, stage, reason = "") {
    const candidate = find(id);
    if (!candidate) throw new Error("Không tìm thấy hồ sơ thuộc doanh nghiệp của bạn.");
    const labels = { new: "Mới", screening: "Sàng lọc", test: "Bài kiểm tra", interview: "Phỏng vấn", offer: "Đề nghị", rejected: "Đã từ chối", "Từ chối": "Đã từ chối" };
    mockStore.updateCandidateStage(candidate.id, labels[stage] || stage, reason);
    return this.getApplicationById(candidate.id);
  },
  async getApplicationHistory(id) {
    const candidate = find(id); if (!candidate) return [];
    const app = mockStore.getApplications().find(a => String(a.candidateId) === String(candidate.id) && String(a.jobId) === String(candidate.appliedJobId));
    return (app?.history || []).map(h => typeof h === "string" ? { notes: h, toStage: h } : { ...h, notes: h.notes || h.text || h.action, toStage: h.toStage || h.text || h.action, createdAt: h.createdAt || h.at || h.time, changedAt: h.changedAt || h.at || h.time });
  },
  async getJobRanking(jobId) {
    return (await this.getApplications(undefined, { jobId })).sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0));
  },
  async getApplicationMatchScore(id) {
    const app = await this.getApplicationById(id);
    if (!app || app.matchScore == null || app.matchScore === "") return null;
    return { applicationId: app.applicationId, overallScore: Number(app.matchScore), rationale: "Điểm minh họa từ dữ liệu demo, chưa phải kết quả AI thật." };
  }
};