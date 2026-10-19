/**
 * StatisticsViewModel
 * Đối tượng View Model chuẩn hóa cho Thống kê, Chỉ số KPI & Biểu đồ Chart.js
 */

export function createDefaultEmployerStatistics() {
  return {
    summaryCards: [
      { key: "active_jobs", label: "Tin đang tuyển", value: "0", change: "+0%", isPositive: true, tone: "green", icon: "▣" },
      { key: "total_applicants", label: "Tổng ứng viên", value: "0", change: "+0%", isPositive: true, tone: "purple", icon: "●" },
      { key: "upcoming_interviews", label: "Phỏng vấn sắp tới", value: "0", change: "0 hôm nay", isPositive: true, tone: "orange", icon: "◷" },
      { key: "conversion_rate", label: "Tỷ lệ chuyển đổi", value: "0%", change: "+0%", isPositive: true, tone: "blue", icon: "▲" }
    ],
    recruitmentFunnel: {
      labels: ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"],
      counts: [0, 0, 0, 0, 0],
      conversionRate: 0
    },
    trend7Days: {
      labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
      views: [0, 0, 0, 0, 0, 0, 0],
      applications: [0, 0, 0, 0, 0, 0, 0]
    }
  };
}

export function createDefaultAdminStatistics() {
  return {
    summaryCards: [
      { key: "total_users", label: "Tổng người dùng", value: "0", change: "+0%", isPositive: true, tone: "purple", icon: "●" },
      { key: "active_jobs", label: "Tin đang hiển thị", value: "0", change: "+0%", isPositive: true, tone: "green", icon: "▣" },
      { key: "pending_reviews", label: "Hồ sơ chờ duyệt", value: "0", change: "0 rủi ro cao", isPositive: false, tone: "orange", icon: "◷" },
      { key: "flagged_reports", label: "Báo cáo rủi ro", value: "0", change: "0 nghiêm trọng", isPositive: false, tone: "red", icon: "!" }
    ],
    growthChart: {
      labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
      users: [0, 0, 0, 0, 0, 0],
      jobs: [0, 0, 0, 0, 0, 0]
    }
  };
}
