import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toJobCreateRequest, toJobUpdateRequest } from "../mappers/jobMapper";
import { toAdminStatisticsViewModel } from "../mappers/statisticsMapper";
import { adminService } from "../services";
import { apiAdminService } from "../services/api/apiAdminService";
import { apiStatisticsService } from "../services/api/apiStatisticsService";
import RoleSelectPage from "../pages/auth/RoleSelectPage";
import LoginPage from "../pages/auth/LoginPage";
import OverviewView from "../pages/employer/views/OverviewView";
import AnalyticsView from "../pages/employer/views/AnalyticsView";
import AdminOverviewView from "../pages/admin/views/AdminOverviewView";
import CategoriesView from "../pages/admin/views/CategoriesView";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn(), user: null, logout: vi.fn() })
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() })
}));

vi.mock("react-chartjs-2", () => ({
  Bar: ({ data }) => <div data-testid="mock-bar-chart">{JSON.stringify(data.labels)}</div>,
  Line: ({ data }) => <div data-testid="mock-line-chart">{JSON.stringify(data.labels)}</div>,
  Doughnut: ({ data }) => <div data-testid="mock-doughnut-chart">{JSON.stringify(data.labels)}</div>
}));

const jsonResponse = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Lỗi & Ghi Chú UI: Ẩn role Quản trị viên hệ thống trên màn hình công khai", () => {
  it("RoleSelectPage chỉ hiển thị Ứng viên và Nhà tuyển dụng, không hiển thị Quản trị viên hệ thống", () => {
    render(
      <MemoryRouter>
        <RoleSelectPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Ứng viên tìm việc")).toBeTruthy();
    expect(screen.getByText("Nhà tuyển dụng (HR)")).toBeTruthy();
    expect(screen.queryByText(/Quản trị viên hệ thống/i)).toBeNull();
  });

  it("LoginPage không hiển thị nút chọn vai trò Admin", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: "Ứng viên" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nhà tuyển dụng" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();
  });
});

describe("JobMapper UUID & Salary safety for Backend API", () => {
  it("toJobCreateRequest loại bỏ non-UUID ở categoryId/skillId nhưng giữ skillName và UUID hợp lệ", () => {
    const validCompUuid = "44444444-4444-4444-8444-444444444441";
    const validCatUuid = "55555555-5555-4555-8555-555555555551";
    const validSkillUuid = "66666666-5555-4555-8555-555555555503";

    const payload = toJobCreateRequest(
      {
        title: "Frontend Dev",
        categoryId: "CAT-01",
        salaryMode: "from",
        salarySingle: 25000000,
        skillsWithRequirement: [
          { skillId: "React", name: "React", isRequired: true },
          { skillId: validSkillUuid, name: "TypeScript", isRequired: false }
        ]
      },
      validCompUuid
    );

    expect(payload.companyId).toBe(validCompUuid);
    expect(payload.categoryId).toBeNull();
    expect(payload.salaryMode).toBe("single");
    expect(payload.salaryMin).toBe(25000000);
    expect(payload.salaryCurrency).toBe("VND");
    expect(payload.skills).toEqual([
      { skillId: null, skillName: "React", isRequired: true },
      { skillId: validSkillUuid, skillName: "TypeScript", isRequired: false }
    ]);

    const updatePayload = toJobUpdateRequest({
      title: "Updated",
      categoryId: validCatUuid,
      salaryMode: "under",
      salarySingle: 40000000,
      salaryCurrency: "VNĐ",
      skillsWithRequirement: [{ skillId: "Figma", name: "Figma", isRequired: true }]
    });

    expect(updatePayload.categoryId).toBe(validCatUuid);
    expect(updatePayload.salaryMode).toBe("single");
    expect(updatePayload.salaryMin).toBe(40000000);
    expect(updatePayload.salaryCurrency).toBe("VND");
    expect(updatePayload.skills).toEqual([{ skillId: null, skillName: "Figma", isRequired: true }]);
  });

  it("toJobCreateRequest chuẩn hóa salaryCurrency về ISO 3 ký tự (VND/USD) và nhân triệu VNĐ khi cần", () => {
    const millionRange = toJobCreateRequest(
      {
        title: "UI Engineer",
        salaryMode: "range",
        salaryMin: 25,
        salaryMax: 35,
        salaryCurrency: "Triệu VNĐ"
      },
      "44444444-4444-4444-8444-444444444441"
    );

    expect(millionRange.salaryCurrency).toBe("VND");
    expect(millionRange.salaryMode).toBe("range");
    expect(millionRange.salaryMin).toBe(25000000);
    expect(millionRange.salaryMax).toBe(35000000);

    const usdPayload = toJobCreateRequest(
      {
        title: "Remote Architect",
        salaryMode: "range",
        salaryMin: 2500,
        salaryMax: 4000,
        salaryCurrency: "USD ($)"
      },
      "44444444-4444-4444-8444-444444444441"
    );

    expect(usdPayload.salaryCurrency).toBe("USD");
    expect(usdPayload.salaryMin).toBe(2500);
    expect(usdPayload.salaryMax).toBe(4000);
  });
});

