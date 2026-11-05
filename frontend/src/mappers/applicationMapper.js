import { createDefaultApplication } from "../models/ApplicationViewModel";
import { formatDate } from "./jobMapper";

export const STAGE_MAP = {
  new: { text: "Mới", badge: "is-info" },
  screening: { text: "Sàng lọc", badge: "is-warning" },
  testing: { text: "Bài kiểm tra", badge: "is-primary" },
  interview: { text: "Phỏng vấn", badge: "is-success" },
  offer: { text: "Đề nghị", badge: "is-danger" },
  hired: { text: "Đã tuyển dụng", badge: "is-success" },
  rejected: { text: "Từ chối", badge: "is-secondary" }
};

export const STAGE_TEXT_TO_CODE = {
  "Mới": "new",
  "Sàng lọc": "screening",
  "Bài kiểm tra": "testing",
  "Phỏng vấn": "interview",
  "Đề nghị": "offer",
  "Đã tuyển dụng": "hired",
  "Tiếp nhận": "hired",
  "Từ chối": "rejected",
  "Đã từ chối": "rejected"
};

/**
 * Trích xuất 2 chữ cái viết tắt của ứng viên
 */
export function getCandidateInitials(name = "") {
  if (!name) return "UV";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Chuyển đổi từ DTO / entity / mock sang ApplicationViewModel
 */
export function toApplicationViewModel(dto, candidateSnapshot = null) {
  if (!dto) return createDefaultApplication();

  let stageCode = (dto.stage || dto.stageCode || "new").toLowerCase();
  if (STAGE_TEXT_TO_CODE[dto.stage]) {
    stageCode = STAGE_TEXT_TO_CODE[dto.stage];
  }

  const stageMeta = STAGE_MAP[stageCode] || { text: dto.stage || "Mới", badge: "is-secondary" };

  const candidateName =
    dto.candidateName ||
    dto.name ||
    candidateSnapshot?.name ||
    candidateSnapshot?.fullName ||
    "Ứng viên";

  const initials = dto.initials || dto.candidateInitials || getCandidateInitials(candidateName);

  const role = dto.candidateRole || dto.role || dto.candidateHeadline || candidateSnapshot?.role || "Ứng viên";
  const email = dto.candidateEmail || dto.email || candidateSnapshot?.email || "";
  const phone = dto.candidatePhone || dto.phone || candidateSnapshot?.phone || "";
  const rawMatch = dto.matchScore ?? dto.overallScore ?? dto.match;
  const match = rawMatch == null || rawMatch === "" ? null : Number(rawMatch);
  const appliedJobTitle = dto.appliedJobTitle || dto.jobTitle || "Vị trí tuyển dụng";
  const skills = Array.isArray(dto.candidateSkills) && dto.candidateSkills.length > 0
    ? dto.candidateSkills
    : (Array.isArray(dto.skills) ? dto.skills : candidateSnapshot?.skills || []);

  return {
    id: String(dto.id || dto.applicationId || ""),
    applicationId: String(dto.applicationId || dto.id || ""),
    candidateId: String(dto.candidateId || dto.candidate_id || candidateSnapshot?.id || ""),
    jobId: String(dto.jobId || dto.job_id || dto.appliedJobId || ""),
    name: candidateName,
    candidateName,
    initials,
    candidateInitials: initials,
    email,
    candidateEmail: email,
    phone,
    candidatePhone: phone,
    avatar: dto.candidateAvatar || dto.avatar || "",
    candidateAvatar: dto.candidateAvatar || dto.avatar || "",
    role,
    candidateRole: role,
    headline: dto.candidateHeadline || role,
    location: dto.location || candidateSnapshot?.location || "TP. Hồ Chí Minh",
    education: dto.education || candidateSnapshot?.education || "Cử nhân",
    experience: dto.experience || candidateSnapshot?.experience || "Chưa cập nhật",
    skills,
    bio: dto.bio || candidateSnapshot?.bio || "",
    workHistory: Array.isArray(dto.workHistory) ? dto.workHistory : candidateSnapshot?.workHistory || [],
    appliedJobId: String(dto.appliedJobId || dto.jobId || ""),
    appliedJobTitle,
    jobTitle: appliedJobTitle,
    companyId: String(dto.companyId || dto.company_id || "COMP-01"),
    companyName: dto.companyName || "",
    stage: stageMeta.text,
    stageCode,
    match,
    matchScore: match,
    skillsScore: dto.skillsScore ?? null,
    experienceScore: dto.experienceScore ?? null,
    matchRationale: dto.matchRationale || "",
    rejectReason: dto.rejectReason || "",
    appliedDate: formatDate(dto.appliedAt || dto.appliedDate || dto.created_at),
    coverLetter: dto.coverLetter || dto.cover_letter || "",
    cvSnapshotUrl: dto.cvSnapshotUrl || dto.cv_snapshot_url || dto.cvUrl || "",
    statusBadgeClass: stageMeta.badge
  };
}

/**
 * Tạo payload cho PATCH /v1/applications/{applicationId}/stage
 */
export function toApplicationStageUpdateRequest(targetStage, reason = "", notes = "") {
  let stageCode = targetStage.toLowerCase();
  if (STAGE_TEXT_TO_CODE[targetStage]) {
    stageCode = STAGE_TEXT_TO_CODE[targetStage];
  }
  return {
    toStage: stageCode,
    targetStage: stageCode,
    reason: reason || null,
    notes: notes || null
  };
}
