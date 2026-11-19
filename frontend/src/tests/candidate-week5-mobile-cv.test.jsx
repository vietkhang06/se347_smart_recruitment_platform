import { expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("../services/profileService", () => ({
  uploadCV: vi.fn(),
  downloadCV: vi.fn()
}));
vi.mock("../services/candidateApi", () => ({
  candidateApi: {
    cvs: vi.fn().mockResolvedValue([]),
    upload: vi.fn().mockResolvedValue({ cv_version_id: "cv-new" })
  }
}));

import CandidateCV from "../components/candidate/CandidateCV";
import ApiCvManager from "../components/candidate/ApiCvManager";
import { uploadCV } from "../services/profileService";
import { candidateApi } from "../services/candidateApi";

it("MOCK CV dùng nút chọn tệp rõ chữ, giữ input file có nhãn và dùng được", async () => {
  uploadCV.mockResolvedValue({ cvId: "cv-1", cvName: "demo.pdf" });
  const onChange = vi.fn();
  render(<CandidateCV value={{}} onChange={onChange} />);
  const input = screen.getByLabelText("Chọn hoặc thay CV");
  expect(input.type).toBe("file");
  expect(input.classList.contains("visually-hidden")).toBe(true);
  expect(screen.getByText("Chọn tệp CV từ máy")).toBeTruthy();
  fireEvent.change(input, { target: { files: [new File(["demo"], "demo.pdf", { type: "application/pdf" })] } });
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ cvId: "cv-1", cvName: "demo.pdf" }));
});

it("API CV cũng dùng nút chọn tệp rõ chữ và vẫn tải được qua API", async () => {
  const onSelect = vi.fn();
  render(<ApiCvManager candidateId="candidate-1" selectedId="" onSelect={onSelect} />);
  const input = screen.getByLabelText(/Tải CV mới/);
  expect(input.type).toBe("file");
  expect(input.classList.contains("visually-hidden")).toBe(true);
  expect(screen.getByText("Chọn tệp CV từ máy")).toBeTruthy();
  await waitFor(() => expect(input.disabled).toBe(false));
  const file = new File(["demo"], "cv.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(candidateApi.upload).toHaveBeenCalledWith("candidate-1", file));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith("cv-new"));
});
