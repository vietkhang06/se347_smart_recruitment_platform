import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatNumber, formatPercent, formatCurrency, formatDateVN } from "../utils/formatUtils";
import { toEmployerStatisticsViewModel, toAdminStatisticsViewModel } from "../mappers/statisticsMapper";
import RecruitmentFunnelChart from "../components/charts/RecruitmentFunnelChart";
import RecruitmentTrendChart from "../components/charts/RecruitmentTrendChart";
import SourceDistributionChart from "../components/charts/SourceDistributionChart";

describe("formatUtils", () => {
  it("formatNumber định dạng số theo phân cách hàng nghìn", () => {
    expect(formatNumber(1250)).toBe("1.250");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber("1000000")).toBe("1.000.000");
    expect(formatNumber(null, "Không có")).toBe("Không có");
  });

  it("formatPercent định dạng tỷ lệ phần trăm", () => {
    expect(formatPercent(94)).toBe("94%");
    expect(formatPercent(85.5)).toContain("85");
    expect(formatPercent(null)).toBe("0%");
  });

  it("formatCurrency định dạng tiền tệ Việt Nam", () => {
    const formatted = formatCurrency(25000000);
    expect(formatted).toContain("25.000.000");
    expect(formatCurrency(null)).toBe("Thương lượng");
  });

  it("formatDateVN chuyển đổi định dạng ngày sang DD/MM/YYYY", () => {
    expect(formatDateVN("2026-11-04T08:00:00Z")).toBe("04/11/2026");
    expect(formatDateVN(null)).toBe("Chưa cập nhật");
  });
});

describe("statisticsMapper", () => {
  const mockJobs = [
    { id: "J1", title: "Dev", status: "Đang tuyển", applicantCount: 5 },
    { id: "J2", title: "QA", status: "Đã đóng", applicantCount: 2 }
  ];

  const mockApps = [
    { id: "A1", stage: "Mới", appliedAt: "2026-11-02T10:00:00Z" },
    { id: "A2", stage: "Sàng lọc", appliedAt: "2026-11-03T10:00:00Z" },
    { id: "A3", stage: "Bài kiểm tra", appliedAt: "2026-11-03T11:00:00Z" },
    { id: "A4", stage: "Phỏng vấn", appliedAt: "2026-11-04T09:00:00Z" },
    { id: "A5", stage: "Đề nghị", appliedAt: "2026-11-04T10:00:00Z" }
  ];

  const mockInterviews = [
    { id: "I1", status: "scheduled" },
    { id: "I2", status: "completed" }
  ];

  it("toEmployerStatisticsViewModel tính toán đúng phễu 5 giai đoạn", () => {
    const stats = toEmployerStatisticsViewModel(mockJobs, mockApps, mockInterviews);
    expect(stats.recruitmentFunnel.counts).toEqual([1, 1, 1, 1, 1]);
    expect(stats.recruitmentFunnel.conversionRate).toBe(20); // 1 / 5 = 20%
    expect(stats.summaryCards.find((c) => c.key === "active_jobs").value).toBe("1");
    expect(stats.summaryCards.find((c) => c.key === "total_applicants").value).toBe("5");
    expect(stats.summaryCards.find((c) => c.key === "upcoming_interviews").value).toBe("1");
  });

  it("toEmployerStatisticsViewModel xử lý an toàn khi danh sách rỗng", () => {
    const stats = toEmployerStatisticsViewModel([], [], []);
    expect(stats.recruitmentFunnel.counts).toEqual([0, 0, 0, 0, 0]);
    expect(stats.recruitmentFunnel.conversionRate).toBe(0);
    expect(stats.summaryCards.find((c) => c.key === "active_jobs").value).toBe("0");
  });

  it("toAdminStatisticsViewModel tính toán chỉ số admin", () => {
    const adminStats = toAdminStatisticsViewModel({
      users: [{ id: 1 }, { id: 2 }],
      reviews: [{ id: "R1", status: "Chờ duyệt", risk: "Cao" }],
      reports: [{ id: "RP1", severity: "Nghiêm trọng", status: "Chờ xử lý" }],
      activeJobsCount: 1500
    });
    expect(adminStats.summaryCards.find((c) => c.key === "active_jobs").value).toBe("1.500");
    expect(adminStats.summaryCards.find((c) => c.key === "pending_reviews").value).toBe("1");
  });
});

describe("Chart Components States (Loading, Empty, Error)", () => {
  it("RecruitmentFunnelChart hiển thị spinner khi loading", () => {
    render(<RecruitmentFunnelChart isLoading={true} />);
    expect(screen.getByText(/Đang tải số liệu phễu tuyển dụng/i)).toBeTruthy();
  });

  it("RecruitmentFunnelChart hiển thị placeholder khi rỗng", () => {
    render(<RecruitmentFunnelChart funnelData={{ counts: [0, 0, 0, 0, 0] }} />);
    expect(screen.getByText(/Chưa có ứng viên trong phễu tuyển dụng/i)).toBeTruthy();
  });

  it("RecruitmentFunnelChart hiển thị lỗi và kích hoạt retry", () => {
    const retryFn = vi.fn();
    render(<RecruitmentFunnelChart error="Lỗi máy chủ" onRetry={retryFn} />);
    expect(screen.getByText("Lỗi máy chủ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it("RecruitmentTrendChart hiển thị spinner khi loading", () => {
    render(<RecruitmentTrendChart isLoading={true} />);
    expect(screen.getByText(/Đang tải xu hướng tuyển dụng/i)).toBeTruthy();
  });

  it("RecruitmentTrendChart hiển thị placeholder khi rỗng", () => {
    render(<RecruitmentTrendChart weeklyData={{ applications: [0, 0, 0, 0, 0, 0, 0], views: [0, 0, 0, 0, 0, 0, 0] }} />);
    expect(screen.getByText(/Chưa có lượt nộp đơn hay xem tin/i)).toBeTruthy();
  });

  it("SourceDistributionChart hiển thị placeholder khi rỗng", () => {
    render(<SourceDistributionChart sourcesData={{ data: [0, 0, 0, 0, 0] }} />);
    expect(screen.getByText(/Chưa có dữ liệu nguồn kênh ứng viên/i)).toBeTruthy();
  });
});

