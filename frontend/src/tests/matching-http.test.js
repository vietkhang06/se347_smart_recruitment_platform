import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiApplicationService } from "../services/api/apiApplicationService";
import fixture from "../fixtures/matching-result.fixture.json";
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());
it("sends the canonical path, Bearer token, and no client CV/JD body", async () => {
  localStorage.setItem("matchajob_access_token", "test-token");
  fetch.mockResolvedValue(json(fixture));
  await apiApplicationService.triggerMatchingEvaluation(fixture.applicationId);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toContain(`/api/v1/applications/${fixture.applicationId}/match`);
  expect(options.headers.get("Authorization")).toBe("Bearer test-token");
  expect(options.method).toBe("POST"); expect(options.body).toBeUndefined();
});
it.each([401, 403, 404, 409, 502])("preserves HTTP %s without fixture fallback", async status => {
  fetch.mockResolvedValue(json({ detail: "backend error", code: "MATCHING_BACKOFF", retryable: true }, status));
  await expect(apiApplicationService.getMatchingResult(fixture.applicationId)).rejects.toMatchObject({ status, code: "MATCHING_BACKOFF" });
});
it("network failure never becomes a completed fixture", async () => {
  fetch.mockRejectedValue(new TypeError("offline"));
  await expect(apiApplicationService.getMatchingResult(fixture.applicationId)).rejects.toMatchObject({ status: 0 });
});
it("employer list failure is an error, not mock candidates", async () => {
  fetch.mockResolvedValue(json({ detail: "Forbidden" }, 403));
  await expect(apiApplicationService.getApplications()).rejects.toMatchObject({ status: 403 });
});
it("serializes list filters into query parameters", async () => {
  fetch.mockResolvedValue(json([]));
  await apiApplicationService.getApplications(undefined, { jobId: "real-job", stage: "Sàng lọc", search: "Java & Spring" });
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.searchParams.get("jobId")).toBe("real-job");
  expect(url.searchParams.get("stage")).toBe("screening");
  expect(url.searchParams.get("search")).toBe("Java & Spring");
});
