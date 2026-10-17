/**
 * Mapper chuyển đổi giữa API DTO (Spring Boot /v1/interviews)
 * và ViewModel hiển thị trên giao diện Employer Portal
 */

export const INTERVIEW_STATUS_MAP = {
  scheduled: "Sắp diễn ra",
  confirmed: "Đã xác nhận",
  pending_confirm: "Chờ xác nhận",
  completed: "Hoàn tất",
  cancelled: "Đã hủy"
};

export const INTERVIEW_LABEL_TO_CODE = {
  "Sắp diễn ra": "scheduled",
  "Đã xác nhận": "confirmed",
  "Chờ xác nhận": "pending_confirm",
  "Đề nghị đổi lịch": "pending_confirm",
  "Hoàn tất": "completed",
  "Đã hủy": "cancelled"
};

/**
 * Chuyển đổi Interview DTO từ Backend sang ViewModel trên Frontend
 */
export function toInterviewViewModel(dto) {
  if (!dto) return null;

  const rawStatus = dto.statusLabel || dto.status || "Sắp diễn ra";
  const statusLabel = INTERVIEW_STATUS_MAP[rawStatus.toLowerCase()] || rawStatus;
  const statusCode = INTERVIEW_LABEL_TO_CODE[statusLabel] || dto.status || "scheduled";

  return {
    id: String(dto.id || ""),
    applicationId: dto.applicationId ? String(dto.applicationId) : undefined,
    candidateId: String(dto.candidateId || ""),
    candidate: dto.candidateName || dto.candidate || "Ứng viên",
    candidateName: dto.candidateName || dto.candidate || "Ứng viên",
    candidateEmail: dto.candidateEmail || "",
    candidatePhone: dto.candidatePhone || "",
    role: dto.jobTitle || dto.role || "Vị trí tuyển dụng",
    jobTitle: dto.jobTitle || dto.role || "Vị trí tuyển dụng",
    jobId: String(dto.jobId || ""),
    companyId: String(dto.companyId || "COMP-01"),
    time: dto.time || "09:00",
    date: dto.date || "",
    scheduledAt: dto.scheduledAt || null,
    durationMin: Number(dto.durationMin || 60),
    type: dto.interviewType || dto.type || "Google Meet (Trực tuyến)",
    interviewType: dto.interviewType || dto.type || "Google Meet (Trực tuyến)",
    interviewMode: dto.interviewMode || "online",
    meetingLink: dto.meetingLink || "",
    location: dto.location || "",
    people: dto.participants || dto.people || "",
    participants: dto.participants || dto.people || "",
    status: statusLabel,
    statusCode,
    note: dto.note || "",
    cancelReason: dto.cancelReason || (statusCode === "cancelled" ? dto.note : ""),
    scheduleVersion: Number(dto.scheduleVersion || 1),
    candidateResponse: dto.candidateResponse || null
  };
}

/**
 * Chuẩn bị payload gửi lên Backend khi Tạo lịch mới: POST /v1/interviews
 */
export function toInterviewCreateRequest(form) {
  const isOnline = /meet|teams|zoom|trực tuyến|online/i.test(form.type || form.interviewType || "");
  const statusLabel = form.status || "Chờ xác nhận";
  const statusCode = INTERVIEW_LABEL_TO_CODE[statusLabel] || "pending_confirm";

  return {
    applicationId: form.applicationId || undefined,
    candidateId: form.candidateId || undefined,
    jobId: form.jobId || undefined,
    date: form.date,
    time: form.time || "09:00",
    durationMin: Number(form.durationMin || 60),
    interviewType: form.type || form.interviewType || "Google Meet (Trực tuyến)",
    interviewMode: isOnline ? "online" : "onsite",
    meetingLink: isOnline ? String(form.meetingLink || "").trim() : "",
    location: !isOnline ? String(form.location || "").trim() : "",
    participants: String(form.people || form.participants || "").trim(),
    note: String(form.note || "").trim(),
    status: statusCode
  };
}

/**
 * Chuẩn bị payload gửi lên Backend khi Chỉnh sửa / Đổi lịch: PUT /v1/interviews/{id}
 */
export function toInterviewUpdateRequest(form) {
  const isOnline = /meet|teams|zoom|trực tuyến|online/i.test(form.type || form.interviewType || "");

  const payload = {
    date: form.date,
    time: form.time,
    interviewType: form.type || form.interviewType,
    interviewMode: isOnline ? "online" : "onsite",
    meetingLink: isOnline ? String(form.meetingLink || "").trim() : "",
    location: !isOnline ? String(form.location || "").trim() : "",
    participants: String(form.people || form.participants || "").trim(),
    note: String(form.note || "").trim()
  };

  if (form.status) {
    payload.status = INTERVIEW_LABEL_TO_CODE[form.status] || form.status;
  }

  return payload;
}
