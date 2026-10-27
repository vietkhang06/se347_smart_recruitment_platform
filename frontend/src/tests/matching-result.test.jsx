import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("../services/dataMode", () => ({ IS_API: true }));
vi.mock("../services/api/apiApplicationService", () => ({ apiApplicationService: { getMatchingResult: vi.fn(), triggerMatchingEvaluation: vi.fn() } }));
import MatchingResultPanel from "../components/matching/MatchingResultPanel";
import { apiApplicationService as api } from "../services/api/apiApplicationService";
import completed from "../fixtures/matching-result.fixture.json";
import pending from "../fixtures/matching-result-pending.fixture.json";
const id = pending.applicationId;
beforeEach(() => { api.getMatchingResult.mockReset(); api.triggerMatchingEvaluation.mockReset(); });
afterEach(cleanup);
it.each(["PENDING", "PROCESSING", "FAILED"])("renders %s without invented scores", async status => {
  api.getMatchingResult.mockResolvedValue({ ...pending, status, retryable: status === "PENDING" });
  render(<MatchingResultPanel applicationId={id} />);
  await screen.findByText(/Điểm tổng: —/);
  if (status !== "PENDING") expect(screen.queryByRole("button", { name: "Chạy đối sánh" })).toBeNull();
});
it("runs POST then displays all real response fields", async () => {
  api.getMatchingResult.mockResolvedValue(pending);
  api.triggerMatchingEvaluation.mockResolvedValue(completed);
  const onCompleted = vi.fn();
  render(<MatchingResultPanel applicationId={id} onCompleted={onCompleted} />);
  fireEvent.click(await screen.findByRole("button", { name: "Chạy đối sánh" }));
  await screen.findByText(`${completed.overallScore}/100`);
  expect(screen.getByText(completed.explanation)).toBeTruthy();
  expect(onCompleted).toHaveBeenCalledWith(completed);
});
it("shows HTTP error and reloads instead of a fixture score", async () => {
  api.getMatchingResult.mockRejectedValueOnce(new Error("Không kết nối được máy chủ")).mockResolvedValue(pending);
  render(<MatchingResultPanel applicationId={id} />);
  await screen.findByRole("alert");
  expect(screen.queryByText(`${completed.overallScore}/100`)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tải lại trạng thái" }));
  await screen.findByRole("button", { name: "Chạy đối sánh" });
});
it("blocks another POST until status is reloaded after an uncertain POST", async () => {
  api.getMatchingResult.mockResolvedValue(pending);
  api.triggerMatchingEvaluation.mockRejectedValue(new Error("Worker unavailable"));
  render(<MatchingResultPanel applicationId={id} />);
  fireEvent.click(await screen.findByRole("button", { name: "Chạy đối sánh" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "Chạy đối sánh" })).toBeNull();
  expect(api.triggerMatchingEvaluation).toHaveBeenCalledTimes(1);
});
it("does not apply a late response to the next application", async () => {
  let resolveOld;
  api.getMatchingResult.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(pending);
  const view = render(<MatchingResultPanel applicationId="old-id" />);
  view.rerender(<MatchingResultPanel applicationId={id} />);
  await screen.findByRole("button", { name: "Chạy đối sánh" });
  resolveOld(completed);
  await waitFor(() => expect(screen.queryByText(`${completed.overallScore}/100`)).toBeNull());
});
it("respects retryAfter backoff", async () => {
  api.getMatchingResult.mockResolvedValue({ ...pending, retryAfter: new Date(Date.now() + 60000).toISOString() });
  render(<MatchingResultPanel applicationId={id} />);
  const button = await screen.findByRole("button", { name: /Thử lại sau/ });
  expect(button.disabled).toBe(true);
});
