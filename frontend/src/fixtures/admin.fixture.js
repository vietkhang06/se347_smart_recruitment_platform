/**
 * Fixture: Quản trị hệ thống (Admin Portal Fixtures)
 */

export const ADMIN_CATEGORIES_FIXTURE = [
  { id: "CAT-IT", name: "Công nghệ thông tin", icon: "bi-laptop", status: "visible", jobCount: 48, sortOrder: 1 },
  { id: "CAT-DESIGN", name: "Thiết kế / Sáng tạo", icon: "bi-palette", status: "visible", jobCount: 32, sortOrder: 2 },
  { id: "CAT-MKT", name: "Marketing / Truyền thông", icon: "bi-megaphone", status: "visible", jobCount: 24, sortOrder: 3 },
  { id: "CAT-SALES", name: "Kinh doanh / Bán hàng", icon: "bi-graph-up-arrow", status: "visible", jobCount: 19, sortOrder: 4 },
  { id: "CAT-FIN", name: "Tài chính / Kế toán", icon: "bi-cash-coin", status: "visible", jobCount: 15, sortOrder: 5 },
  { id: "CAT-HR", name: "Nhân sự / Hành chính", icon: "bi-people", status: "visible", jobCount: 11, sortOrder: 6 }
];

export const ADMIN_SKILLS_FIXTURE = [
  { id: "SK-01", name: "React", categoryId: "CAT-IT" },
  { id: "SK-02", name: "TypeScript", categoryId: "CAT-IT" },
  { id: "SK-03", name: "Java", categoryId: "CAT-IT" },
  { id: "SK-04", name: "Spring Boot", categoryId: "CAT-IT" },
  { id: "SK-05", name: "PostgreSQL", categoryId: "CAT-IT" },
  { id: "SK-06", name: "Python", categoryId: "CAT-IT" },
  { id: "SK-07", name: "Docker", categoryId: "CAT-IT" },
  { id: "SK-08", name: "Figma", categoryId: "CAT-DESIGN" },
  { id: "SK-09", name: "UI/UX", categoryId: "CAT-DESIGN" },
  { id: "SK-10", name: "Design System", categoryId: "CAT-DESIGN" }
];

export const ADMIN_REVIEWS_FIXTURE = [
  {
    id: "REV-101",
    jobId: "JOB-2045",
    type: "job",
    title: "AI / Data Engineer (Python & Vector DB)",
    jobTitle: "AI / Data Engineer (Python & Vector DB)",
    company: "FPT Digital Talent",
    companyName: "FPT Digital Talent",
    status: "Chờ duyệt",
    risk: "Trung bình",
    submitted: "15/09/2026 10:30",
    submittedAt: "15/09/2026 10:30",
    details: "Tin đăng có chứa từ khóa liên quan đến trí tuệ nhân tạo cần kiểm tra định mức lương công khai.",
    reason: "Tin đăng có chứa từ khóa liên quan đến trí tuệ nhân tạo cần kiểm tra định mức lương công khai."
  },
  {
    id: "REV-102",
    jobId: "JOB-9012",
    type: "job",
    title: "Cộng tác viên Nhập liệu tại nhà (Lương 20Tr/tuần)",
    jobTitle: "Cộng tác viên Nhập liệu tại nhà (Lương 20Tr/tuần)",
    company: "Công ty TNHH Minh Khang (Chưa xác minh)",
    companyName: "Công ty TNHH Minh Khang (Chưa xác minh)",
    status: "Cần kiểm tra",
    risk: "Cao",
    submitted: "15/09/2026 14:15",
    submittedAt: "15/09/2026 14:15",
    details: "Cảnh báo AI: Dấu hiệu tuyển dụng lừa đảo nạp tiền làm nhiệm vụ, mô tả thiếu minh bạch.",
    reason: "Cảnh báo AI: Dấu hiệu tuyển dụng lừa đảo nạp tiền làm nhiệm vụ, mô tả thiếu minh bạch."
  },
  {
    id: "REV-103",
    companyId: "COMP-06",
    type: "company",
    title: "Xác minh Doanh nghiệp Tích xanh",
    company: "Nova Retail Group",
    companyName: "Nova Retail Group",
    status: "Chờ xác minh",
    risk: "Cao",
    submitted: "16/09/2026 09:20",
    submittedAt: "16/09/2026 09:20",
    details: "Doanh nghiệp nộp bản sao Giấy phép ĐKKD MST 0108923412. Cần tra cứu đối chiếu trên cổng Quốc gia."
  },
  {
    id: "REV-104",
    jobId: "JOB-2048",
    type: "job",
    title: "Senior Product Designer",
    jobTitle: "Senior Product Designer",
    company: "VNG Corporation",
    companyName: "VNG Corporation",
    status: "Đã duyệt",
    risk: "Thấp",
    submitted: "14/09/2026 08:00",
    submittedAt: "14/09/2026 08:00",
    details: "Nội dung chuẩn mực từ Enterprise Partner.",
    note: "Đã xác thực chữ ký số"
  }
];

