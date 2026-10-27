import { createDefaultRankingItem } from "../models/RankingViewModel";
import { STAGE_MAP, STAGE_TEXT_TO_CODE, getCandidateInitials } from "./applicationMapper";
import { formatDate } from "./jobMapper";

/**
 * Xác định phân loại điểm số AI
 */
export function determineScoreLevel(score = null) {
  if (score === null) return { level: "pending", label: "Chưa có điểm", badgeClass: "badge-secondary" };
  if (score >= 85) return { level: "excellent", label: "Rất phù hợp", badgeClass: "badge-success bg-success" };
  if (score >= 70) return { level: "good", label: "Phù hợp", badgeClass: "badge-info bg-info text-dark" };
  if (score >= 50) return { level: "average", label: "Cân nhắc", badgeClass: "badge-warning bg-warning text-dark" };
  return { level: "low", label: "Ít phù hợp", badgeClass: "badge-secondary bg-secondary" };
}

/**
 * Chuyển đổi từ Backend ApplicationRankingItem sang RankingViewModel
 */
export function toRankingViewModel(item) {
  if (!item) return createDefaultRankingItem();

  const overallScore = item.overallScore ?? item.match ?? null;
  const scoreInfo = determineScoreLevel(overallScore);

  let stageCode = (item.stage || "new").toLowerCase();
  if (STAGE_TEXT_TO_CODE[item.stage]) {
    stageCode = STAGE_TEXT_TO_CODE[item.stage];
  }
  const stageMeta = STAGE_MAP[stageCode] || { text: item.stage || "Mới", badge: "is-secondary" };

  const candidateName = item.candidateName || item.name || "Ứng viên";

  return {
    ranking: Number(item.ranking || 1),
    applicationId: String(item.applicationId || item.id || ""),
    candidateId: String(item.candidateId || ""),
    candidateName,
    candidateInitials: item.candidateInitials || item.initials || getCandidateInitials(candidateName),
    stage: stageMeta.text,
    stageCode,
    overallScore,
    skillsScore: item.skillsScore ?? null,
    experienceScore: item.experienceScore ?? null,
    rationale: item.rationale || "Chưa có giải thích từ Worker.",
    scoreLevel: scoreInfo.level,
    scoreLabel: scoreInfo.label,
    badgeClass: scoreInfo.badgeClass,
    appliedDate: formatDate(item.appliedAt || item.appliedDate)
  };
}

/**
 * Chuyển đổi danh sách xếp hạng
 */
export function toRankingListViewModel(response) {
  if (!response) return [];
  const items = Array.isArray(response) ? response : response.items || [];
  return items.map((item, idx) => toRankingViewModel({ ...item, ranking: item.ranking || idx + 1 }));
}
