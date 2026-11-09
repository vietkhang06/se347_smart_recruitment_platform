// Run only against your local development backend. Creates new test records; never deletes existing data.
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const base = (process.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("This test only runs against a local backend.");
const filePath = process.argv[2];
if (!filePath || !/\.(pdf|docx)$/i.test(filePath)) throw new Error('Usage: node frontend/scripts/candidate-api-smoke.mjs "C:\\path\\test-cv.pdf"');
const bytes = await readFile(filePath);
if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("CV must be between 1 byte and 10 MB.");
const stamp = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `Test-${randomBytes(12).toString("hex")}!`;
async function request(path, { token, method = "GET", body, status = 200, binary = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
  const response = await fetch(base + path, { method, headers, body, signal: AbortSignal.timeout(60000) });
  if (response.status !== status) throw new Error(`${method} ${path}: expected ${status}, got ${response.status}: ${await response.text()}`);
  if (binary) return Buffer.from(await response.arrayBuffer());
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
async function account(role) {
  const email = `week4-${role.toLowerCase()}-${stamp}@example.com`;
  await request("/v1/auth/register", { method: "POST", body: { email, password, role }, status: 201 });
  const login = await request("/v1/auth/login", { method: "POST", body: { email, password } });
  assert.ok(login.access_token); return { email, token: login.access_token };
}
try {
  const hr = await account("EMPLOYER"), candidate = await account("CANDIDATE");
  const company = await request("/v1/companies", { token: hr.token, method: "POST", status: 201, body: { name: `Week 4 Test ${stamp}`, industry: "IT", size: "1-49", location: "Dong Nai" } });
  const deadline = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const job = await request("/v1/employer/jobs", { token: hr.token, method: "POST", status: 201, body: { companyId: company.id, title: `Frontend test ${stamp}`, level: "junior", workType: "full_time", location: "Dong Nai", salaryMode: "negotiable", description: "React frontend integration test", requirements: "React, JavaScript", status: "active", deadline } });
  assert.ok(job.id);
  const search = await request(`/v1/jobs?keyword=${encodeURIComponent(job.title)}&page=0&size=10`);
  assert.ok(search.content.some(item => item.id === job.id), "Created job must be public and searchable");
  await request(`/v1/jobs/${job.id}`, { token: candidate.token });
  const profile = await request("/v1/candidates/profile", { token: candidate.token });
  await request("/v1/candidates/profile", { token: candidate.token, method: "PATCH", body: { headline: "Frontend Developer", experience_years: 0 } });
  assert.equal((await request("/v1/candidates/profile", { token: candidate.token })).headline, "Frontend Developer");
  const form = new FormData(); form.append("file", new Blob([bytes], { type: /\.pdf$/i.test(filePath) ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), basename(filePath));
  const cv = await request(`/v1/candidates/${profile.id}/cv`, { token: candidate.token, method: "POST", body: form, status: 202 });
  const list = await request(`/v1/candidates/${profile.id}/cv`, { token: candidate.token });
  assert.ok(list.some(item => item.id === cv.cv_version_id));
  const download = await request(`/v1/candidates/${profile.id}/cv/${cv.cv_version_id}/download`, { token: candidate.token, binary: true });
  assert.ok(bytes.equals(download), "Downloaded CV must match original bytes");
  const payload = { jobId: job.id, cvVersionId: cv.cv_version_id, coverLetter: "Week 4 integration test" };
  const app = await request("/v1/applications", { token: candidate.token, method: "POST", body: payload, status: 201 });
  await request("/v1/applications", { token: candidate.token, method: "POST", body: payload, status: 409 });
  await request(`/v1/applications/${app.applicationId}/stage`, { token: hr.token, method: "PATCH", body: { toStage: "screening", reason: "Reviewed CV in week 4 test" } });
  const apps = await request("/v1/applications?page=0&size=10&stage=screening", { token: candidate.token });
  assert.ok(apps.items.some(item => item.applicationId === app.applicationId && item.stage === "screening"));
  const history = await request(`/v1/applications/${app.applicationId}/history`, { token: candidate.token });
  assert.ok(history.some(item => item.toStage === "screening"));
  console.log("PASS: register/login/profile/search/detail/CV upload+download/apply/duplicate/history/stage filter");
  console.log(`Test job for your existing candidate: ${job.id}`);
  console.log(`Test candidate email: ${candidate.email}\nTest employer email: ${hr.email}\nTest password (local only): ${password}`);
  console.log("Created test records remain available for browser checks. AI scoring is not asserted by this test.");
} catch (error) { console.error("FAIL:", error.message); process.exitCode = 1; }