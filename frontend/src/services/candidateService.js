// Demo adapter: cùng nguồn tin/đơn/lịch với HR. Backend thật sẽ thay lớp này.
import { mockStore } from "./mockStore";
export const normalizeEmail = (value = "") => value.trim().toLowerCase();
const key = (user, type) =>
  `matchajob_candidate_v2_${type}_${normalizeEmail(user?.email)}`;
export function readJSON(name, fallback) {
  try {
    const raw = localStorage.getItem(name);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON(name, value) {
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch {
    throw new Error(
      "Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.",
    );
  }
  window.dispatchEvent(new Event("matchajob:store-changed"));
}
export function getProfile(user) {
  const base = {
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    role: "",
    location: "",
    experience: "",
    bio: "",
    skills: "",
    education: "",
    workHistory: "",
    portfolio: "",
    cv: null,
  };
  return { ...base, ...readJSON(key(user, "profile"), {}) };
}
export function saveProfile(user, profile) {
  writeJSON(key(user, "profile"), profile);
}
export function getSaved(user) {
  return readJSON(key(user, "saved"), []);
}
export function saveFavorites(user, ids) {
  writeJSON(key(user, "saved"), ids);
}
export function profileErrors(p) {
  const errors = {};
  if (!p.name.trim()) errors.name = "Nhập họ và tên.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
    errors.email = "Email chưa hợp lệ.";
  if (!/^\+?[\d\s().-]{9,18}$/.test(p.phone.trim()))
    errors.phone = "Nhập số điện thoại hợp lệ (9–18 ký tự).";
  if (p.portfolio && !safeUrl(p.portfolio))
    errors.portfolio = "Liên kết phải bắt đầu bằng http:// hoặc https://.";
  return errors;
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function deadlineDate(value) {
  if (!value) return null;
  const parts = String(value).split("/");
  const date =
    parts.length === 3
      ? new Date(+parts[2], +parts[1] - 1, +parts[0], 23, 59, 59)
      : new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function isJobOpen(job) {
  const deadline = deadlineDate(job?.deadline);
  return Boolean(
    job && job.status === "Đang tuyển" && (!deadline || deadline >= new Date()),
  );
}
export function getJobs() {
  return mockStore.getJobs();
}
export function getPublicJobs() {
  return getJobs().filter(
    (j) => ["Đang tuyển", "Tạm dừng", "Đã đóng"].includes(j.status) && !j.rejectReason,
  );
}
export function getApplications(user) {
  return mockStore
    .getApplications()
    .filter((app) => app.ownerEmail === normalizeEmail(user?.email));
}
export function getInterviews(user) {
  const ids = new Set(getApplications(user).map((a) => a.candidateId));
  return mockStore.getInterviews().filter((i) => ids.has(i.candidateId));
}
export function alreadyApplied(user, jobId) {
  return getApplications(user).some((a) => String(a.jobId) === String(jobId));
}
export function apply(user, jobId, profile, coverLetter) {
  if (user?.role !== "candidate")
    throw new Error("Hãy đăng nhập với vai trò ứng viên.");
  const job = getJobs().find((j) => String(j.id) === String(jobId));
  if (!isJobOpen(job))
    throw new Error("Tin đã hết hạn hoặc không còn nhận hồ sơ.");
  if (alreadyApplied(user, jobId))
    throw new Error("Bạn đã ứng tuyển công việc này.");
  if (Object.keys(profileErrors(profile)).length)
    throw new Error("Kiểm tra lại thông tin liên hệ.");
  if (!profile.cv) throw new Error("Hãy chọn CV trước khi ứng tuyển.");
  const apps = mockStore.getApplications();
  const candidates = mockStore.getCandidates();
  const id =
    Math.max(Date.now(), ...candidates.map((c) => Number(c.id) || 0)) + 1;
  const now = new Date().toISOString();
  const application = {
    id: crypto.randomUUID(),
    candidateId: id,
    ownerEmail: normalizeEmail(user.email),
    candidateName: profile.name.trim(),
    candidateEmail: profile.email.trim(),
    candidatePhone: profile.phone.trim(),
    jobId: job.id,
    title: job.title,
    companyId: job.companyId,
    company: job.company,
    stage: "Mới",
    step: 1,
    statusBadge: "is-neutral",
    date: new Date().toLocaleDateString("vi-VN"),
    createdAt: now,
    history: [{ stage: "Mới", at: now }],
    coverLetter: coverLetter.trim(),
    cv: { ...profile.cv },
    profileSnapshot: { ...profile },
  };
  const candidate = {
    id,
    userId: normalizeEmail(user.email),
    ownerEmail: normalizeEmail(user.email),
    coverLetter: coverLetter.trim(),
    portfolio: profile.portfolio,
    applicationId: application.id,
    name: profile.name.trim(),
    initials: initials(profile.name),
    email: profile.email.trim(),
    phone: profile.phone.trim(),
    role: profile.role || job.title,
    experience: profile.experience,
    location: profile.location,
    education: profile.education,
    bio: profile.bio,
    skills: profile.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    workHistory: profile.workHistory
      ? [{ period: "", role: profile.role, desc: profile.workHistory }]
      : [],
    appliedJobId: job.id,
    appliedJobTitle: job.title,
    companyId: job.companyId,
    companyName: job.company,
    stage: "Mới",
    appliedDate: application.date,
    match: 0,
    cv: { ...profile.cv },
    statusBadge: "is-neutral",
  };
  // Ba khóa ghi cùng một lượt, hoàn tác nếu quota thất bại; phát sự kiện sau khi hoàn tất.
  const changes = {
    matchajob_store_applications: [application, ...apps],
    matchajob_store_candidates: [...candidates, candidate],
    matchajob_store_jobs: getJobs().map((j) =>
      j.id === job.id ? { ...j, applicants: (j.applicants || 0) + 1 } : j,
    ),
  };
  const old = Object.fromEntries(
    Object.keys(changes).map((k) => [k, localStorage.getItem(k)]),
  );
  try {
    Object.entries(changes).forEach(([k, v]) =>
      localStorage.setItem(k, JSON.stringify(v)),
    );
  } catch {
    Object.entries(old).forEach(([k, v]) => {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    });
    throw new Error("Không đủ bộ nhớ để lưu đơn. Vui lòng thử lại.");
  }
  window.dispatchEvent(new Event("matchajob:store-changed"));
  return application;
}
export function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "UV"
  );
}
export function completeness(profile) {
  const fields = [
    "name",
    "email",
    "phone",
    "role",
    "location",
    "skills",
    "education",
    "bio",
    "cv",
  ];
  return Math.round(
    (fields.filter((k) => Boolean(profile[k])).length / fields.length) * 100,
  );
}
// Lưu bytes CV bằng IndexedDB, không nhét PDF/base64 vào localStorage.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("matchajob-candidate-files", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Trình duyệt không cho phép lưu CV."));
  });
}
export async function saveCV(user, file) {
  if (!file || !/\.pdf$/i.test(file.name)) throw new Error("Chỉ nhận tệp PDF.");
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    throw new Error("CV cần có nội dung và không quá 5 MB.");
  const signature = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (signature !== "%PDF-")
    throw new Error("Nội dung tệp không phải PDF hợp lệ.");
  const metadata = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
  const db = await openDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put({
        ...metadata,
        ownerEmail: normalizeEmail(user.email),
        file,
      });
      tx.oncomplete = resolve;
      tx.onerror = () =>
        reject(
          new Error("Không lưu được CV. Hãy kiểm tra dung lượng trình duyệt."),
        );
      tx.onabort = tx.onerror;
    });
  } finally {
    db.close();
  }
  return metadata;
}
export async function readCV(user, cv) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("files").objectStore("files").get(cv.id);
      r.onsuccess = () => {
        const record = r.result;
        if (!record || record.ownerEmail !== normalizeEmail(user.email))
          reject(
            new Error(
              "Không tìm thấy tệp trên trình duyệt này. Hãy chọn lại CV.",
            ),
          );
        else resolve(record.file);
      };
      r.onerror = () => reject(new Error("Không đọc được CV."));
    });
  } finally {
    db.close();
  }
}
export async function downloadCV(user, cv) {
  const file = await readCV(user, cv);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = cv.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Candidate responses use the existing shared records; IDs always come from owned applications.
export function withdrawApplication(user, id) {
  const app = getApplications(user).find(a => a.id === id);
  if (!app || ["Đã rút", "Không phù hợp", "Đã từ chối", "Đề nghị"].includes(app.stage))
    throw new Error("Đơn này không thể rút ở trạng thái hiện tại.");
  mockStore.updateCandidateStage(app.candidateId, "Đã rút");
  getInterviews(user).filter(i => i.candidateId === app.candidateId && !["Hoàn tất", "Đã hủy"].includes(i.status)).forEach(i => mockStore.cancelInterview(i.id));
}
export function respondInterview(user, id, response, note = "") {
  const iv = getInterviews(user).find(i => i.id === id);
  if (!iv || ["Đã hủy", "Hoàn tất"].includes(iv.status)) throw new Error("Lịch hẹn không còn nhận phản hồi.");
  if (!["Đã xác nhận", "Đề nghị đổi lịch", "Ứng viên từ chối"].includes(response)) throw new Error("Phản hồi không hợp lệ.");
  if (response !== "Đã xác nhận" && !note.trim()) throw new Error("Hãy ghi lý do hoặc thời gian bạn đề xuất.");
  mockStore.updateInterview(id, { status: response, candidateResponse: response, candidateNote: note.trim().slice(0,1000), respondedAt: new Date().toISOString() });
}
export async function downloadCandidateCV(candidate) {
  if (!candidate?.cv || !candidate.ownerEmail) throw new Error("Hồ sơ này chưa có tệp CV được tải lên.");
  return downloadCV({email: candidate.ownerEmail}, candidate.cv);
}
export function notifications(user) {
  const apps = getApplications(user);
  const items = apps.flatMap(a => (a.history || [{stage:a.stage,at:a.createdAt}]).map((h,i) => ({
    id: `app-${a.id}-${i}`, title: `${a.title}: ${h.stage === "Mới" ? "Đã nhận hồ sơ" : h.stage}`,
    text: a.company, at:h.at, to:"/candidate/applications"
  })));
  getInterviews(user).forEach(iv => items.push({id:`iv-${iv.id}-${iv.updatedAt || iv.createdAt || iv.status}`,title:`Lịch phỏng vấn: ${iv.status}`,text:`${iv.role} · ${iv.date} · ${iv.time}`,at:iv.updatedAt || iv.createdAt,to:"/candidate/interviews"}));
  return items.sort((a,b) => String(b.at || "").localeCompare(String(a.at || "")));
}
export function readNotifications(user) { return readJSON(key(user,"read-notifications"),[]); }
export function markNotificationsRead(user, ids) { writeJSON(key(user,"read-notifications"),ids); }
