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
    overallScore: 0,
    skillsScore: 0,
    experienceScore: 0,
    rationale: "Chưa có đánh giá chi tiết từ hệ thống AI.",
    scoreLevel: "average",
    badgeClass: "badge-secondary",
    appliedDate: ""
  };
}
