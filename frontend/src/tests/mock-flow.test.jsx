import { webcrypto } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
vi.mock("../services/dataMode", () => ({ IS_API: false, DATA_MODE: "mock", TOKEN_KEY: "matchajob_access_token" }));
import { authService } from "../services/authService";
import { mockStore } from "../services/mockStore";
import { jobService } from "../services/jobService";
import { mockApplicationService } from "../services/mock/mockApplicationService";
import { mockCompanyService } from "../services/mock/mockCompanyService";
import { getProfile, saveProfile } from "../services/profileService";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import RegisterPage from "../pages/auth/RegisterPage";
import LoginPage from "../pages/auth/LoginPage";
import ProfilePage from "../pages/candidate/ProfilePage";
import RequireRole from "../components/auth/RequireRole";
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Mock must not access network"); })); });
const register = (email = "thong.new@example.com", extra = {}) => authService.register({ email, name: "Thông", role: "candidate", password: "Demo123!", ...extra });
const login = (email = "thong.new@example.com", role = "candidate") => authService.loginWithCredentials(email, role, "Demo123!");
it("đăng ký mock đi vào kho tài khoản dùng chung và kiểm tra mật khẩu", async () => {
  await register();
  expect(mockStore.getUsers().some(u => u.email === "thong.new@example.com")).toBe(true);
  await expect(authService.loginWithCredentials("thong.new@example.com", "candidate", "wrong")).rejects.toMatchObject({ status: 401 });
  await expect(register()).rejects.toMatchObject({ status: 409 });
  const user = await login(); expect(user.role).toBe("candidate");
  expect((await authService.restore()).id).toBe(user.id); expect(fetch).not.toHaveBeenCalled();
});
it("ba vai trò mẫu vẫn đăng nhập, sai vai trò không được nâng quyền", async () => {
  for (const [email, role] of [["ankhang@example.com", "candidate"], ["talent@fpt.com", "employer"], ["admin@matchajob.vn", "admin"]]) {
    expect((await login(email, role)).role).toBe(role); authService.logout();
  }
  await expect(login("ankhang@example.com", "admin")).rejects.toThrow("đúng vai trò");
  expect(authService.getUser()).toBeNull();
});
it("khóa tài khoản hoặc hết phiên thì restore không cho vào", async () => {
  await login("ankhang@example.com");
  const session = JSON.parse(localStorage.getItem("matchajob-demo-user")); session.expiresAt = 0;
  localStorage.setItem("matchajob-demo-user", JSON.stringify(session)); expect(await authService.restore()).toBeNull();
  await login("ankhang@example.com");
  const users = mockStore.getUsers().map(u => u.email === "ankhang@example.com" ? { ...u, status: "Tạm khóa" } : u);
  localStorage.setItem("matchajob_store_users", JSON.stringify(users)); expect(await authService.restore()).toBeNull();
});
it("HR mới có công ty riêng, không nhận dữ liệu công ty khác", async () => {
  await register("new.hr@example.com", { role: "employer", companyName: "Thông Tech" });
  const user = await login("new.hr@example.com", "employer");
  expect((await mockCompanyService.getCompany(user.companyId)).name).toBe("Thông Tech");
  expect(await mockApplicationService.getApplications(user.companyId)).toEqual([]);
  await mockCompanyService.updateCompany(user.companyId, { name: "Thông Tech Updated", status: "Đã xác minh" });
  expect((await mockCompanyService.getCompany(user.companyId)).name).toBe("Thông Tech Updated");
  expect(mockStore.getCompanies().find(c => c.id === user.companyId).status).toBe("Chưa xác minh");
  await expect(mockApplicationService.getApplications("COMP-01")).rejects.toThrow("không có quyền");
});
it("hồ sơ, ảnh và metadata CV lưu theo từng tài khoản", async () => {
  await register(); await login();
  saveProfile({ ...getProfile(), name: "Thông", phone: "0912345678", avatar: "data:image/png;base64,AA==", cvId: "cv-test", cvName: "CV.pdf" });
  expect(getProfile().cvName).toBe("CV.pdf"); expect(getProfile().avatar).toContain("data:image");
  authService.logout(); await register("other@example.com"); await login("other@example.com");
  expect(getProfile().cvId).toBeUndefined();
});
it("lọc và phân trang mock, sắp xếp lương dạng chuỗi có dấu phẩy", async () => {
  const jobs = Array.from({ length: 10 }, (_, i) => ({ id: `TEST-${i}`, title: `React ${i}`, status: "Đang tuyển", companyId: "COMP-01", location: "Đồng Nai", type: "Từ xa", deadline: "2099-12-31", salaryMax: i === 9 ? "90,000,000" : "10,000,000" }));
  localStorage.setItem("matchajob_store_jobs", JSON.stringify(jobs));
  const first = await jobService.search({ keyword: "React", workType: "Từ xa", sortBy: "salary_desc", size: 8 });
  expect(first.content[0].id).toBe("TEST-9"); expect(first.totalPages).toBe(2);
  expect((await jobService.search({ page: 1, size: 8 })).content).toHaveLength(2);
  expect((await jobService.search({ keyword: "không tồn tại" })).totalElements).toBe(0);
});
it("HR thấy đơn cùng kho và đổi trạng thái cập nhật lại cho ứng viên", async () => {
  await login("talent@fpt.com", "employer");
  const c = mockStore.getCandidates().find(c => c.appliedJobId && !c.withdrawnAt && !/từ chối|không phù hợp|đã rút/i.test(c.stage || ""));
  expect(c).toBeTruthy();
  const job = mockStore.getJobById(c.appliedJobId);
  localStorage.setItem("matchajob_store_applications", JSON.stringify([{ id: "APP-INTEGRATION", candidateId: c.id, jobId: c.appliedJobId, companyId: job.companyId, stage: "Mới", candidateEmail: c.email, cvId: "cv-integration", cvName: "CV.pdf" }]));
  const list = await mockApplicationService.getApplications("COMP-01");
  expect(list.find(a => a.id === c.id).cvName).toBe("CV.pdf");
  const nextStage = c.stage === "Sàng lọc" ? "Phỏng vấn" : "Sàng lọc";
  await mockApplicationService.updateApplicationStage(c.id, nextStage);
  expect(mockStore.getApplications().find(a => a.id === "APP-INTEGRATION").stage).toBe(nextStage);
});
it("component mặc định: đăng ký → đăng nhập → hồ sơ đầy đủ ảnh/CV → lưu", async () => {
  render(<MemoryRouter initialEntries={["/register"]}><ToastProvider><AuthProvider><Routes>
    <Route path="/register" element={<RegisterPage />} /><Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<Link to="/candidate/profile">Mở hồ sơ test</Link>} />
    <Route element={<RequireRole role="candidate" />}><Route path="/candidate/profile" element={<ProfilePage />} /></Route>
  </Routes></AuthProvider></ToastProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Thông UI" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ui@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Demo123!" } });
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  fireEvent.click(await screen.findByText("Đến đăng nhập"));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ui@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Demo123!" } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form")); fireEvent.click(await screen.findByText("Mở hồ sơ test"));
  await screen.findByLabelText("Chức danh mong muốn");
  expect(screen.getByLabelText("Ảnh đại diện")).toBeTruthy(); expect(screen.getByLabelText("Chọn hoặc thay CV")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0912345678" } });
  fireEvent.change(screen.getByLabelText("Chức danh mong muốn"), { target: { value: "React Developer" } });
  fireEvent.click(screen.getByText("Lưu thay đổi hồ sơ"));
  await screen.findByText("Đã lưu hồ sơ. Bạn có thể dùng thông tin này cho các đơn mới.");
  expect(getProfile().role).toBe("React Developer");
});