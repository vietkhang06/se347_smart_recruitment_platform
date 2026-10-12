/**
 * ApplicationViewModel
 * Đối tượng View Model chuẩn hóa cho Đơn ứng tuyển / Hồ sơ ứng viên (Candidate & Application)
 */

export function createDefaultApplication() {
  return {
    id: "",
    candidateId: "",
    jobId: "",
    name: "Ứng viên",
    candidateName: "Ứng viên",
    initials: "UV",
    candidateInitials: "UV",
    email: "",
    candidateEmail: "",
    phone: "",
    candidatePhone: "",
    role: "Ứng viên",
    candidateRole: "Ứng viên",
    location: "TP. Hồ Chí Minh",
    education: "",
    experience: "Chưa cập nhật",
    skills: [],
    bio: "",
    workHistory: [],
    appliedJobId: "",
    appliedJobTitle: "",
    jobTitle: "",
    companyId: "COMP-01",
    stage: "Mới",
    stageCode: "new",
    match: 0,
    matchScore: 0,
    appliedDate: "",
    coverLetter: "",
    cvSnapshotUrl: "",
    statusBadgeClass: "is-secondary"
  };
}
