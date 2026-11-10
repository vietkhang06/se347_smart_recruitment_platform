import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../services/dataMode", () => ({ IS_API: false }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "candidate-test", email: "demo@example.com", role: "candidate" }, login: vi.fn() })
}));
vi.mock("../services/authService", () => ({ authService: { register: vi.fn() } }));
vi.mock("../services/profileService", () => ({
  getProfile: vi.fn(() => ({ email: "demo@example.com", name: "Test Candidate", phone: "abc", cvId: "cv-demo", cvName: "demo.pdf" })),
  uploadCV: vi.fn(), downloadCV: vi.fn()
}));
vi.mock("../services/jobService", () => ({ jobService: { getJobSnapshot: vi.fn(), isAcceptingApplications: vi.fn(() => true) } }));
vi.mock("../services/applicationService", () => ({
  draft: vi.fn(() => null), ownApplications: vi.fn(() => []), submitApplication: vi.fn()
}));

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import CandidateApplyForm from "../components/candidate/CandidateApplyForm";
import { authService } from "../services/authService";
import { submitApplication } from "../services/applicationService";

beforeEach(() => vi.clearAllMocks());
const show = node => render(<MemoryRouter>{node}</MemoryRouter>);

it("nhãn nhìn thấy ở trang đăng nhập được liên kết với ô nhập", () => {
  show(<LoginPage />);
  expect(screen.getByText("Địa chỉ Email", { selector: "label" }).htmlFor).toBe("login-email");
  expect(screen.getByText("Mật khẩu", { selector: "label" }).htmlFor).toBe("login-password");
  expect(document.getElementById("login-email")).toBeTruthy();
  expect(document.getElementById("login-password")).toBeTruthy();
});

it("nhãn trang đăng ký liên kết được với ô nhập và có ràng buộc cơ bản", () => {
  show(<RegisterPage />);
  expect(screen.getByText("Địa chỉ Email", { selector: "label" }).htmlFor).toBe("register-email");
  expect(screen.getByText("Mật khẩu (tối thiểu 8 ký tự)", { selector: "label" }).htmlFor).toBe("register-password");
  const email = document.getElementById("register-email");
  const password = document.getElementById("register-password");
  expect(email.required).toBe(true);
  expect(email.type).toBe("email");
  expect(password.required).toBe(true);
  expect(password.minLength).toBe(8);
});

it("form đăng ký hiển thị loading, chặn gửi lại, rồi thông báo thành công", async () => {
  let complete;
  authService.register.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  show(<RegisterPage />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "candidate@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "TestPass123!" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByRole("button", { name: "Hoàn tất đăng ký" }).closest("form"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Đang đăng ký…" }).disabled).toBe(true));
  complete({ message: "Đăng ký thử thành công" });
  expect((await screen.findByRole("status")).textContent).toContain("Đăng ký thử thành công");
  expect(authService.register).toHaveBeenCalledTimes(1);
});

it("số điện thoại không hợp lệ bị chặn trước khi gửi hồ sơ", async () => {
  show(<CandidateApplyForm job={{ id: "JOB-2047", company: "FPT", title: "Frontend" }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /đồng ý chia sẻ/ }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận gửi hồ sơ" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Số điện thoại không hợp lệ");
  const phone = screen.getByLabelText("Số điện thoại");
  expect(phone.getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(phone);
  expect(submitApplication).not.toHaveBeenCalled();
});

it("điền số hợp lệ cho phép gửi hồ sơ và không gửi lặp", async () => {
  submitApplication.mockResolvedValue({ id: "APP-TEST" });
  const success = vi.fn();
  show(<CandidateApplyForm job={{ id: "JOB-2047", company: "FPT", title: "Frontend" }} onSuccess={success} />);
  fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0912345678" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /đồng ý chia sẻ/ }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận gửi hồ sơ" }));
  await waitFor(() => expect(submitApplication).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  expect(submitApplication.mock.calls[0][0]).toBe("JOB-2047");
});
