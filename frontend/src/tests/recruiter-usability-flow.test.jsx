import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidatesView, { exportCandidatesCSV } from "../pages/employer/views/CandidatesView";
import PipelineView from "../pages/employer/views/PipelineView";

const mockShowToast = vi.fn();
vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

describe("Recruiter Usability Flow - CandidatesView", () => {
  const mockCandidates = [
    {
      id: "CAND-1",
      name: "Nguyễn Văn An",
      candidateName: "Nguyễn Văn An",
      appliedJobTitle: "Frontend Developer",
      role: "Frontend Developer",
      email: "an@example.com",
      phone: "0901234567",
      stage: "Mới",
      matchScore: 92,
      skills: ["React", "JavaScript", "TypeScript"],
      location: "Hồ Chí Minh",
      experience: "3 năm"
    },
    {
      id: "CAND-2",
      name: "Trần Thị Bình",
      candidateName: "Trần Thị Bình",
      appliedJobTitle: "Backend Developer",
      role: "Backend Developer",
      email: "binh@example.com",
      phone: "0907654321",
      stage: "Phỏng vấn",
      matchScore: 84,
      skills: ["Java", "Spring Boot", "PostgreSQL"],
      location: "Hà Nội",
      experience: "5 năm"
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tìm kiếm ứng viên theo từ khóa kỹ năng hoặc tên", () => {
    render(<CandidatesView candidates={mockCandidates} />);

    expect(screen.getByText("Nguyễn Văn An")).toBeTruthy();
    expect(screen.getByText("Trần Thị Bình")).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên ứng viên/i);
    fireEvent.change(searchInput, { target: { value: "React" } });

    expect(screen.getByText("Nguyễn Văn An")).toBeTruthy();
    expect(screen.queryByText("Trần Thị Bình")).toBeNull();
  });

  it("nút 1-click đặt lại bộ lọc khôi phục toàn bộ danh sách", () => {
    render(<CandidatesView candidates={mockCandidates} />);

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên ứng viên/i);
    fireEvent.change(searchInput, { target: { value: "KhongCoUngVienNao" } });

    expect(screen.getByText(/Không tìm thấy ứng viên nào phù hợp/i)).toBeTruthy();

    const resetBtn = screen.getByRole("button", { name: /Đặt lại toàn bộ bộ lọc/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText("Nguyễn Văn An")).toBeTruthy();
    expect(screen.getByText("Trần Thị Bình")).toBeTruthy();
  });

  it("xuất CSV thành công và bật thông báo Toast", () => {
    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    render(<CandidatesView candidates={mockCandidates} />);

    const exportBtn = screen.getByRole("button", { name: /Xuất danh sách/i });
    fireEvent.click(exportBtn);

    expect(mockShowToast).toHaveBeenCalledWith("Đã tạo tệp CSV theo bộ lọc.");
  });
});

describe("Recruiter Usability Flow - PipelineView", () => {
  const mockCandidates = [
    {
      id: "CAND-1",
      name: "Nguyễn Văn An",
      candidateName: "Nguyễn Văn An",
      appliedJobTitle: "Frontend Developer",
      stage: "Mới",
      matchScore: 92,
      skills: ["React"]
    },
    {
      id: "CAND-2",
      name: "Trần Thị Bình",
      candidateName: "Trần Thị Bình",
      appliedJobTitle: "Frontend Developer",
      stage: "Sàng lọc",
      matchScore: 84,
      skills: ["Java"]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chuyển giai đoạn ứng viên tiếp theo gọi onStageChange sau khi xác nhận", async () => {
    const onStageChange = vi.fn().mockResolvedValue(true);
    render(<PipelineView candidates={mockCandidates} onStageChange={onStageChange} />);

    // CAND-1 đang ở "Mới", bấm nút next mở modal xác nhận
    const nextButtons = screen.getAllByTitle("Chuyển sang bước tiếp theo");
    expect(nextButtons.length).toBeGreaterThan(0);

    fireEvent.click(nextButtons[0]);

    // Bấm nút "Xác nhận chuyển" trong modal xác nhận
    const confirmBtn = screen.getByRole("button", { name: /Xác nhận chuyển/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onStageChange).toHaveBeenCalledWith("CAND-1", "Sàng lọc");
    });
  });

  it("thông báo lỗi và giữ nguyên trạng thái nếu backend từ chối chuyển stage", async () => {
    const onStageChange = vi.fn().mockRejectedValue(new Error("Giai đoạn không hợp lệ"));
    render(<PipelineView candidates={mockCandidates} onStageChange={onStageChange} />);

    const nextButtons = screen.getAllByTitle("Chuyển sang bước tiếp theo");
    fireEvent.click(nextButtons[0]);

    const confirmBtn = screen.getByRole("button", { name: /Xác nhận chuyển/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Giai đoạn không hợp lệ", "danger");
    });
  });
});

