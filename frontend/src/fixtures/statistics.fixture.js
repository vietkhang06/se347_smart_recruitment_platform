/**
 * Fixture: Thống kê & Biểu đồ (Statistics & Charts)
 */
export const STATISTICS_FIXTURE = {
  employer: {
    metrics: [
      { key: "active_jobs", label: "Tin đang tuyển", value: "3", change: "+12,5%", isPositive: true, tone: "green", icon: "▣" },
      { key: "total_applicants", label: "Tổng ứng viên", value: "106", change: "+28,4%", isPositive: true, tone: "purple", icon: "●" },
      { key: "upcoming_interviews", label: "Phỏng vấn sắp tới", value: "4", change: "4 lịch", isPositive: true, tone: "orange", icon: "◷" },
      { key: "conversion_rate", label: "Tỷ lệ chuyển đổi", value: "4.7%", change: "+1,2%", isPositive: true, tone: "blue", icon: "▲" }
    ],
    funnel: {
      labels: ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"],
      counts: [48, 28, 16, 9, 5],
      conversionRate: 4.7
    },
    weeklyTrend: {
      labels: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"],
      views: [140, 230, 310, 280, 350, 190, 120],
      applications: [12, 24, 32, 28, 36, 15, 8]
    }
  },
  admin: {
    metrics: [
      { label: "Tổng người dùng", value: "18.245", change: "+18,2%", tone: "purple", icon: "●" },
      { label: "Tin đang hiển thị", value: "1.285", change: "+7,6%", tone: "green", icon: "▣" },
      { label: "Hồ sơ chờ duyệt", value: "2", change: "1 rủi ro cao", tone: "orange", icon: "◷" },
      { label: "Báo cáo rủi ro", value: "1", change: "1 nghiêm trọng", tone: "red", icon: "!" }
    ],
    growth: {
      labels: ["Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10"],
      users: [12400, 13800, 15100, 16300, 17400, 18245],
      jobs: [850, 940, 1050, 1140, 1220, 1285]
    }
  }
};
