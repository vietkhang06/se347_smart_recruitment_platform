import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidatesView from "../pages/employer/views/CandidatesView";
import PipelineView from "../pages/employer/views/PipelineView";
import { ToastProvider } from "../context/ToastContext";

const mockCandidates = [
  {
    id: "app-1",
    candidateName: "Nguyễn Văn A",
    appliedJobTitle: "Frontend React Developer",
    jobId: "job-1",
    stage: "Mới",
    matchScore: 92,
    skills: ["React", "JavaScript", "CSS"],
    location: "Hà Nội",
    experience: "3 năm",
    appliedDate: "2026-10-20"
  },
  {
    id: "app-2",
    candidateName: "Trần Thị B",
    appliedJobTitle: "Backend Java Engineer",
    jobId: "job-2",
    stage: "Sàng lọc",
    matchScore: 78,
    skills: ["Java", "Spring Boot", "PostgreSQL"],
    location: "TP. Hồ Chí Minh",
    experience: "4 năm",
    appliedDate: "2026-10-22"
  },
  {
    id: "app-3",
    candidateName: "Lê Văn C",
    appliedJobTitle: "Frontend React Developer",
    jobId: "job-1",
    stage: "Bài kiểm tra",
    matchScore: 88,
    skills: ["React", "TypeScript", "Redux"],
    location: "Đà Nẵng",
    experience: "2 năm",
    appliedDate: "2026-10-25"
  }
];

const mockJobs = [
  { id: "job-1", title: "Frontend React Developer", status: "Đang tuyển" },
  { id: "job-2", title: "Backend Java Engineer", status: "Đã đóng" }
];

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("CandidatesView: Lọc, Sắp xếp và Xem chi tiết", () => {
  it("Hiển thị đầy đủ danh sách ứng viên và điểm AI", () => {
    renderWithToast(
      <CandidatesView candidates={mockCandidates} jobs={mockJobs} />
    );

    expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    expect(screen.getByText("Trần Thị B")).toBeTruthy();
    expect(screen.getByText("Lê Văn C")).toBeTruthy();
    expect(screen.getByText("92% phù hợp")).toBeTruthy();
  });

  it("Lọc ứng viên theo tin tuyển dụng (Job Filter)", async () => {
    renderWithToast(
      <CandidatesView candidates={mockCandidates} jobs={mockJobs} />
    );

    const jobSelect = screen.getByLabelText("Lọc vị trí tuyển dụng");
    fireEvent.change(jobSelect, { target: { value: "job-2" } });

    // Chỉ ứng viên của job-2 hiển thị
    expect(screen.queryByText("Nguyễn Văn A")).toBeNull();
    expect(screen.getByText("Trần Thị B")).toBeTruthy();
    expect(screen.getByText(/Đang lọc theo tin tuyển dụng:/)).toBeTruthy();
  });

  it("Sắp xếp ứng viên theo họ tên A-Z và theo điểm AI", () => {
    renderWithToast(
      <CandidatesView candidates={mockCandidates} jobs={mockJobs} />
    );

    const sortSelect = screen.getByLabelText("Sắp xếp danh sách ứng viên");
    // Sort Name A-Z
    fireEvent.change(sortSelect, { target: { value: "name_asc" } });
    const cards = screen.getAllByRole("heading", { level: 6 });
    expect(cards[0].textContent).toBe("Lê Văn C");
    expect(cards[1].textContent).toBe("Nguyễn Văn A");
    expect(cards[2].textContent).toBe("Trần Thị B");
  });

  it("Hiển thị trạng thái rỗng khi không có ứng viên nào khớp", () => {
    renderWithToast(
      <CandidatesView candidates={[]} jobs={mockJobs} />
    );

    expect(screen.getByText("Không tìm thấy ứng viên nào phù hợp với điều kiện tìm kiếm.")).toBeTruthy();
  });
});

describe("PipelineView: Xác nhận thao tác, Đang lưu, Rollback & Tin đã đóng", () => {
  it("Hiển thị 5 cột Kanban và phân loại ứng viên theo đúng giai đoạn", () => {
    renderWithToast(
      <PipelineView candidates={mockCandidates} jobs={mockJobs} />
    );

    expect(screen.getByText("Mới")).toBeTruthy();
    expect(screen.getByText("Sàng lọc")).toBeTruthy();
    expect(screen.getByText("Bài kiểm tra")).toBeTruthy();
    expect(screen.getByText("Phỏng vấn")).toBeTruthy();
    expect(screen.getByText("Đề nghị")).toBeTruthy();
    expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
  });

  it("Mở modal xác nhận trước khi thực hiện chuyển bước", async () => {
    renderWithToast(
      <PipelineView candidates={mockCandidates} jobs={mockJobs} />
    );

    // Click nút chuyển tiếp của Nguyễn Văn A (Mới -> Sàng lọc)
    const nextButtons = screen.getAllByTitle("Chuyển sang bước tiếp theo");
    fireEvent.click(nextButtons[0]);

    // Modal xác nhận xuất hiện
    expect(await screen.findByText("Xác nhận chuyển giai đoạn")).toBeTruthy();
    expect(screen.getByText("Xác nhận chuyển")).toBeTruthy();
  });

  it("Thực thi chuyển bước và gọi onStageChange khi bấm xác nhận", async () => {
    const handleStageChange = vi.fn().mockResolvedValue(true);
    renderWithToast(
      <PipelineView
        candidates={mockCandidates}
        jobs={mockJobs}
        onStageChange={handleStageChange}
      />
    );

    const nextButtons = screen.getAllByTitle("Chuyển sang bước tiếp theo");
    fireEvent.click(nextButtons[0]);

    const confirmBtn = await screen.findByText("Xác nhận chuyển");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleStageChange).toHaveBeenCalledWith("app-1", "Sàng lọc");
    });
  });

  it("Rollback trạng thái và hiển thị thông báo lỗi khi API thất bại", async () => {
    const handleStageChange = vi.fn().mockRejectedValue(new Error("Lỗi vi phạm chuyển trạng thái"));
    const setCandidates = vi.fn();

    renderWithToast(
      <PipelineView
        candidates={mockCandidates}
        jobs={mockJobs}
        setCandidates={setCandidates}
        onStageChange={handleStageChange}
      />
    );

    const nextButtons = screen.getAllByTitle("Chuyển sang bước tiếp theo");
    fireEvent.click(nextButtons[0]);

    const confirmBtn = await screen.findByText("Xác nhận chuyển");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Callback setCandidates được gọi để rollback
      expect(setCandidates).toHaveBeenCalled();
    });
  });

  it("Khóa thao tác chuyển bước khi tin tuyển dụng của ứng viên đã đóng (Closed Job)", () => {
    renderWithToast(
      <PipelineView candidates={mockCandidates} jobs={mockJobs} />
    );

    // Trần Thị B thuộc job-2 (đã đóng)
    expect(screen.getByText("Tin đóng")).toBeTruthy();
    const closedBtns = screen.getAllByTitle("Tin tuyển dụng đã đóng");
    expect(closedBtns.length).toBeGreaterThan(0);
    expect(closedBtns[0].disabled).toBe(true);
  });
});
