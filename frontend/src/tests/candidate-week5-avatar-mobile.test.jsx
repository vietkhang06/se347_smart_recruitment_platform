import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CandidateAvatar from "../components/candidate/CandidateAvatar";

it("ảnh đại diện có nút chọn tệp rõ chữ trên màn hình hẹp và input có nhãn", () => {
  render(<CandidateAvatar value="" onChange={vi.fn()} />);
  const input = screen.getByLabelText("Ảnh đại diện");
  expect(input.type).toBe("file");
  expect(input.classList.contains("visually-hidden")).toBe(true);
  expect(screen.getByText("Chọn ảnh từ máy")).toBeTruthy();
  expect(input.accept).toBe("image/jpeg,image/png,image/webp");
});

it("ảnh đại diện từ chối tệp không phải ảnh và thông báo lỗi rõ ràng", () => {
  const onChange = vi.fn();
  render(<CandidateAvatar value="" onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Ảnh đại diện"), {
    target: { files: [new File(["text"], "not-image.txt", { type: "text/plain" })] }
  });
  expect(screen.getByRole("alert").textContent).toContain("Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB.");
  expect(onChange).not.toHaveBeenCalled();
});

it("ảnh đại diện có thể bỏ ảnh bằng nút bấm", () => {
  const onChange = vi.fn();
  render(<CandidateAvatar value="data:image/jpeg;base64,demo" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh" }));
  expect(onChange).toHaveBeenCalledWith("");
});
