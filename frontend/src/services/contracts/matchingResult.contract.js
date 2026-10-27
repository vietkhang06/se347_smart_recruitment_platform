export const MATCHING_STATUSES = ["NOT_STARTED", "PENDING", "PROCESSING", "COMPLETED", "FAILED"];
export class MatchingContractError extends Error {
  constructor(field) {
    super(`Response matching sai contract tại ${field}. Hãy kiểm tra phiên bản Frontend/Backend/Worker.`);
    this.name = "MatchingContractError";
    this.code = "MATCHING_CONTRACT_ERROR";
  }
}
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const score = value => Number.isInteger(value) && value >= 0 && value <= 100;
const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export function validateMatchingResult(value, applicationId) {
  const check = (ok, field) => { if (!ok) throw new MatchingContractError(field); };
  check(object(value), "response");
  const required = ["applicationId", "jobId", "cvVersionId", "status", "overallScore", "skillsScore", "experienceScore", "criteriaScores", "matchedSkills", "missingSkills", "breakdown", "explanation", "processingJobId", "evaluatedAt", "message", "retryable", "retryAfter", "attemptCount", "maxAttempts"];
  check(Object.keys(value).every(field => required.includes(field)), "unexpected field");
  required.forEach(field => check(Object.hasOwn(value, field), field));
  check(uuid(value.applicationId) && value.applicationId.toLowerCase() === String(applicationId).toLowerCase(), "applicationId");
  check(uuid(value.jobId), "jobId");
  check(value.cvVersionId === null || uuid(value.cvVersionId), "cvVersionId");
  check(value.processingJobId === null || uuid(value.processingJobId), "processingJobId");
  check(MATCHING_STATUSES.includes(value.status), "status");
  ["overallScore", "skillsScore", "experienceScore"].forEach(field => check(value[field] === null || score(value[field]), field));
  check(object(value.criteriaScores), "criteriaScores");
  Object.entries(value.criteriaScores).forEach(([key, val]) => check(score(val), `criteriaScores.${key}`));
  ["matchedSkills", "missingSkills"].forEach(field => check(Array.isArray(value[field]) && value[field].every(item => typeof item === "string" && item.trim().length > 0), field));
  check(object(value.breakdown), "breakdown");
  check(value.explanation === null || typeof value.explanation === "string", "explanation");
  check(value.evaluatedAt === null || date(value.evaluatedAt), "evaluatedAt");
  check(typeof value.message === "string", "message");
  check(typeof value.retryable === "boolean", "retryable");
  check(value.retryAfter === null || date(value.retryAfter), "retryAfter");
  check(value.attemptCount === null || (Number.isInteger(value.attemptCount) && value.attemptCount >= 0), "attemptCount");
  check(value.maxAttempts === null || (Number.isInteger(value.maxAttempts) && value.maxAttempts >= 1), "maxAttempts");
  check(value.attemptCount === null || value.maxAttempts === null || value.attemptCount <= value.maxAttempts, "attemptCount");
  if (value.status === "COMPLETED") {
    check(score(value.overallScore), "overallScore");
    check(uuid(value.cvVersionId), "cvVersionId");
    check(date(value.evaluatedAt), "evaluatedAt");
    check(value.retryable === false && value.retryAfter === null, "retryable");
  } else {
    ["overallScore", "skillsScore", "experienceScore", "evaluatedAt", "explanation"].forEach(field => check(value[field] === null, field));
    check(Object.keys(value.criteriaScores).length === 0 && Object.keys(value.breakdown).length === 0 && value.matchedSkills.length === 0 && value.missingSkills.length === 0, "pending result data");
  }
  if (["FAILED", "PROCESSING"].includes(value.status)) check(value.retryable === false, "retryable");
  return { ...value, source: "API" };
}
