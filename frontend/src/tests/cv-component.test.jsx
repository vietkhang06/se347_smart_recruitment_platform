import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
vi.mock("../services/api/apiCvService", () => ({ apiCvService: { list: vi.fn(), upload: vi.fn(), download: vi.fn(), activate: vi.fn(), job: vi.fn(), get: vi.fn() } }));
import { apiCvService } from "../services/api/apiCvService";
import ApiCandidateCV from "../components/candidate/ApiCandidateCV";
import ApiProfileEditor from "../components/candidate/ApiProfileEditor";
import { candidateProfileService } from "../services/profileService";
const a = { id: "a", candidateId: "candidate", fileName: "first.pdf", size: 8, mimeType: "application/pdf", status: "extracted", active: true, jobId: "job-a" };
const b = { ...a, id: "b", fileName: "second.pdf", active: false, jobId: "job-b" };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.setItem("matchajob_access_token", "synthetic");
  apiCvService.list.mockResolvedValue([a, b]);
  apiCvService.job.mockResolvedValue({ status: "FAILED" });
  apiCvService.get.mockResolvedValue({ ...b, status: "failed" });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:synthetic"), revokeObjectURL: vi.fn() }));
});
it("loads real versions and emits the backend active CV ID", async () => {
  const onChange = vi.fn(); render(<ApiCandidateCV candidateId="candidate" onChange={onChange} />);
  await screen.findByText("first.pdf");
  expect(apiCvService.list).toHaveBeenCalledWith("candidate", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(onChange).toHaveBeenCalledWith({ cvId: "a", cvName: "first.pdf", cvSize: 8 });
  expect(screen.getAllByRole("radio")).toHaveLength(2);
});
it("profile page wires the authenticated profile ID, never the user ID, to the API CV component", async () => {
  vi.spyOn(candidateProfileService, "load").mockResolvedValue({ id: "profile-uuid", user_id: "different-user-uuid", headline: "Developer" });
  render(<ApiProfileEditor user={{ id: "different-user-uuid", name: "Synthetic Candidate" }} />);
  await screen.findByText("first.pdf");
  expect(apiCvService.list).toHaveBeenCalledWith("profile-uuid", expect.any(Object));
  expect(screen.getByText(/Dữ liệu API thật/)).toBeTruthy();
});
it("list errors remain errors and never display an empty-success state", async () => {
  apiCvService.list.mockRejectedValueOnce(new Error("Backend unavailable"));
  render(<ApiCandidateCV candidateId="candidate" />);
  await screen.findByText("Backend unavailable");
  expect(screen.queryByText("Chưa có CV trên hệ thống.")).toBeNull();
  fireEvent.click(screen.getByText("Tải lại danh sách CV")); await screen.findByText("first.pdf");
});
it("duplicate file events produce one upload and a real returned version ID", async () => {
  let finish; apiCvService.upload.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const onChange = vi.fn(); render(<ApiCandidateCV candidateId="candidate" onChange={onChange} />);
  await screen.findByText("first.pdf");
  const input = screen.getByLabelText("Chọn CV để tải lên hệ thống");
  const file = new File(["%PDF-1.4"], "new.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } }); fireEvent.change(input, { target: { files: [file] } });
  expect(apiCvService.upload).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ...b, id: "server-cv-id", fileName: "new.pdf", active: true, status: "uploaded" }));
  await screen.findByText("new.pdf");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cvId: "server-cv-id" }));
});
it("preview uses an authenticated blob and revokes the URL on close", async () => {
  apiCvService.download.mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
  render(<ApiCandidateCV candidateId="candidate" />); await screen.findByText("first.pdf");
  fireEvent.click(screen.getByText("Xem trước first.pdf")); await screen.findByTitle("Bản xem trước CV");
  expect(screen.getByText("Trình duyệt không hỗ trợ xem PDF trực tiếp. Hãy dùng nút tải CV ở danh sách phía trên.")).toBeTruthy();
  expect(apiCvService.download).toHaveBeenCalledWith("candidate", "a", true, expect.any(Object));
  fireEvent.click(screen.getByText("Đóng xem trước")); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:synthetic");
});
it("polling cannot overwrite a newer active selection in the UI", async () => {
  let finishStatus;
  apiCvService.list.mockResolvedValue([a, { ...b, status: "uploaded" }]);
  apiCvService.job.mockResolvedValue({ status: "COMPLETED" });
  apiCvService.get.mockImplementation(() => new Promise(resolve => { finishStatus = resolve; }));
  apiCvService.activate.mockResolvedValue({ ...b, active: true, status: "uploaded" });
  render(<ApiCandidateCV candidateId="candidate" />); await screen.findByText("first.pdf");
  fireEvent.click(screen.getAllByRole("radio")[1]); await waitFor(() => expect(apiCvService.get).toHaveBeenCalled());
  fireEvent.click(screen.getByText("Dùng phiên bản này")); await screen.findByText("Đã chọn CV đang dùng; CV của đơn đã nộp không thay đổi.");
  await act(async () => finishStatus({ ...b, active: false, status: "extracted" }));
  expect(screen.getAllByText("Đang dùng")).toHaveLength(1);
  expect(screen.getByText("Đang dùng").closest("li").textContent).toContain("second.pdf");
});
it("account changes abort actions and remove private CVs and previews", async () => {
  render(<ApiCandidateCV candidateId="candidate" />); await screen.findByText("first.pdf");
  act(() => { localStorage.setItem("matchajob_access_token", "another-account"); window.dispatchEvent(new Event("matchajob:auth-changed")); });
  await screen.findByText("Phiên đăng nhập đã thay đổi. Hãy mở lại trang hồ sơ.");
  expect(screen.queryByText("first.pdf")).toBeNull();
  expect(screen.getByLabelText("Chọn CV để tải lên hệ thống").disabled).toBe(true);
});
it("a download resolving after account change cannot create a private preview URL", async () => {
  let finish;
  apiCvService.download.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<ApiCandidateCV candidateId="candidate" />); await screen.findByText("first.pdf");
  fireEvent.click(screen.getByText("Xem trước first.pdf"));
  const signal = apiCvService.download.mock.calls[0][3].signal;
  act(() => { localStorage.setItem("matchajob_access_token", "another-account"); window.dispatchEvent(new Event("matchajob:auth-changed")); });
  await act(async () => finish(new Blob(["%PDF"], { type: "application/pdf" })));
  expect(signal.aborted).toBe(true); expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(screen.queryByTitle("Bản xem trước CV")).toBeNull();
});
