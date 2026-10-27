import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
import { apiCvService, normalizeCv, CvContractError } from "../services/api/apiCvService";
import { httpClient } from "../services/httpClient";
const candidate = "11111111-1111-4111-8111-111111111111";
const cv = "22222222-2222-4222-8222-222222222222";
const job = "33333333-3333-4333-8333-333333333333";
const metadata = { id: cv, candidate_id: candidate, file_name: "cv.pdf", file_size_bytes: 8,
  mime_type: "application/pdf", status: "uploaded", is_active: true, processing_job_id: job };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/problem+json" } });
beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); localStorage.setItem("matchajob_access_token", "synthetic-jwt"); });

it("multipart upload uses candidate profile ID, Bearer JWT and browser boundary", async () => {
  fetch.mockResolvedValue(json({ ...metadata, id: undefined, cv_version_id: cv }, 202));
  const file = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });
  const result = await apiCvService.upload(candidate, file);
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe(`http://localhost:8081/api/v1/candidates/${candidate}/cv`);
  expect(request.headers.get("Authorization")).toBe("Bearer synthetic-jwt");
  expect(request.headers.has("Content-Type")).toBe(false);
  expect(request.body.get("file").name).toBe("cv.pdf");
  expect(result).toMatchObject({ id: cv, jobId: job, active: true });
});
it.each([
  [new File([], "empty.pdf"), "1 byte"],
  [new File(["x"], "legacy.doc"), "không hỗ trợ DOC"],
  [new File(["x"], "wrong.pdf", { type: "text/plain" }), "không khớp"],
  [{ name: "large.pdf", size: 10 * 1024 * 1024 + 1 }, "10 MiB"]
])("invalid file is rejected without a network upload", async (file, message) => {
  await expect(apiCvService.upload(candidate, file)).rejects.toThrow(message);
  expect(fetch).not.toHaveBeenCalled();
});
it("list metadata preserves active selection and job ID after reload", async () => {
  fetch.mockResolvedValue(json([metadata]));
  expect(await apiCvService.list(candidate)).toEqual([expect.objectContaining({ id: cv, jobId: job, active: true })]);
});
it("download uses authenticated binary transport, not window.open on an object key", async () => {
  fetch.mockResolvedValue(new Response("%PDF-1.4", { headers: { "content-type": "application/pdf" } }));
  const blob = await apiCvService.download(candidate, cv, true);
  expect(blob.type).toBe("application/pdf");
  expect(fetch.mock.calls[0][0]).toContain(`/${cv}/download?disposition=inline`);
  expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer synthetic-jwt");
});
it.each([401, 403, 404, 413, 500])("binary error %s remains Problem Details, never a CV blob", async status => {
  fetch.mockResolvedValue(json({ detail: "Synthetic API error" }, status));
  await expect(apiCvService.download(candidate, cv)).rejects.toMatchObject({ status, message: "Synthetic API error" });
});
it("activation uses the existing route with no made-up JSON payload", async () => {
  fetch.mockResolvedValue(json(metadata));
  await apiCvService.activate(candidate, cv);
  expect(fetch.mock.calls[0][0]).toContain(`/${cv}/active`);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: "PUT", body: undefined });
});
it("bad IDs, wrong candidate and unknown status fail closed", async () => {
  await expect(apiCvService.list("user-id-or-object-key")).rejects.toBeInstanceOf(CvContractError);
  expect(() => normalizeCv({ ...metadata, candidate_id: cv }, candidate)).toThrow(CvContractError);
  expect(() => normalizeCv({ ...metadata, status: "done" }, candidate)).toThrow(CvContractError);
  expect(fetch).not.toHaveBeenCalled();
});
it("job response must belong to this CV and extraction task", async () => {
  fetch.mockResolvedValue(json({ id: job, entityId: cv, entityType: "application", jobType: "APPLICATION_MATCHING", status: "COMPLETED" }));
  await expect(apiCvService.job(job, cv)).rejects.toBeInstanceOf(CvContractError);
});
it("pre-aborted requests do not call fetch", async () => {
  const controller = new AbortController(); controller.abort();
  await expect(httpClient.get("/v1/candidates/profile", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  expect(fetch).not.toHaveBeenCalled();
});
