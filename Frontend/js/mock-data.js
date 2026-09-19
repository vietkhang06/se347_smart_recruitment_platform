window.MATCHAJOB_MOCK = {
  employer: {
    company: {
      name: "FPT Digital Talent",
      shortName: "FPT Talent",
      industry: "Công nghệ & Sản phẩm số",
      size: "500+ nhân sự",
      location: "TP. Hồ Chí Minh",
      website: "fptsoftware.com",
      verified: true
    },
    metrics: [
      { label: "Tin đang tuyển", value: "12", change: "+2 tuần này", tone: "green", icon: "▣" },
      { label: "Ứng viên mới", value: "148", change: "+18,4%", tone: "purple", icon: "●" },
      { label: "Lịch phỏng vấn", value: "18", change: "6 hôm nay", tone: "orange", icon: "◷" },
      { label: "Tỷ lệ phản hồi", value: "92%", change: "+4,2%", tone: "teal", icon: "↗" }
    ],
    jobs: [
      { id: "JOB-2048", title: "Senior Product Designer", team: "Product", location: "TP.HCM", applicants: 48, views: 1284, status: "Đang tuyển", posted: "14/09/2026" },
      { id: "JOB-2047", title: "Frontend Engineer", team: "Engineering", location: "Hà Nội", applicants: 36, views: 972, status: "Đang tuyển", posted: "12/09/2026" },
      { id: "JOB-2046", title: "Data Analyst", team: "Data", location: "Hybrid", applicants: 27, views: 756, status: "Chờ duyệt", posted: "11/09/2026" },
      { id: "JOB-2045", title: "Talent Acquisition", team: "People", location: "TP.HCM", applicants: 64, views: 1112, status: "Tạm dừng", posted: "08/09/2026" },
      { id: "JOB-2044", title: "QA Automation Engineer", team: "Engineering", location: "Đà Nẵng", applicants: 22, views: 645, status: "Đã đóng", posted: "02/09/2026" }
    ],
    candidates: [
      { id: 1, name: "Nguyễn An Khang", role: "Senior Product Designer", initials: "AK", experience: "5 năm", location: "TP.HCM", match: 96, skills: ["Figma", "Design System", "UX Research"], stage: "Phỏng vấn" },
      { id: 2, name: "Trần Minh Anh", role: "Product Designer", initials: "MA", experience: "3 năm", location: "Hà Nội", match: 93, skills: ["Prototype", "Mobile", "Research"], stage: "Sàng lọc" },
      { id: 3, name: "Lê Quốc Huy", role: "Frontend Engineer", initials: "QH", experience: "4 năm", location: "Đà Nẵng", match: 91, skills: ["React", "TypeScript", "A11y"], stage: "Bài kiểm tra" },
      { id: 4, name: "Phạm Thanh Hà", role: "Data Analyst", initials: "TH", experience: "2 năm", location: "TP.HCM", match: 88, skills: ["SQL", "Power BI", "Python"], stage: "Mới" },
      { id: 5, name: "Võ Kim Ngân", role: "Talent Acquisition", initials: "KN", experience: "4 năm", location: "TP.HCM", match: 86, skills: ["Sourcing", "ATS", "Employer Brand"], stage: "Đề nghị" }
    ],
    interviews: [
      { time: "09:00", date: "19/09", candidate: "Nguyễn An Khang", role: "Senior Product Designer", type: "Phỏng vấn chuyên môn", people: "Lan Anh + 2", status: "Sắp diễn ra" },
      { time: "13:30", date: "19/09", candidate: "Trần Minh Anh", role: "Product Designer", type: "Portfolio review", people: "Đức Minh + 1", status: "Đã xác nhận" },
      { time: "10:00", date: "20/09", candidate: "Lê Quốc Huy", role: "Frontend Engineer", type: "Technical interview", people: "Quang Huy + 2", status: "Chờ xác nhận" },
      { time: "15:00", date: "21/09", candidate: "Phạm Thanh Hà", role: "Data Analyst", type: "Culture fit", people: "Thu Trang", status: "Đã xác nhận" }
    ],
    activity: [
      { time: "08:42", text: "Nguyễn An Khang đã xác nhận lịch phỏng vấn", tone: "green" },
      { time: "08:16", text: "Tin Senior Product Designer có 8 hồ sơ mới", tone: "purple" },
      { time: "Hôm qua", text: "Data Analyst đã được gửi duyệt", tone: "orange" },
      { time: "Hôm qua", text: "Trần Minh Anh được chuyển sang vòng Portfolio", tone: "teal" }
    ],
    plans: [
      { name: "Starter", price: "0đ", period: "/tháng", features: ["2 tin đang hoạt động", "30 hồ sơ/tháng", "1 thành viên"], current: false },
      { name: "Growth", price: "1.490.000đ", period: "/tháng", features: ["15 tin đang hoạt động", "500 hồ sơ/tháng", "5 thành viên", "Báo cáo nâng cao"], current: true },
      { name: "Scale", price: "Liên hệ", period: "", features: ["Không giới hạn tin", "Kho ứng viên mở rộng", "Phân quyền nâng cao", "Hỗ trợ ưu tiên"], current: false }
    ]
  },
  admin: {
    metrics: [
      { label: "Tổng người dùng", value: "18.240", change: "+18,2%", tone: "purple", icon: "●" },
      { label: "Tin đang hiển thị", value: "1.284", change: "+7,6%", tone: "green", icon: "▣" },
      { label: "Hồ sơ chờ duyệt", value: "26", change: "8 quá SLA", tone: "orange", icon: "◷" },
      { label: "Báo cáo rủi ro", value: "14", change: "3 nghiêm trọng", tone: "red", icon: "!" }
    ],
    users: [
      { id: "USR-1028", name: "Nguyễn An Khang", email: "ankhang@example.com", role: "Ứng viên", joined: "18/09/2026", status: "Hoạt động" },
      { id: "USR-1027", name: "FPT Digital Talent", email: "talent@fpt.com", role: "Nhà tuyển dụng", joined: "17/09/2026", status: "Đã xác minh" },
      { id: "USR-1026", name: "Nova Retail", email: "hr@novaretail.vn", role: "Nhà tuyển dụng", joined: "16/09/2026", status: "Chờ xác minh" },
      { id: "USR-1025", name: "Trần Minh Anh", email: "minhanh@example.com", role: "Ứng viên", joined: "15/09/2026", status: "Tạm khóa" },
      { id: "USR-1024", name: "Lê Quốc Huy", email: "quochuy@example.com", role: "Ứng viên", joined: "14/09/2026", status: "Hoạt động" }
    ],
    reviews: [
      { id: "REV-882", title: "Senior Product Designer", company: "FPT Digital Talent", risk: "Thấp", submitted: "18/09 · 16:42", status: "Chờ duyệt" },
      { id: "REV-881", title: "Sales Executive", company: "Nova Retail", risk: "Cao", submitted: "18/09 · 15:20", status: "Cần kiểm tra" },
      { id: "REV-880", title: "Data Analyst", company: "DataFlow", risk: "Thấp", submitted: "18/09 · 11:08", status: "Chờ duyệt" },
      { id: "REV-879", title: "Cộng tác viên online", company: "Moon Agency", risk: "Cao", submitted: "17/09 · 18:12", status: "Cần kiểm tra" }
    ],
    reports: [
      { id: "RP-2026-0916", subject: "Yêu cầu đóng phí ứng tuyển", target: "Nova Retail", reporter: "Võ Kim Ngân", severity: "Nghiêm trọng", age: "32 phút", status: "Đang xử lý" },
      { id: "RP-2026-0915", subject: "Thông tin lương không rõ ràng", target: "Moon Agency", reporter: "Trần Minh Anh", severity: "Trung bình", age: "2 giờ", status: "Mới" },
      { id: "RP-2026-0914", subject: "Nội dung phân biệt đối xử", target: "Tin JOB-2012", reporter: "Ẩn danh", severity: "Cao", age: "5 giờ", status: "Đang xử lý" },
      { id: "RP-2026-0913", subject: "Giả mạo thương hiệu", target: "FPT Career VN", reporter: "FPT Talent", severity: "Cao", age: "1 ngày", status: "Đã chuyển cấp" }
    ],
    categories: [
      { name: "Công nghệ thông tin", jobs: 426, skills: 84, status: "Hiển thị" },
      { name: "Kinh doanh / Bán hàng", jobs: 312, skills: 46, status: "Hiển thị" },
      { name: "Marketing / Truyền thông", jobs: 198, skills: 38, status: "Hiển thị" },
      { name: "Thiết kế / Sáng tạo", jobs: 126, skills: 29, status: "Hiển thị" },
      { name: "Tài chính / Kế toán", jobs: 104, skills: 32, status: "Nháp" }
    ],
    logs: [
      { time: "19/09/2026 09:14", actor: "admin@matchajob.vn", action: "APPROVE_JOB", target: "JOB-2048", ip: "10.24.6.18" },
      { time: "19/09/2026 08:52", actor: "moderator@matchajob.vn", action: "SUSPEND_EMPLOYER", target: "USR-1026", ip: "10.24.6.22" },
      { time: "19/09/2026 08:31", actor: "system", action: "RISK_FLAG_CREATED", target: "RP-2026-0916", ip: "internal" },
      { time: "18/09/2026 17:46", actor: "admin@matchajob.vn", action: "UPDATE_CATEGORY", target: "CAT-TECH", ip: "10.24.6.18" }
    ],
    notifications: [
      { title: "3 báo cáo nghiêm trọng cần xử lý", detail: "SLA gần nhất còn 38 phút", time: "5 phút trước", tone: "red", unread: true },
      { title: "8 doanh nghiệp đang chờ xác minh", detail: "2 hồ sơ đã chờ hơn 24 giờ", time: "18 phút trước", tone: "orange", unread: true },
      { title: "Báo cáo tuần đã sẵn sàng", detail: "Tăng trưởng người dùng +6,4%", time: "1 giờ trước", tone: "green", unread: false },
      { title: "Hoàn tất sao lưu dữ liệu", detail: "Không phát hiện lỗi", time: "3 giờ trước", tone: "teal", unread: false }
    ]
  }
};
