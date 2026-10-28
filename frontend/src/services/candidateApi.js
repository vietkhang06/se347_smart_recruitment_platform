import { httpClient } from "./httpClient";

const cvPath = id => `/v1/candidates/${encodeURIComponent(id)}/cv`;
export const STAGE_LABELS = { new: "Đã gửi", screening: "Sàng lọc", testing: "Bài kiểm tra", interview: "Phỏng vấn", offer: "Đề nghị", hired: "Đã tuyển", rejected: "Không phù hợp" };
export const stageLabel = stage => STAGE_LABELS[String(stage).toLowerCase()] || stage || "Chưa cập nhật";
export const candidateApi = {
  cvs: (candidateId, options) => httpClient.get(cvPath(candidateId), options),
  async upload(candidateId, file) {
    if (!file || !/\.(pdf|docx)$/i.test(file.name)) throw new Error("Chọn tệp PDF hoặc DOCX.");
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Tệp phải có nội dung và không vượt quá 10 MB.");
    const body = new FormData(); body.append("file", file);
    return httpClient.post(cvPath(candidateId), body, { timeout: 60000 });
  },
  activate: (candidateId, id) => httpClient.put(`${cvPath(candidateId)}/${encodeURIComponent(id)}/active`),
  async download(candidateId, cv) {
    const blob = await httpClient.get(`${cvPath(candidateId)}/${encodeURIComponent(cv.id)}/download`, { responseType: "blob", timeout: 60000 });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = cv.file_name || "CV";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  apply: (jobId, cvVersionId, coverLetter) => httpClient.post("/v1/applications", { jobId, cvVersionId, coverLetter: coverLetter.trim() }),
  applications({ page = 0, stage = "" } = {}, options) {
    const query = new URLSearchParams({ page: String(page), size: "10" });
    if (stage) query.set("stage", stage);
    return httpClient.get(`/v1/applications?${query}`, options);
  },
  detail: (id, options) => httpClient.get(`/v1/applications/${encodeURIComponent(id)}`, options),
  history: (id, options) => httpClient.get(`/v1/applications/${encodeURIComponent(id)}/history`, options)
};