import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() })
}));
vi.mock("../services/profileService", () => ({
  uploadCV: vi.fn(),
  downloadCV: vi.fn()
}));

import LoginPage from "../pages/auth/LoginPage";
import CandidateCV from "../components/candidate/CandidateCV";
import { uploadCV } from "../services/profileService";

beforeEach(() => vi.clearAllMocks());

it("nút hiện/ẩn mật khẩu có tên truy cập được và phản ánh trạng thái", () => {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  const password = screen.getByLabelText("Mật khẩu");
  const show = screen.getByRole("button", { name: "Hiện mật khẩu" });
  expect(password.type).toBe("password");
  expect(show.getAttribute("aria-pressed")).toBe("false");

  fireEvent.click(show);
  expect(password.type).toBe("text");
  const hide = screen.getByRole("button", { name: "Ẩn mật khẩu" });
  expect(hide.getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(hide);
  expect(password.type).toBe("password");
});

it("tên tệp CV dài có thể xuống dòng, không ép tràn chiều ngang", () => {
  const longName = "cv-" + "frontend-".repeat(25) + ".pdf";
  render(<CandidateCV value={{ cvId: "cv-1", cvName: longName }} onChange={vi.fn()} />);
  const nameNode = screen.getByText(longName);
  expect(nameNode.style.overflowWrap).toBe("anywhere");
  expect(screen.getByRole("button", { name: "Tải lại CV" })).toBeTruthy();
});

it("chọn CV gọi dịch vụ tải tệp và chuyển kết quả cho form", async () => {
  const onChange = vi.fn();
  const cv = { cvId: "test-cv", cvName: "candidate-demo.pdf" };
  uploadCV.mockResolvedValue(cv);
  render(<CandidateCV value={{}} onChange={onChange} />);
  const input = screen.getByLabelText("Chọn hoặc thay CV");
  const file = new File(["%PDF-1.4 demo"], "candidate-demo.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(uploadCV).toHaveBeenCalledWith(file));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(cv));
});

it("lỗi tải CV hiển thị dưới dạng thông báo có thể đọc được", async () => {
  uploadCV.mockRejectedValue(new Error("Tệp CV không hợp lệ"));
  render(<CandidateCV value={{}} onChange={vi.fn()} />);
  const input = screen.getByLabelText("Chọn hoặc thay CV");
  fireEvent.change(input, { target: {
    files: [new File(["bad"], "demo.txt", { type: "text/plain" })]
  } });
  expect((await screen.findByRole("alert")).textContent).toContain("Tệp CV không hợp lệ");
});
