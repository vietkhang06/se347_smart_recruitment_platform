export const MOCK_CANDIDATES = [
  {
    id: 1,
    userId: "USR-1028",
    name: "Nguyễn An Khang",
    initials: "AK",
    role: "Senior Product Designer",
    email: "ankhang.design@example.com",
    phone: "0909 123 456",
    experience: "5 năm",
    location: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    education: "Cử nhân Thiết kế Đồ họa – ĐH Kiến Trúc TP.HCM",
    match: 96,
    skills: ["Figma", "Design System", "UX Research", "Prototyping", "A11y"],
    bio: "Chuyên gia thiết kế UX/UI với 5 năm kinh nghiệm thực chiến trong các sản phẩm Fintech, SaaS và nền tảng dịch vụ số quy mô lớn.",
    workHistory: [
      {
        period: "2023 – Nay",
        role: "Senior Product Designer tại FinTech Co.",
        desc: "Dẫn dắt thiết kế ứng dụng ngân hàng số đạt hơn 2 triệu active users; xây dựng Design System tiết kiệm 30% thời gian dev."
      },
      {
        period: "2021 – 2023",
        role: "UI/UX Designer tại Global Software Agency",
        desc: "Thiết kế trải nghiệm người dùng cho 8 dự án khách hàng quốc tế thị trường Nhật và Singapore."
      }
    ],
    appliedJobId: "JOB-2048",
    appliedJobTitle: "Senior Product Designer",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Phỏng vấn", // 5 stages: "Mới" | "Sàng lọc" | "Bài kiểm tra" | "Phỏng vấn" | "Đề nghị"
    appliedDate: "14/09/2026",
    statusBadge: "is-success"
  },
  {
    id: 2,
    userId: "USR-1025",
    name: "Trần Minh Anh",
    initials: "MA",
    role: "Product Designer",
    email: "minhanh@example.com",
    phone: "0912 345 678",
    experience: "3 năm",
    location: "Hà Nội",
    address: "Cầu Giấy, Hà Nội",
    education: "Cử nhân CNTT – ĐH Bách Khoa Hà Nội",
    match: 93,
    skills: ["Figma", "Prototype", "Mobile App", "Research", "Wireframe"],
    bio: "Product Designer năng động với thế mạnh nghiên cứu hành vi người dùng trên các ứng dụng di động thương mại điện tử.",
    workHistory: [
      {
        period: "2023 – Nay",
        role: "UI/UX Designer tại Retail Corp",
        desc: "Thiết kế luồng mua sắm và tối ưu tỷ lệ chuyển đổi cho app mua sắm."
      }
    ],
    appliedJobId: "JOB-2048",
    appliedJobTitle: "Senior Product Designer",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Sàng lọc",
    appliedDate: "15/09/2026",
    statusBadge: "is-neutral"
  },
  {
    id: 3,
    userId: "USR-1024",
    name: "Lê Quốc Huy",
    initials: "QH",
    role: "Frontend Engineer",
    email: "quochuy@example.com",
    phone: "0934 567 890",
    experience: "4 năm",
    location: "Đà Nẵng",
    address: "Hải Châu, Đà Nẵng",
    education: "Kỹ sư Phần mềm – ĐH Bách Khoa Đà Nẵng",
    match: 91,
    skills: ["React", "TypeScript", "Redux", "A11y", "Tailwind CSS"],
    bio: "Kỹ sư giao diện chuyên sâu về React và tối ưu hiệu năng web, đam mê xây dựng giao diện mượt mà và chuẩn SEO.",
    workHistory: [
      {
        period: "2022 – Nay",
        role: "Frontend Dev tại Tech Solution Da Nang",
        desc: "Phát triển web app quản trị doanh nghiệp phục vụ 50.000 người dùng hàng ngày."
      }
    ],
    appliedJobId: "JOB-2047",
    appliedJobTitle: "Frontend Engineer (React / TypeScript)",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Bài kiểm tra",
    appliedDate: "13/09/2026",
    statusBadge: "is-warning"
  },
  {
    id: 4,
    userId: "USR-1023",
    name: "Phạm Thanh Hà",
    initials: "TH",
    role: "Data Analyst",
    email: "thanhha@example.com",
    phone: "0945 678 901",
    experience: "2 năm",
    location: "TP. Hồ Chí Minh",
    address: "Bình Thạnh, TP.HCM",
    education: "Cử nhân Hệ thống Thông tin Kinh tế – ĐH Kinh Tế TP.HCM",
    match: 88,
    skills: ["SQL", "Power BI", "Python", "Tableau", "Excel Advanced"],
    bio: "Chuyên viên phân tích dữ liệu yêu thích việc biến các con số phức tạp thành biểu đồ trực quan phục vụ ra quyết định kinh doanh.",
    workHistory: [
      {
        period: "2024 – Nay",
        role: "Junior Data Analyst tại Logistics Hub",
        desc: "Xây dựng dashboard theo dõi chỉ số SLA vận tải hàng ngày."
      }
    ],
    appliedJobId: "JOB-2046",
    appliedJobTitle: "Data Analyst (BI & Analytics)",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Mới",
    appliedDate: "17/09/2026",
    statusBadge: "is-neutral"
  },
  {
    id: 5,
    userId: "USR-1022",
    name: "Võ Kim Ngân",
    initials: "KN",
    role: "Talent Acquisition Specialist",
    email: "kimngan@example.com",
    phone: "0956 789 012",
    experience: "4 năm",
    location: "TP. Hồ Chí Minh",
    address: "Quận 3, TP.HCM",
    education: "Cử nhân Quản trị Nhân lực – ĐH Mở TP.HCM",
    match: 86,
    skills: ["IT Sourcing", "ATS", "Employer Branding", "Headhunt", "Behavioral Interview"],
    bio: "Chuyên gia tuyển dụng IT với mạng lưới quan hệ sâu rộng trong cộng đồng lập trình viên Việt Nam.",
    workHistory: [
      {
        period: "2022 – Nay",
        role: "Talent Acquisition tại Headhunt Agency",
        desc: "Tuyển mộ thành công hơn 60 vị trí Senior Developer và Tech Lead cho các tập đoàn công nghệ."
      }
    ],
    appliedJobId: "JOB-2045",
    appliedJobTitle: "Talent Acquisition Specialist",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Đề nghị",
    appliedDate: "10/09/2026",
    statusBadge: "is-success"
  }
];
