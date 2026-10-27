// HTTP/Compose integration smoke, not a browser E2E or external-LLM quality evaluation.
// Creates synthetic accounts/CVs only; never resets a database or deletes a volume.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compose = resolve(root, "scripts/compose.cv-integration.yaml");
// Intentionally pinned to this disposable stack: never redirect synthetic writes to a production URL.
const api = "http://localhost:18082/api";
const frontend = "http://localhost:15173";
const output = resolve(root, "backend/target/cv-integration-smoke.json");
const evidence = { startedAt: new Date().toISOString(), provider: "deterministic (real Worker HTTP, no external LLM)",
  scope: "HTTP + Compose network/storage; UI covered separately by component tests", checks: [] };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const docker = (...args) => execFileSync("docker", ["compose", "-f", compose, ...args], { cwd: root, timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
function record(name, detail) { evidence.checks.push({ name, result: "PASS", detail }); console.log("PASS:", name); }
async function request(path, { token, body, expected = 200, method = "GET", binary = false } = {}) {
  const headers = { Origin: frontend };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
  const response = await fetch(api + path, { method, headers, body, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}, expected ${expected}`);
  assert.equal(response.headers.get("access-control-allow-origin"), frontend, "Browser CORS origin must be allowed");
  const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.json();
  // Intentionally do not persist login payloads, JWTs, passwords or CV content.
  evidence.checks.push({ name: `${method} ${path}`, result: "PASS", httpStatus: response.status,
    ...(binary ? { bytes: data.length, sha256: sha(data) } : {}) });
  return { data, response };
}
async function account() {
  const email = `cv_smoke_${randomUUID()}@example.invalid`, password = `CVsmoke!${randomUUID()}`;
  await request("/v1/auth/register", { method: "POST", expected: 201, body: { email, password, role: "CANDIDATE" } });
  const { data: login } = await request("/v1/auth/login", { method: "POST", body: { email, password } });
  assert.ok(login.access_token);
  const { data: profile } = await request("/v1/candidates/profile", { token: login.access_token });
  assert.ok(profile.id && profile.id !== profile.user_id, "Use candidate profile UUID, not user UUID");
  return { token: login.access_token, candidateId: profile.id };
}
function pdf(text) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let value = "%PDF-1.4\n"; const offsets = [];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(value)); value += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(value);
  value += "xref\n0 6\n0000000000 65535 f \n" + offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  return Buffer.from(value + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "ascii");
}
async function upload(owner, bytes, name, type, expected = 202) {
  const body = new FormData(); body.append("file", new Blob([bytes], { type }), name);
  const { data } = await request(`/v1/candidates/${owner.candidateId}/cv`, { token: owner.token, method: "POST", body, expected });
  return data;
}
async function processed(owner, upload, expected = "COMPLETED") {
  const observed = new Set();
  for (let attempt = 0; attempt < 90; attempt++) {
    const { data: job } = await request(`/v1/processing-jobs/${upload.processing_job_id}`, { token: owner.token });
    assert.equal(job.entityId, upload.cv_version_id); assert.equal(job.jobType, "CV_TEXT_EXTRACTION");
    assert.equal(job.leaseToken, undefined); observed.add(job.status);
    if (["COMPLETED", "FAILED"].includes(job.status)) {
      assert.equal(job.status, expected);
      const { data: metadata } = await request(`/v1/candidates/${owner.candidateId}/cv/${upload.cv_version_id}`, { token: owner.token });
      assert.equal(metadata.status, expected === "COMPLETED" ? "extracted" : "failed");
      assert.equal(metadata.processing_job_id, upload.processing_job_id);
      assert.equal(metadata.file_path, undefined);
      record(`Worker terminal status ${expected}`, { cvId: metadata.id, observed: [...observed] });
      return;
    }
    await pause(1000);
  }
  throw new Error("Timed out waiting for CV processing; no successful Worker outcome was verified.");
}
async function download(owner, cvId, expectedBytes) {
  const { data, response } = await request(`/v1/candidates/${owner.candidateId}/cv/${cvId}/download?disposition=inline`,
    { token: owner.token, binary: true });
  assert.equal(sha(data), sha(expectedBytes));
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("content-disposition"), /inline/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
async function ready() {
  for (let attempt = 0; attempt < 90; attempt++) {
    try { const response = await fetch(api + "/actuator/health/readiness", { signal: AbortSignal.timeout(3000) });
      if (response.ok && (await response.json()).status === "UP") return;
    } catch { /* Keep the bounded readiness wait distinct from a successful request. */ }
    await pause(1000);
  }
  throw new Error("Backend never became ready.");
}
if (process.argv.includes("--fixtures-only")) {
  await mkdir(dirname(output), { recursive: true });
  for (const name of ["first", "second"]) {
    const path = resolve(dirname(output), `cv-ui-${name}.pdf`);
    await writeFile(path, pdf(`SE347 Synthetic UI CV ${name} Java PostgreSQL developer with 3 years experience`));
    console.log(path);
  }
  process.exit(0);
}
try {
  assert.equal(docker("exec", "-T", "frontend", "node", "-e", "process.stdout.write(process.env.VITE_DATA_SOURCE)").toString(), "api");
  const network = docker("exec", "-T", "frontend", "node", "-e",
    "fetch('http://backend:8080/api/actuator/health/readiness').then(async r=>{if(!r.ok)process.exit(1);process.stdout.write(await r.text())}).catch(()=>process.exit(1))").toString();
  assert.equal(JSON.parse(network).status, "UP");
  const worker = JSON.parse(docker("exec", "-T", "backend", "wget", "-qO-", "http://ai-worker:8000/health/ready").toString());
  assert.equal(worker.status, "ready");
  record("Docker DNS: frontend -> backend -> ai-worker", { backend: "backend:8080", worker: "ai-worker:8000" });
  const page = await fetch(frontend); assert.equal(page.status, 200); assert.match(await page.text(), /root/);
  const preflight = await fetch(api + "/v1/candidates/profile", { method: "OPTIONS", headers: {
    Origin: frontend, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
  assert.ok(preflight.ok); assert.equal(preflight.headers.get("access-control-allow-origin"), frontend);
  record("Frontend HTTP and browser JWT CORS preflight", { frontend, api });

  const owner = await account();
  const firstBytes = pdf("SE347 Synthetic Java React PostgreSQL developer with 3 years experience");
  const secondBytes = pdf("SE347 Synthetic Java Spring Boot SQL developer with 4 years experience");
  const first = await upload(owner, firstBytes, "synthetic-first.pdf", "application/pdf");
  const second = await upload(owner, secondBytes, "synthetic-second.pdf", "application/pdf");
  assert.notEqual(first.cv_version_id, second.cv_version_id);
  await processed(owner, first); await processed(owner, second);
  const { data: versions } = await request(`/v1/candidates/${owner.candidateId}/cv`, { token: owner.token });
  assert.equal(versions.length, 2); assert.equal(versions.filter(cv => cv.is_active).length, 1);
  assert.equal(versions.find(cv => cv.id === first.cv_version_id).processing_job_id, first.processing_job_id);
  await request(`/v1/candidates/${owner.candidateId}/cv/${first.cv_version_id}/active`, { token: owner.token, method: "PUT" });
  const { data: active } = await request(`/v1/candidates/${owner.candidateId}/cv/active`, { token: owner.token });
  assert.equal(active.id, first.cv_version_id);
  await download(owner, first.cv_version_id, firstBytes); await download(owner, second.cv_version_id, secondBytes);
  record("Distinct versions, reload job IDs, active selection and checksums", { candidateId: owner.candidateId });

  const docx = docker("exec", "-T", "ai-worker", "python", "-c",
    "from docx import Document; import io,sys; d=Document(); d.add_paragraph('SE347 Synthetic Java developer, 3 years experience'); b=io.BytesIO(); d.save(b); sys.stdout.buffer.write(b.getvalue())");
  const word = await upload(owner, docx, "synthetic.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  await processed(owner, word); await download(owner, word.cv_version_id, docx);
  const corruptBytes = Buffer.from("%PDF-1.4 deliberately malformed synthetic PDF");
  const corrupt = await upload(owner, corruptBytes, "synthetic-corrupt.pdf", "application/pdf");
  await processed(owner, corrupt, "FAILED"); await download(owner, corrupt.cv_version_id, corruptBytes);
  record("Real Worker PDF/DOCX success and malformed-PDF failure", { provider: evidence.provider });

  const outsider = await account();
  await request(`/v1/candidates/${owner.candidateId}/cv/${first.cv_version_id}/download`, { token: outsider.token, expected: 403 });
  await request(`/v1/candidates/${owner.candidateId}/cv/${first.cv_version_id}/download`, { expected: 401 });
  await request(`/v1/candidates/${owner.candidateId}/cv/${randomUUID()}`, { token: owner.token, expected: 404 });
  await upload(owner, Buffer.from("fake docx"), "fake.docx", "application/octet-stream", 400);
  await upload(owner, firstBytes, "mime.pdf", "text/plain", 400);
  await upload(owner, Buffer.alloc(10 * 1024 * 1024 + 1), "oversized.pdf", "application/pdf", 413);
  record("401/403/404, MIME, DOCX structure and 10 MiB limit", {});

  if (process.argv.includes("--recreate")) {
    docker("up", "-d", "--no-build", "--no-deps", "--force-recreate", "backend");
    await ready();
    await download(owner, first.cv_version_id, firstBytes); await download(owner, second.cv_version_id, secondBytes);
    record("CV volume survives Backend recreation", { checkedVersions: 2 });
  }
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL"; evidence.error = error.message; process.exitCode = 1;
  console.error("FAIL:", error.message);
} finally {
  evidence.completedAt = new Date().toISOString();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2));
  console.log("Evidence (no credentials):", output);
}