describe("Employer Dashboard Overview & Analytics không dùng số liệu giả", () => {
  it("OverviewView hiển thị 'Chờ AI' thay vì tự gán 88% khi ứng viên chưa có điểm", () => {
    render(
      <OverviewView
        employerData={{
          company: { name: "FPT" },
          metrics: [],
          interviews: [],
          activity: [],
          candidates: [
            { id: "A1", candidateName: "Nguyễn Văn A", stage: "Mới", matchScore: null, skills: ["React"] },
            { id: "A2", candidateName: "Trần Thị B", stage: "Phỏng vấn", matchScore: 91, skills: ["Java"] }
          ],
          weeklyPerformance: { applications: [0, 0, 0, 0, 0, 0, 0], views: [0, 0, 0, 0, 0, 0, 0] }
        }}
        onNavigateTab={vi.fn()}
        onOpenCandidate={vi.fn()}
        onOpenComposer={vi.fn()}
      />
    );

    expect(screen.getByText("Chờ AI")).toBeTruthy();
    expect(screen.getByText("91%")).toBeTruthy();
    expect(screen.queryByText("88%")).toBeNull();
  });

  it("AnalyticsView trả 0% thay vì fallback giả 34.2% / 81.5% khi không có dữ liệu", () => {
    render(
      <AnalyticsView
        employerData={{
          jobs: [],
          candidates: [],
          interviews: [],
          funnel: { counts: [0, 0, 0, 0, 0], labels: [] },
          sources: { data: [0, 0, 0, 0, 0], labels: [] }
        }}
      />
    );

    expect(screen.queryByText(/34[,.]2%/)).toBeNull();
    expect(screen.queryByText(/81[,.]5%/)).toBeNull();
    expect(screen.queryByText("18 ngày")).toBeNull();
    expect(screen.getByText("Chưa có")).toBeTruthy();
  });
});

describe("Admin API & Statistics mapping dùng dữ liệu thật", () => {
  it("toAdminStatisticsViewModel không cộng thêm 18.200 user giả lập", () => {
    const vm = toAdminStatisticsViewModel({
      totalUsers: 11,
      activeJobsCount: 3,
      pendingJobsCount: 1,
      jobStats: { totalJobs: 7, activeJobs: 3, pendingJobs: 1 }
    });
    expect(vm.summaryCards.find((c) => c.key === "total_users").value).toBe("11");
    expect(vm.summaryCards.find((c) => c.key === "active_jobs").value).toBe("3");
    expect(vm.summaryCards.find((c) => c.key === "pending_reviews").value).toBe("1");
  });

  it("apiAdminService gọi GET /v1/admin/users và PATCH /v1/admin/users/{id}/status đúng contract", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          content: [
            {
              id: "user-1",
              email: "hr@fpt.com",
              full_name: "Nguyễn Hoàng Long",
              role: "EMPLOYER",
              status: "active",
              is_verified: true,
              created_at: "2026-11-10T08:00:00Z"
            }
          ],
          page: 0,
          size: 100,
          total_elements: 1,
          total_pages: 1
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "user-1",
          email: "hr@fpt.com",
          full_name: "Nguyễn Hoàng Long",
          role: "EMPLOYER",
          status: "suspended",
          is_verified: true
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const users = await apiAdminService.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      id: "user-1",
      name: "Nguyễn Hoàng Long",
      role: "Nhà tuyển dụng",
      status: "Hoạt động"
    });

    const updated = await apiAdminService.updateUserStatus("user-1", "Tạm khóa");
    expect(updated.status).toBe("Tạm khóa");
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ status: "suspended" });
  });

  it("apiStatisticsService.getAdminStatistics kết hợp /v1/admin/stats/jobs và /v1/admin/users", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          totalJobs: 7,
          activeJobs: 3,
          pendingJobs: 1,
          totalApplicants: 112,
          totalViews: 4569,
          categoryBreakdown: { "Công nghệ thông tin": 6, "Thiết kế & Sáng tạo": 1 }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          content: [],
          page: 0,
          size: 1,
          total_elements: 11,
          total_pages: 11
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const stats = await apiStatisticsService.getAdminStatistics();
    expect(stats.summaryCards.find((c) => c.key === "total_users").value).toBe("11");
    expect(stats.summaryCards.find((c) => c.key === "active_jobs").value).toBe("3");
    expect(stats.jobStats.categoryBreakdown["Công nghệ thông tin"]).toBe(6);
  });

  it("AdminOverviewView hiển thị dữ liệu hệ thống thật khi có jobStats", () => {
    render(
      <AdminOverviewView
        adminData={{
          metrics: [{ label: "Tổng người dùng", value: "11", change: "Tài khoản trong hệ thống", icon: "●" }],
          jobStats: {
            totalApplicants: 112,
            totalViews: 4569,
            categoryBreakdown: { "Công nghệ thông tin": 6 }
          },
          alerts: {
            severeReportsCount: 0,
            pendingCompanyReviews: 0,
            pendingJobReviews: 1,
            highRiskReviews: 0
          },
          logs: []
        }}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText("Phân bổ Tin tuyển dụng theo Ngành nghề")).toBeTruthy();
    expect(screen.getByText("Dữ liệu hệ thống")).toBeTruthy();
    expect(screen.queryByText("Dữ liệu minh họa")).toBeNull();
    expect(screen.getByTestId("mock-bar-chart").textContent).toContain("Công nghệ thông tin");
  });

  it("CategoriesView gọi adminService.createCategory khi thêm danh mục", async () => {
    const spy = vi.spyOn(adminService, "createCategory").mockResolvedValue({
      id: "cat-new",
      name: "AI & Data",
      status: "Hiển thị",
      jobs: 0,
      skills: 0
    });
    const setCategories = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(<CategoriesView categories={[]} setCategories={setCategories} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: /Thêm ngành nghề/i }));
    const input = await screen.findByPlaceholderText(/Trí tuệ nhân tạo/i);
    fireEvent.change(input, { target: { value: "AI & Data" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm danh mục/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: "AI & Data" }));
    });
    expect(setCategories).toHaveBeenCalled();
  });
});
