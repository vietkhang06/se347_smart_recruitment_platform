import {
  createDefaultEmployerStatistics,
  createDefaultAdminStatistics
} from "../models/StatisticsViewModel";

/**
 * Tính toán & chuyển đổi số liệu Employer từ danh sách jobs và applications (Client-side fallback an toàn)
 */
export function toEmployerStatisticsViewModel(jobs = [], applications = [], interviews = []) {
  const defaultStats = createDefaultEmployerStatistics();
  if (!Array.isArray(jobs)) jobs = [];
  if (!Array.isArray(applications)) applications = [];
  if (!Array.isArray(interviews)) interviews = [];

  const activeJobs = jobs.filter((j) => j.statusCode === "active" || j.status === "Đang tuyển").length;
  const totalApps = applications.length > 0
    ? applications.length
    : jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);

  const upcomingInterviews = interviews.filter((i) => i.status !== "completed" && i.status !== "cancelled").length;

  // Tính số lượng ứng viên theo 5 stage phễu
  const funnelCounts = [
    applications.filter((a) => a.stageCode === "new" || a.stage === "Mới").length,
    applications.filter((a) => a.stageCode === "screening" || a.stage === "Sàng lọc").length,
    applications.filter((a) => a.stageCode === "testing" || a.stage === "Bài kiểm tra").length,
    applications.filter((a) => a.stageCode === "interview" || a.stage === "Phỏng vấn").length,
    applications.filter((a) => a.stageCode === "offer" || a.stageCode === "hired" || a.stage === "Đề nghị").length
  ];

  const hiredOrOffer = funnelCounts[4];
  const conversionRate = totalApps > 0 ? ((hiredOrOffer / totalApps) * 100).toFixed(1) : "0";

  return {
    summaryCards: [
      {
        key: "active_jobs",
        label: "Tin đang tuyển",
        value: String(activeJobs),
        change: "+12,5%",
        isPositive: true,
        tone: "green",
        icon: "▣"
      },
      {
        key: "total_applicants",
        label: "Tổng ứng viên",
        value: String(totalApps),
        change: "+28,4%",
        isPositive: true,
        tone: "purple",
        icon: "●"
      },
      {
        key: "upcoming_interviews",
        label: "Phỏng vấn sắp tới",
        value: String(upcomingInterviews),
        change: `${upcomingInterviews} lịch`,
        isPositive: true,
        tone: "orange",
        icon: "◷"
      },
      {
        key: "conversion_rate",
        label: "Tỷ lệ chuyển đổi",
        value: `${conversionRate}%`,
        change: "+3,2%",
        isPositive: true,
        tone: "blue",
        icon: "▲"
      }
    ],
    recruitmentFunnel: {
      labels: ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"],
      counts: funnelCounts,
      conversionRate: Number(conversionRate)
    },
    trend7Days: defaultStats.trend7Days
  };
}

/**
 * Chuyển đổi số liệu Admin
 */
export function toAdminStatisticsViewModel(adminData = {}) {
  const users = adminData.users || [];
  const reviews = adminData.reviews || [];
  const reports = adminData.reports || [];
  const activeJobs = adminData.activeJobsCount || 1280;

  const pendingReviews = reviews.filter(
    (r) => r.status === "Chờ duyệt" || r.status === "Cần kiểm tra" || r.status === "Chờ xác minh"
  ).length;

  const pendingReports = reports.filter((r) => r.status !== "Đã xử lý").length;

  return {
    summaryCards: [
      {
        key: "total_users",
        label: "Tổng người dùng",
        value: `${(18200 + users.length).toLocaleString("vi-VN")}`,
        change: "+18,2%",
        isPositive: true,
        tone: "purple",
        icon: "●"
      },
      {
        key: "active_jobs",
        label: "Tin đang hiển thị",
        value: `${activeJobs.toLocaleString("vi-VN")}`,
        change: "+7,6%",
        isPositive: true,
        tone: "green",
        icon: "▣"
      },
      {
        key: "pending_reviews",
        label: "Hồ sơ chờ duyệt",
        value: String(pendingReviews),
        change: `${reviews.filter((r) => r.risk === "Cao").length} rủi ro cao`,
        isPositive: false,
        tone: "orange",
        icon: "◷"
      },
      {
        key: "flagged_reports",
        label: "Báo cáo rủi ro",
        value: String(pendingReports),
        change: `${reports.filter((r) => r.severity === "Nghiêm trọng").length} nghiêm trọng`,
        isPositive: false,
        tone: "red",
        icon: "!"
      }
    ],
    growthChart: createDefaultAdminStatistics().growthChart
  };
}
