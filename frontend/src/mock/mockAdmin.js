export const MOCK_ADMIN_REVIEWS = [
  {
    id: "REV-880",
    jobId: "JOB-2046",
    title: "Data Analyst (BI & Analytics)",
    company: "FPT Digital Talent",
    companyId: "COMP-01",
    type: "job",
    risk: "Thấp",
    submitted: "18/09 · 11:08",
    status: "Chờ duyệt",
    details: "Tin tuyển dụng bổ sung thuộc phòng Data & AI của FPT Software. Nội dung chuẩn mực, mức lương rõ ràng."
  },
  {
    id: "REV-881",
    jobId: "JOB-2041",
    title: "Sales Executive (Bán lẻ & Phân phối)",
    company: "Nova Retail Group",
    companyId: "COMP-06",
    type: "job",
    risk: "Cao",
    submitted: "18/09 · 15:20",
    status: "Cần kiểm tra",
    details: "Hệ thống AI quét thấy mô tả có yêu cầu đặt cọc đồng phục và giấy tờ tùy thân. Cần nhân sự đối soát trực tiếp."
  },
  {
    id: "REV-879",
    companyId: "COMP-06",
    title: "Xác minh Doanh nghiệp Tích xanh",
    company: "Nova Retail Group",
    type: "company",
    risk: "Cao",
    submitted: "17/09 · 18:12",
    status: "Chờ xác minh",
    details: "Doanh nghiệp nộp bản sao Giấy phép ĐKKD MST 0108923412. Cần tra cứu đối chiếu trên cổng Quốc gia."
  },
  {
    id: "REV-878",
    companyId: "COMP-07",
    title: "Xác minh Doanh nghiệp Tích xanh",
    company: "Moon Media & Talent Agency",
    type: "company",
    risk: "Trung bình",
    submitted: "17/09 · 14:00",
    status: "Chờ xác minh",
    details: "Hồ sơ đăng ký doanh nghiệp mới thành lập tại Đà Nẵng, giấy tờ chưa có chữ ký số điện tử."
  },
  {
    id: "REV-882",
    jobId: "JOB-2048",
    title: "Senior Product Designer",
    company: "FPT Digital Talent",
    companyId: "COMP-01",
    type: "job",
    risk: "Thấp",
    submitted: "14/09 · 09:30",
    status: "Đã duyệt",
    details: "Đã được phê duyệt tự động theo chính sách đối tác tích xanh."
  }
];

export const MOCK_ADMIN_REPORTS = [
  {
    id: "RP-2026-0916",
    subject: "Yêu cầu đóng phí ứng tuyển & đặt cọc đồng phục",
    target: "Nova Retail Group",
    targetType: "company",
    companyId: "COMP-06",
    jobId: "JOB-2041",
    reporter: "Võ Kim Ngân",
    severity: "Nghiêm trọng",
    age: "32 phút",
    status: "Đang xử lý",
    description: "Ứng viên phản ánh người phụ trách tuyển dụng yêu cầu chuyển khoản 350.000đ tiền đồng phục trước khi nhận lịch phỏng vấn."
  },
  {
    id: "RP-2026-0915",
    subject: "Thông tin mức thu nhập mập mờ, sai lệch thực tế",
    target: "Moon Media & Talent Agency",
    targetType: "company",
    companyId: "COMP-07",
    reporter: "Trần Minh Anh",
    severity: "Trung bình",
    age: "2 giờ",
    status: "Mới",
    description: "Đăng tuyển lương cứng 15 triệu nhưng khi trao đổi lại báo chỉ có hoa hồng CTV bán hàng trực tuyến không có lương cứng."
  },
  {
    id: "RP-2026-0914",
    subject: "Nội dung tuyển dụng có dấu hiệu phân biệt giới tính & độ tuổi",
    target: "Tin JOB-2041",
    targetType: "job",
    jobId: "JOB-2041",
    reporter: "Ẩn danh",
    severity: "Cao",
    age: "5 giờ",
    status: "Đang xử lý",
    description: "Yêu cầu chỉ tuyển nam dưới 25 tuổi, vi phạm quy định tiêu chuẩn bình đẳng cơ hội việc làm của MatchaJob."
  },
  {
    id: "RP-2026-0913",
    subject: "Giả mạo thương hiệu doanh nghiệp uy tín để lừa đảo",
    target: "FPT Career VN (Kênh mạo danh)",
    targetType: "external",
    reporter: "FPT Talent",
    severity: "Cao",
    age: "1 ngày",
    status: "Đã xử lý",
    resolution: "Đã gửi thông báo cảnh báo toàn sàn và khóa tên miền liên kết lừa đảo."
  }
];

export const MOCK_ADMIN_CATEGORIES = [
  { id: "CAT-IT", name: "Công nghệ thông tin", icon: "bi-laptop", jobs: 426, skills: 84, status: "Hiển thị" },
  { id: "CAT-SALES", name: "Kinh doanh / Bán hàng", icon: "bi-graph-up-arrow", jobs: 312, skills: 46, status: "Hiển thị" },
  { id: "CAT-MKT", name: "Marketing / Truyền thông", icon: "bi-megaphone", jobs: 198, skills: 38, status: "Hiển thị" },
  { id: "CAT-DESIGN", name: "Thiết kế / Sáng tạo", icon: "bi-palette", jobs: 126, skills: 29, status: "Hiển thị" },
  { id: "CAT-FIN", name: "Tài chính / Kế toán", icon: "bi-cash-coin", jobs: 104, skills: 32, status: "Nháp" },
  { id: "CAT-LOG", name: "Xuất nhập khẩu / Logistics", icon: "bi-truck", jobs: 96, skills: 24, status: "Hiển thị" }
];

