import { httpClient } from "../httpClient";

export const CV_MAX_BYTES = 10 * 1024 * 1024;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CV_STATUSES = new Set(["uploaded", "extracted", "failed"]);
const JOB_STATUSES = new Set(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

export class CvContractError extends Error {
  constructor() { super("Dữ liệu CV từ máy chủ không đúng contract. Hãy báo lại nhóm phát triển."); this.name = "CvContractError"; }
}
function id(value) {
  if (!UUID.test(value || "")) throw new CvContractError();
  return value;
}
const route = candidateId => `/v1/candidates/${id(candidateId)}/cv`;

export function validateCvFile(file) {
  if (!file?.size || file.size > CV_MAX_BYTES) throw new Error("Chọn CV từ 1 byte đến 10 MiB.");
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  const expected = extension === "pdf" ? PDF : extension === "docx" ? DOCX : null;
  if (!expected) throw new Error("Chỉ chấp nhận PDF hoặc DOCX; không hỗ trợ DOC.");
  if (file.type && file.type !== "application/octet-stream" && file.type !== expected) {
    throw new Error("Loại nội dung không khớp đuôi tệp CV.");
  }
}

export function normalizeCv(data, candidateId, upload = false) {
  if (!data || data.candidate_id !== candidateId || !CV_STATUSES.has(data.status)
      || typeof data.is_active !== "boolean" || typeof data.file_name !== "string"
      || ![PDF, DOCX].includes(data.mime_type) || !Number.isInteger(data.file_size_bytes)
      || data.file_size_bytes < 1 || (data.processing_job_id != null && !UUID.test(data.processing_job_id))) {
    throw new CvContractError();
  }
  return { id: id(upload ? data.cv_version_id : data.id), candidateId,
    fileName: data.file_name, size: data.file_size_bytes, mimeType: data.mime_type,
    status: data.status, active: data.is_active, jobId: data.processing_job_id || null,
    createdAt: data.created_at || null, sha256: data.sha256_hash || null };
}

export const apiCvService = {
  async list(candidateId, options) {
    const data = await httpClient.get(route(candidateId), options);
    if (!Array.isArray(data)) throw new CvContractError();
    return data.map(item => normalizeCv(item, candidateId));
  },
  async get(candidateId, cvId, options) {
    const cv = normalizeCv(await httpClient.get(`${route(candidateId)}/${id(cvId)}`, options), candidateId);
    if (cv.id !== cvId) throw new CvContractError();
    return cv;
  },
  async upload(candidateId, file, options) {
    validateCvFile(file);
    const body = new FormData();
    body.append("file", file);
    const cv = normalizeCv(await httpClient.post(route(candidateId), body, { timeout: 60000, ...options }), candidateId, true);
    if (!cv.jobId) throw new CvContractError();
    return cv;
  },
  async activate(candidateId, cvId, options) {
    const cv = normalizeCv(await httpClient.put(`${route(candidateId)}/${id(cvId)}/active`, undefined, options), candidateId);
    if (cv.id !== cvId || !cv.active) throw new CvContractError();
    return cv;
  },
  async download(candidateId, cvId, preview = false, options) {
    const blob = await httpClient.get(`${route(candidateId)}/${id(cvId)}/download?disposition=${preview ? "inline" : "attachment"}`,
      { ...options, responseType: "blob", headers: { Accept: `${PDF}, ${DOCX}, application/problem+json` } });
    if (![PDF, DOCX].includes(blob.type.split(";")[0])) throw new CvContractError();
    return blob;
  },
  async job(jobId, cvId, options) {
    const job = await httpClient.get(`/v1/processing-jobs/${id(jobId)}`, options);
    if (job?.id !== jobId || job.entityId !== cvId || job.entityType !== "cv_version"
        || job.jobType !== "CV_TEXT_EXTRACTION" || !JOB_STATUSES.has(job.status)) throw new CvContractError();
    return job;
  }
};
