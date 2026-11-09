/**
 * RankingViewModel
 * Đối tượng View Model chuẩn hóa cho Danh sách xếp hạng ứng viên AI (AI Candidate Ranking)
 */

export function createDefaultRankingItem() {
  return {
    ranking: 1,
    applicationId: "",
    candidateId: "",
    candidateName: "",
    candidateInitials: "UV",
    stage: "Mới",
    stageCode: "new",
    overallScore: null,
    skillsScore: null,
    experienceScore: null,
    rationale: "Chưa có đánh giá chi tiết từ hệ thống AI.",
    scoreLevel: "pending",
    badgeClass: "badge-secondary",
    appliedDate: ""
  };
}
