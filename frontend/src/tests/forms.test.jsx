import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
const state = vi.hoisted(() => ({ user: null, loading: false, error: "", login: vi.fn(), retry: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => state }));
vi.mock("../services/authService", () => ({ authService: { register: vi.fn() } }));
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import RequireRole from "../components/auth/RequireRole";
import { authService } from "../services/authService";
beforeEach(() => { vi.clearAllMocks(); state.user = null; state.loading = false; state.error = ""; });
it("login hiển thị lỗi tại form và không điều hướng khi thất bại", async () => {
  state.login.mockRejectedValue(new Error("Sai mật khẩu"));
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "wrong" } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  expect((await screen.findByRole("alert")).textContent).toContain("Sai mật khẩu");
});
it("register thành công hiện liên kết đăng nhập, không tự login", async () => {
  authService.register.mockResolvedValue({ message: "Đã tạo tài khoản" });
  render(<MemoryRouter><RegisterPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Password123!" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  await screen.findByText("Đến đăng nhập"); expect(state.login).not.toHaveBeenCalled();
});
it("register 409 giữ lỗi tại form", async () => {
  authService.register.mockRejectedValue(new Error("Email đã tồn tại"));
  render(<MemoryRouter><RegisterPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByLabelText("Email").closest("form"));
  expect((await screen.findByRole("alert")).textContent).toContain("Email đã tồn tại");
});
function guard() { return render(<MemoryRouter initialEntries={["/private"]}><Routes><Route element={<RequireRole role="candidate" />}><Route path="/private" element={<p>Private content</p>} /></Route><Route path="/login" element={<p>Login destination</p>} /></Routes></MemoryRouter>); }
it("guard chờ restore trước khi điều hướng", () => { state.loading = true; guard(); expect(screen.getByRole("status")).toBeTruthy(); expect(screen.queryByText("Private content")).toBeNull(); });
it("guard đưa khách đến login", async () => { guard(); await screen.findByText("Login destination"); });
it("guard chặn sai role", () => { state.user = { role: "employer" }; guard(); expect(screen.getByRole("alert").textContent).toContain("không có quyền"); });
it("guard cho đúng role vào trang", () => { state.user = { role: "candidate" }; guard(); expect(screen.getByText("Private content")).toBeTruthy(); });