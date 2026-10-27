import { webcrypto } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Routes, Route } from "react-router-dom";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "fixture", TOKEN_KEY: "matchajob_fixture_access_token" }));
import { fixtureFetch } from "../services/fixtures/candidateFixtureApi";
import { authService } from "../services/authService";
import { jobService } from "../services/jobService";
import { candidateProfileService } from "../services/profileService";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ProfilePage from "../pages/candidate/ProfilePage";
import RequireRole from "../components/auth/RequireRole";
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", vi.fn(fixtureFetch));
});
const register = (email = "new.fixture@example.com") => authService.register({ email, password: "Demo123!", role: "candidate" });
it("fixture đăng ký, login, current-user, profile chạy qua cùng API adapter và không gọi mạng", async () => {
  await register();
  expect(authService.getUser()).toBeNull();
  const user = await authService.loginWithCredentials("new.fixture@example.com", "candidate", "Demo123!");
  expect(user.mode).toBe("fixture");
  expect((await authService.restore()).id).toBe(user.id);
  expect((await candidateProfileService.load()).user_id).toBe(user.id);
  await candidateProfileService.save({ headline: " React Developer ", experience_years: 0, location: "Dong Nai" });
  expect((await candidateProfileService.load()).headline).toBe("React Developer");
  expect(localStorage.getItem("matchajob_access_token")).toBeNull();
  expect(fetch).toHaveBeenCalled();
});
it("fixture trả đúng lỗi 409, 401 và không coi mật khẩu bất kỳ là đúng", async () => {
  await register();
  await expect(register()).rejects.toMatchObject({ status: 409 });
  await expect(authService.loginWithCredentials("new.fixture@example.com", "candidate", "wrong")).rejects.toMatchObject({ status: 401 });
  expect(authService.getUser()).toBeNull();
});
it("fixture hồ sơ được tách theo tài khoản", async () => {
  await register("first@example.com");
  await authService.loginWithCredentials("first@example.com", "candidate", "Demo123!");
  await candidateProfileService.save({ headline: "FIRST" });
  authService.logout();
  await register("second@example.com");
  await authService.loginWithCredentials("second@example.com", "candidate", "Demo123!");
  expect((await candidateProfileService.load()).headline).toBeNull();
});
it("fixture phân trang, lọc, sắp xếp và detail đúng DTO", async () => {
  const first = await jobService.search({ size: 8 });
  const second = await jobService.search({ size: 8, page: 1 });
  expect(first.totalElements).toBe(18); expect(first.totalPages).toBe(3);
  expect(first.content).toHaveLength(8); expect(second.content[0].id).not.toBe(first.content[0].id);
  const remote = await jobService.search({ workType: "remote", sortBy: "salary_desc" });
  expect(remote.content.every(job => job.workType === "remote")).toBe(true);
  expect(remote.content[0].salaryMax).toBeGreaterThanOrEqual(remote.content.at(-1).salaryMax);
  const detail = await jobService.getPublicJobById(first.content[0].id);
  expect(detail.description).toContain(detail.title);
  expect(await jobService.getPublicJobById("missing")).toBeNull();
  expect(jobService.isAcceptingApplications(await jobService.getPublicJobById("22222222-2222-4222-8222-000000000099"))).toBe(false);
  expect((await jobService.search({ keyword: "no-such-job" })).content).toHaveLength(0);
});
it("fixture từ chối token hết hạn", async () => {
  await authService.loginWithCredentials("thong.fixture@example.com", "candidate", "Demo123!");
  const state = JSON.parse(localStorage.getItem("matchajob:candidate-fixture:v1"));
  Object.values(state.sessions).forEach(session => { session.expiresAt = 0; });
  localStorage.setItem("matchajob:candidate-fixture:v1", JSON.stringify(state));
  await expect(authService.restore()).rejects.toMatchObject({ status: 401 });
});
it("component flow thực: register → login → protected profile → save", async () => {
  render(<MemoryRouter initialEntries={["/register"]}><ToastProvider><AuthProvider><Routes>
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<Link to="/candidate/profile">Mở hồ sơ test</Link>} />
    <Route element={<RequireRole role="candidate" />}><Route path="/candidate/profile" element={<ProfilePage />} /></Route>
  </Routes></AuthProvider></ToastProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "flow@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Demo123!" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  fireEvent.click(await screen.findByText("Đến đăng nhập"));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "flow@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Demo123!" } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  fireEvent.click(await screen.findByText("Mở hồ sơ test"));
  await screen.findByLabelText("Chức danh mong muốn");
  fireEvent.change(screen.getByLabelText("Chức danh mong muốn"), { target: { value: "Frontend Intern" } });
  fireEvent.click(screen.getByText("Lưu thay đổi hồ sơ"));
  await screen.findByText("Đã lưu hồ sơ trên hệ thống.");
  await waitFor(async () => expect((await candidateProfileService.load()).headline).toBe("Frontend Intern"));
  expect(fetch).toHaveBeenCalled();
});