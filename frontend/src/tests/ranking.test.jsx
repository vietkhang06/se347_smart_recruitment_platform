import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toRankingViewModel, toRankingListViewModel, determineScoreLevel } from "../mappers/rankingMapper";
import { apiApplicationService } from "../services/api/apiApplicationService";
import RankingView from "../pages/employer/views/RankingView";

// Mock ToastContext
vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

describe("Ranking Mapper & ViewModel", () => {
  it("determineScoreLevel phân loại chính xác các ngưỡng điểm", () => {
    expect(determineScoreLevel(90).level).toBe("excellent");
    expect(determineScoreLevel(85).level).toBe("excellent");
    expect(determineScoreLevel(84).level).toBe("good");
    expect(determineScoreLevel(70).level).toBe("good");
    expect(determineScoreLevel(69).level).toBe("average");
    expect(determineScoreLevel(50).level).toBe("average");
    expect(determineScoreLevel(49).level).toBe("low");
    expect(determineScoreLevel(0).level).toBe("low");
  });

  it("toRankingViewModel xử lý item chuẩn và gán initials", () => {
    const raw = {
      ranking: 1,
      applicationId: "APP-01",
      candidateId: "CAND-01",
      candidateName: "Nguyễn Văn An",
      stage: "Phỏng vấn",
      overallScore: 92,
      skillsScore: 95,
      experienceScore: 88,
      rationale: "Rất mạnh về React và TypeScript."
    };
    const vm = toRankingViewModel(raw);
    expect(vm.ranking).toBe(1);
    expect(vm.candidateName).toBe("Nguyễn Văn An");
    expect(vm.candidateInitials).toBe("VA");
    expect(vm.overallScore).toBe(92);
    expect(vm.scoreLevel).toBe("excellent");
    expect(vm.skillsScore).toBe(95);
    expect(vm.experienceScore).toBe(88);
  });

  it("toRankingViewModel xử lý an toàn dữ liệu null hoặc thiếu điểm", () => {
    const vm = toRankingViewModel(null);
    expect(vm.ranking).toBe(1);
    expect(vm.candidateName).toBe("");
    expect(vm.overallScore).toBe(0);
    expect(vm.candidateInitials).toBe("UV");
  });

  it("toRankingListViewModel tự động sinh thứ hạng cho mảng dữ liệu", () => {
    const items = [
      { candidateName: "B", overallScore: 80 },
      { candidateName: "A", overallScore: 90 }
    ];
    const list = toRankingListViewModel(items);
    expect(list.length).toBe(2);
    expect(list[0].ranking).toBe(1);
    expect(list[1].ranking).toBe(2);
  });
});

describe("RankingView Component", () => {
  const mockJobs = [
    { id: "JOB-1", title: "Senior Frontend Engineer", department: "Kỹ thuật" },
    { id: "JOB-2", title: "Product Manager", department: "Sản phẩm" }
  ];

  const mockRankingItems = [
    {
      ranking: 1,
      applicationId: "APP-1",
      candidateId: "CAND-1",
      candidateName: "Trần Bảo Long",
      candidateInitials: "TL",
      stage: "Phỏng vấn",
      overallScore: 95,
      skillsScore: 96,
      experienceScore: 92,
      rationale: "Có 5 năm kinh nghiệm React, rất phù hợp.",
      appliedDate: "01/11/2026"
    },
    {
      ranking: 2,
      applicationId: "APP-2",
      candidateId: "CAND-2",
      candidateName: "Lê Minh Thảo",
      candidateInitials: "LT",
      stage: "Sàng lọc",
      overallScore: 82,
      skillsScore: 84,
      experienceScore: 80,
      rationale: "Kỹ năng chuyên môn tốt, tiềm năng cao.",
      appliedDate: "02/11/2026"
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("gọi API getJobRanking khi render với jobId mặc định", async () => {
    const spy = vi.spyOn(apiApplicationService, "getJobRanking").mockResolvedValue(mockRankingItems);
    render(<RankingView jobs={mockJobs} />);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("JOB-1");
    });

    const elements = await screen.findAllByText("Trần Bảo Long");
    expect(elements.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lê Minh Thảo").length).toBeGreaterThan(0);
    expect(screen.getByText(/#1 Top Match/i)).toBeTruthy();
  });

  it("hiển thị trạng thái lỗi và cho phép thử lại khi API gặp sự cố", async () => {
    vi.spyOn(apiApplicationService, "getJobRanking").mockRejectedValueOnce(new Error("Lỗi máy chủ 500"));
    render(<RankingView jobs={mockJobs} />);

    expect(await screen.findByText("Lỗi máy chủ 500")).toBeTruthy();
    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    expect(retryBtn).toBeTruthy();

    // Thử lại thành công
    vi.spyOn(apiApplicationService, "getJobRanking").mockResolvedValueOnce(mockRankingItems);
    fireEvent.click(retryBtn);

    const elements = await screen.findAllByText("Trần Bảo Long");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("hiển thị trạng thái rỗng khi vị trí chưa có ứng viên", async () => {
    vi.spyOn(apiApplicationService, "getJobRanking").mockResolvedValue([]);
    render(<RankingView jobs={mockJobs} />);

    expect(await screen.findByText(/Chưa có ứng viên nào phù hợp/i)).toBeTruthy();
  });

  it("lọc ứng viên theo điểm số tối thiểu", async () => {
    vi.spyOn(apiApplicationService, "getJobRanking").mockResolvedValue(mockRankingItems);
    render(<RankingView jobs={mockJobs} />);

    await screen.findAllByText("Trần Bảo Long");

    // Lọc minScore >= 85 (chỉ còn Trần Bảo Long 95%, loại Lê Minh Thảo 82%)
    const selects = screen.getAllByRole("combobox");
    const minScoreSelect = selects.find((s) => s.innerHTML.includes("Từ 85%"));
    expect(minScoreSelect).toBeTruthy();

    fireEvent.change(minScoreSelect, { target: { value: "85" } });

    expect(screen.getAllByText("Trần Bảo Long").length).toBeGreaterThan(0);
    expect(screen.queryByText("Lê Minh Thảo")).toBeNull();
  });
});
