import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
vi.mock("../services/api/apiCvService", async original => ({ ...await original(), apiCvService: { job: vi.fn(), get: vi.fn() } }));
import { apiCvService } from "../services/api/apiCvService";
import { HttpError } from "../services/httpClient";
import { useCvProcessing } from "../hooks/useCvProcessing";
const version = { id: "cv", jobId: "job", status: "uploaded" };
const options = { candidateId: "candidate", version };
const tick = async ms => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); localStorage.setItem("matchajob_access_token", "synthetic"); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("queued -> processing -> completed and no polling after completion", async () => {
  apiCvService.job.mockResolvedValueOnce({ status: "PENDING" }).mockResolvedValueOnce({ status: "PROCESSING" })
    .mockResolvedValue({ status: "COMPLETED" });
  apiCvService.get.mockResolvedValue({ ...version, status: "extracted" });
  const onUpdate = vi.fn();
  const { result } = renderHook(() => useCvProcessing({ ...options, onUpdate }));
  await tick(0); expect(result.current.phase).toBe("queued");
  await tick(2000); expect(result.current.phase).toBe("processing");
  await tick(2000); expect(result.current.phase).toBe("completed");
  await tick(20000); expect(apiCvService.job).toHaveBeenCalledTimes(3);
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "extracted" }));
});
it("failed is terminal; manual check reads status, never reuploads", async () => {
  apiCvService.job.mockResolvedValue({ status: "FAILED" });
  apiCvService.get.mockResolvedValue({ ...version, status: "failed" });
  const { result } = renderHook(() => useCvProcessing(options));
  await tick(0); expect(result.current.phase).toBe("failed");
  await tick(20000); expect(apiCvService.job).toHaveBeenCalledTimes(1);
  act(() => result.current.refresh()); await tick(0);
  expect(apiCvService.job).toHaveBeenCalledTimes(2);
});
it("overall polling timeout aborts the outstanding request without labelling the job failed", async () => {
  apiCvService.job.mockImplementation(() => new Promise(() => {}));
  const { result } = renderHook(() => useCvProcessing({ ...options, timeoutMs: 1000 }));
  await tick(1000); expect(result.current.phase).toBe("timeout");
  expect(apiCvService.job.mock.calls[0][2].signal.aborted).toBe(true);
});
it.each([401, 403, 404])("HTTP %s stops polling immediately", async status => {
  apiCvService.job.mockRejectedValue(new HttpError("Denied", status));
  const { result } = renderHook(() => useCvProcessing(options));
  await tick(10000); expect(result.current.phase).toBe("error");
  expect(apiCvService.job).toHaveBeenCalledTimes(1);
});
it("transient failures retry at most three consecutive times", async () => {
  apiCvService.job.mockRejectedValue(new HttpError("Unavailable", 0));
  const { result } = renderHook(() => useCvProcessing(options));
  await tick(10000); expect(result.current.phase).toBe("error");
  expect(apiCvService.job).toHaveBeenCalledTimes(3);
});
it("unmount aborts requests and clears timers", async () => {
  apiCvService.job.mockResolvedValue({ status: "PROCESSING" });
  const { unmount } = renderHook(() => useCvProcessing(options));
  await tick(0); const signal = apiCvService.job.mock.calls[0][2].signal;
  unmount(); await tick(10000);
  expect(signal.aborted).toBe(true); expect(apiCvService.job).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("slow responses cannot create overlapping polling requests", async () => {
  apiCvService.job.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(() => useCvProcessing(options));
  await tick(10000); expect(apiCvService.job).toHaveBeenCalledTimes(1);
  unmount();
});
it("a stale response from the previous version cannot change the new version", async () => {
  let resolveOld;
  apiCvService.job.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValue({ status: "PROCESSING" });
  const { result, rerender } = renderHook(({ cv }) => useCvProcessing({ ...options, version: cv }), { initialProps: { cv: version } });
  rerender({ cv: { ...version, id: "new-cv", jobId: "new-job" } }); await tick(0);
  await act(async () => resolveOld({ status: "COMPLETED" }));
  expect(result.current.phase).toBe("processing"); expect(apiCvService.get).not.toHaveBeenCalled();
});
it("legacy metadata without a job uses bounded metadata polling", async () => {
  apiCvService.get.mockResolvedValue({ ...version, status: "extracted" });
  const { result } = renderHook(() => useCvProcessing({ ...options, version: { ...version, jobId: null } }));
  await tick(0); expect(result.current.phase).toBe("completed"); expect(apiCvService.job).not.toHaveBeenCalled();
});