export const ADMIN_USERS_FIXTURE = [
  {
    id: "USR-1001",
    name: "Hà Minh Đức",
    fullName: "Hà Minh Đức",
    email: "admin@matchajob.vn",
    phone: "090 888 2026",
    role: "Quản trị viên",
    roleCode: "admin",
    status: "Hoạt động",
    statusCode: "active",
    joined: "01/01/2026",
    createdAt: "01/01/2026",
    avatar: "AD",
    lastLogin: "12/10/2026 17:00"
  },
  {
    id: "USR-1027",
    name: "FPT Digital Talent (Nguyễn Lan Anh)",
    fullName: "FPT Digital Talent (Nguyễn Lan Anh)",
    email: "talent@fpt.com",
    phone: "090 123 4567",
    role: "Nhà tuyển dụng",
    roleCode: "employer",
    companyName: "FPT Digital Talent",
    status: "Đã xác minh",
    statusCode: "active",
    joined: "17/09/2026",
    createdAt: "17/09/2026",
    avatar: "LA",
    lastLogin: "12/10/2026 16:30"
  },
  {
    id: "USR-1028",
    name: "Nguyễn An Khang",
    fullName: "Nguyễn An Khang",
    email: "ankhang.design@example.com",
    phone: "0909 123 456",
    role: "Ứng viên",
    roleCode: "candidate",
    status: "Hoạt động",
    statusCode: "active",
    joined: "18/09/2026",
    createdAt: "18/09/2026",
    avatar: "AK",
    lastLogin: "12/10/2026 15:10"
  },
  {
    id: "USR-1026",
    name: "Nova Retail (Trần Hoàng Nam)",
    fullName: "Nova Retail (Trần Hoàng Nam)",
    email: "hr@novaretail.vn",
    phone: "024 3899 1122",
    role: "Nhà tuyển dụng",
    roleCode: "employer",
    companyName: "Nova Retail Group",
    status: "Chờ xác minh",
    statusCode: "pending",
    joined: "16/09/2026",
    createdAt: "16/09/2026",
    avatar: "NR",
    lastLogin: "11/10/2026 11:20"
  },
  {
    id: "USR-1025",
    name: "Trần Minh Anh",
    fullName: "Trần Minh Anh",
    email: "minhanh@example.com",
    phone: "0912 345 678",
    role: "Ứng viên",
    roleCode: "candidate",
    status: "Hoạt động",
    statusCode: "active",
    joined: "15/09/2026",
    createdAt: "15/09/2026",
    avatar: "MA",
    lastLogin: "10/10/2026 09:45"
  }
];

export const ADMIN_REPORTS_FIXTURE = [
  {
    id: "RP-2026-0916",
    subject: "Yêu cầu đóng phí ứng tuyển & đặt cọc đồng phục",
    target: "Nova Retail Group",
    targetTitle: "Nova Retail Group",
    targetType: "company",
    companyId: "COMP-06",
    jobId: "JOB-2041",
    reporter: "Võ Kim Ngân",
    reporterName: "Võ Kim Ngân",
    severity: "Nghiêm trọng",
    age: "32 phút",
    status: "Đang xử lý",
    createdAt: "16/09/2026 14:20",
    description: "Ứng viên phản ánh người phụ trách tuyển dụng yêu cầu chuyển khoản 350.000đ tiền đồng phục trước khi nhận lịch phỏng vấn."
  },
  {
    id: "RP-2026-0915",
    subject: "Thông tin mức thu nhập mập mờ, sai lệch thực tế",
    target: "Moon Media & Talent Agency",
    targetTitle: "Moon Media & Talent Agency",
    targetType: "company",
    companyId: "COMP-07",
    reporter: "Trần Minh Anh",
    reporterName: "Trần Minh Anh",
    severity: "Trung bình",
    age: "2 giờ",
    status: "Mới",
    createdAt: "15/09/2026 10:15",
    description: "Đăng tuyển lương cứng 15 triệu nhưng khi trao đổi lại báo chỉ có hoa hồng CTV bán hàng trực tuyến không có lương cứng."
  },
  {
    id: "RP-2026-0914",
    subject: "Nội dung tuyển dụng có dấu hiệu phân biệt giới tính & độ tuổi",
    target: "Tin JOB-2041",
    targetTitle: "Tin JOB-2041",
    targetType: "job",
    jobId: "JOB-2041",
    reporter: "Ẩn danh",
    reporterName: "Ẩn danh",
    severity: "Cao",
    age: "5 giờ",
    status: "Đang xử lý",
    createdAt: "14/09/2026 16:30",
    description: "Yêu cầu chỉ tuyển nam dưới 25 tuổi, vi phạm quy định tiêu chuẩn bình đẳng cơ hội việc làm của MatchaJob."
  },
  {
    id: "RP-2026-0913",
    subject: "Giả mạo thương hiệu doanh nghiệp uy tín để lừa đảo",
    target: "FPT Career VN (Kênh mạo danh)",
    targetTitle: "FPT Career VN (Kênh mạo danh)",
    targetType: "external",
    reporter: "FPT Talent",
    reporterName: "FPT Talent",
    severity: "Cao",
    age: "1 ngày",
    status: "Đã xử lý",
    createdAt: "13/09/2026 09:00",
    resolution: "Đã gửi thông báo cảnh báo toàn sàn và khóa tên miền liên kết lừa đảo."
  }
];

export const ADMIN_AUDIT_LOGS_FIXTURE = [
  {
    id: "LOG-9001",
    actor: "Nguyễn Đại Hưng (Admin)",
    action: "APPROVE_JOB",
    target: "JOB-2048 - Senior Product Designer",
    ip: "118.69.182.45",
    status: "success",
    timestamp: "14/09/2026 09:15"
  },
  {
    id: "LOG-9002",
    actor: "Hệ thống AI Worker",
    action: "SCAN_JOB_CONTENT",
    target: "JOB-9012",
    ip: "127.0.0.1",
    status: "flagged",
    timestamp: "15/09/2026 14:15"
  }
];
