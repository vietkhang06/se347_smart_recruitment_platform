import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
import ApiApplyForm from "../components/candidate/ApiApplyForm";
import ApiApplications from "../components/candidate/ApiApplications";
import { candidateApi } from "../services/candidateApi";
import { httpClient } from "../services/httpClient";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); localStorage.setItem("matchajob_access_token", "test-token"); });
it("hồ sơ → tải CV → chọn CV → xác nhận gửi bằng HTTP, chặn gửi lặp khi đang chờ", async () => {
  let uploaded = false, finish;
  const onSuccess = vi.fn();
  fetch.mockImplementation(async (url, options) => {
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
    if (url.endsWith("/profile")) return json({ id: "profile-id", user_id: "different-user-id" });
    if (url.endsWith("/profile-id/cv") && options.method === "POST") {
      expect(options.body).toBeInstanceOf(FormData); uploaded = true;
      return json({ cv_version_id: "cv-id" }, 202);
    }
    if (url.endsWith("/profile-id/cv")) return json(uploaded ? [{ id: "cv-id", file_name: "cv.pdf", status: "uploaded", is_active: true, created_at: "2026-01-01T00:00:00Z" }] : []);
    if (url.endsWith("/applications")) {
      expect(JSON.parse(options.body)).toEqual({ jobId: "job-id", cvVersionId: "cv-id", coverLetter: "React" });
      return new Promise(resolve => { finish = () => resolve(json({ applicationId: "app-id" }, 201)); });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  render(<MemoryRouter><ApiApplyForm job={{ id: "job-id", title: "Frontend" }} onSuccess={onSuccess} /></MemoryRouter>);
  const upload = await screen.findByLabelText(/Tải CV mới/);
  await waitFor(() => expect(upload.disabled).toBe(false));
  fireEvent.change(upload, { target: { files: [new File(["%PDF-1.4 test"], "cv.pdf", { type: "application/pdf" })] } });
  await screen.findByLabelText("cv.pdf");
  fireEvent.change(screen.getByLabelText("Thư giới thiệu"), { target: { value: "React" } });
  fireEvent.click(screen.getByLabelText(/Tôi xác nhận CV/));
  const button = screen.getByRole("button", { name: "Xác nhận gửi hồ sơ" });
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button); fireEvent.submit(button.closest("form"));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/applications"))).toHaveLength(1);
  finish(); await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ applicationId: "app-id" }));
});
it("lịch sử dùng trạng thái, phân trang và timeline thật từ response", async () => {
  fetch.mockImplementation(async url => {
    if (url.endsWith("/app-1/history")) return json([{ id: "h1", fromStage: "new", toStage: "screening", reason: "Đã đọc CV", createdAt: "2026-01-02T00:00:00Z" }]);
    if (url.endsWith("/app-1")) return json({ applicationId: "app-1", jobTitle: "Frontend", stage: "screening", coverLetter: "Xin chào" });
    return json({ items: [{ applicationId: "app-1", jobId: "job-1", jobTitle: "Frontend", stage: "screening" }], totalItems: 11, totalPages: 2 });
  });
  render(<MemoryRouter><ApiApplications /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Sau" }));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("page=1"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Lọc trạng thái đơn"), { target: { value: "screening" } });
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("page=0") && url.includes("stage=screening"))).toBe(true));
  fireEvent.click(await screen.findByRole("button", { name: "Chi tiết & lịch sử" }));
  expect(await screen.findByText("Đã đọc CV")).toBeTruthy();
});
it("409 giữ lỗi gửi trùng; không chuyển thành thành công", async () => {
  fetch.mockResolvedValue(json({ detail: "Already applied" }, 409));
  await expect(candidateApi.apply("job", "cv", "")).rejects.toMatchObject({ status: 409 });
});
it("tải CV gửi token và đọc blob, không parse tệp thành JSON", async () => {
  fetch.mockResolvedValue(new Response("%PDF test", { headers: { "content-type": "application/pdf" } }));
  const blob = await httpClient.get("/v1/candidates/p/cv/c/download", { responseType: "blob" });
  expect(await blob.text()).toBe("%PDF test");
  expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer test-token");
});
it("401 hết phiên, 403 giữ phiên, lỗi mạng hiển thị lỗi kết nối", async () => {
  const expired = vi.fn(); window.addEventListener("matchajob:session-expired", expired);
  try {
    fetch.mockResolvedValueOnce(json({ detail: "Forbidden" }, 403));
    await expect(candidateApi.cvs("profile")).rejects.toMatchObject({ status: 403 });
    expect(expired).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(json({ detail: "Expired" }, 401));
    await expect(candidateApi.cvs("profile")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    fetch.mockRejectedValueOnce(new TypeError("offline"));
    await expect(candidateApi.cvs("profile")).rejects.toMatchObject({ status: 0 });
  } finally { window.removeEventListener("matchajob:session-expired", expired); }
});