export const MOCK_TOP_SKILLS = [
  "JavaScript",
  "React.js",
  "Node.js",
  "TypeScript",
  "Giao tiếp & Đàm phán",
  "SQL & Cơ sở dữ liệu",
  "Figma & UI/UX Design",
  "Tiếng Anh Thương mại",
  "Quản lý dự án Agile/Scrum",
  "Digital Marketing & SEO",
  "Python & Phân tích dữ liệu",
  "Bán hàng B2B",
  "Incoterms 2020",
  "Power BI"
];

export const MOCK_SYSTEM_SETTINGS = [
  {
    id: "s1",
    key: "auto_approve_verified",
    label: "Tự động duyệt tin đăng từ các doanh nghiệp đã xác minh",
    desc: "Cho phép các tin đạt chuẩn từ doanh nghiệp tích xanh xuất bản ngay lập tức",
    checked: true
  },
  {
    id: "s2",
    key: "ai_risk_filter",
    label: "Kích hoạt bộ lọc AI phát hiện nội dung rủi ro",
    desc: "Tự động gắn cờ các tin có dấu hiệu thu phí hoặc từ ngữ phân biệt đối xử",
    checked: true
  },
  {
    id: "s3",
    key: "mandatory_salary",
    label: "Bắt buộc công khai mức thu nhập trong tin tuyển dụng",
    desc: "Không cho phép để trống trường lương hoặc ẩn lương nhằm tăng tính minh bạch",
    checked: true
  },
  {
    id: "s4",
    key: "sla_alert_30min",
    label: "Gửi email cảnh báo vi phạm SLA sau 30 phút",
    desc: "Cảnh báo khẩn cấp tới đội ngũ quản trị khi có báo cáo nghiêm trọng chưa xử lý",
    checked: true
  },
  {
    id: "s5",
    key: "maintenance_mode",
    label: "Bật chế độ bảo trì hệ thống toàn diện",
    desc: "Tạm dừng truy cập công khai của ứng viên để nâng cấp hạ tầng mạng",
    checked: false
  }
];

export const MOCK_SYSTEM_SERVICES = [
  { name: "Cổng web Ứng viên (Candidate App)", latency: "120ms", status: "Online" },
  { name: "Cổng web Tuyển dụng (Employer Portal)", latency: "142ms", status: "Online" },
  { name: "Dịch vụ AI Matching & Sàng lọc CV", latency: "320ms", status: "Online" },
  { name: "Dịch vụ Email & SMS Gateway", latency: "98ms", status: "Online" },
  { name: "Cổng thanh toán & Hóa đơn VietQR", latency: "164ms", status: "Online" }
];

export const MOCK_ADMIN_NOTIFICATIONS = [
  {
    id: "NOTIF-1",
    title: "1 báo cáo nghiêm trọng cần xử lý",
    detail: "Vụ việc Nova Retail (RP-2026-0916) có dấu hiệu thu tiền cọc",
    time: "5 phút trước",
    tone: "red",
    unread: true,
    tab: "reports"
  },
  {
    id: "NOTIF-2",
    title: "2 doanh nghiệp đang chờ xác minh tích xanh",
    detail: "Hồ sơ của Nova Retail và Moon Agency đang chờ đối soát",
    time: "18 phút trước",
    tone: "orange",
    unread: true,
    tab: "moderation"
  },
  {
    id: "NOTIF-3",
    title: "Báo cáo tuần đã sẵn sàng",
    detail: "Tăng trưởng người dùng mới đạt +6,4% so với tuần trước",
    time: "1 giờ trước",
    tone: "green",
    unread: false,
    tab: "overview"
  },
  {
    id: "NOTIF-4",
    title: "Hoàn tất sao lưu dữ liệu tự động",
    detail: "Toàn bộ snapshot dữ liệu đã được lưu trữ an toàn trên Cloud",
    time: "3 giờ trước",
    tone: "teal",
    unread: false,
    tab: "system"
  }
];

export const MOCK_AUDIT_LOGS = [
  { time: "19/09/2026 09:14", actor: "admin@matchajob.vn", action: "APPROVE_JOB", target: "JOB-2048", ip: "10.24.6.18", status: "Thành công" },
  { time: "19/09/2026 08:52", actor: "admin@matchajob.vn", action: "SUSPEND_USER", target: "USR-1026", ip: "10.24.6.22", status: "Thành công" },
  { time: "19/09/2026 08:31", actor: "system_ai", action: "RISK_FLAG_CREATED", target: "RP-2026-0916", ip: "internal", status: "Thành công" },
  { time: "18/09/2026 17:46", actor: "admin@matchajob.vn", action: "UPDATE_CATEGORY", target: "CAT-LOG", ip: "10.24.6.18", status: "Thành công" },
  { time: "18/09/2026 15:22", actor: "system_ai", action: "FLAG_UNSAFE_JOB", target: "JOB-2041", ip: "internal", status: "Thành công" }
];
