/**
 * Fixture: Ứng viên & Đơn ứng tuyển (Candidates & Applications)
 */
export const APPLICATIONS_FIXTURE = [
  {
    id: "APP-1001",
    candidateId: "CAND-01",
    userId: "USR-1028",
    candidateName: "Nguyễn An Khang",
    initials: "AK",
    candidateRole: "Senior Product Designer",
    candidateEmail: "ankhang.design@example.com",
    candidatePhone: "0909 123 456",
    location: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    education: "Cử nhân Thiết kế Đồ họa – ĐH Kiến Trúc TP.HCM",
    experience: "5 năm",
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
    stage: "Phỏng vấn",
    stageCode: "interview",
    matchScore: 96,
    appliedDate: "14/09/2026",
    coverLetter: "Tôi rất hào hứng với sứ mệnh kiến tạo sản phẩm số quy mô lớn tại FPT và tin rằng kinh nghiệm xây dựng Design System của tôi sẽ đóng góp tích cực cho team.",
    cvSnapshotUrl: "https://example.com/cv/nguyen-an-khang.pdf"
  },
  {
    id: "APP-1002",
    candidateId: "CAND-02",
    userId: "USR-1025",
    candidateName: "Trần Minh Anh",
    initials: "MA",
    candidateRole: "Product Designer",
    candidateEmail: "minhanh@example.com",
    candidatePhone: "0912 345 678",
    location: "Hà Nội",
    address: "Cầu Giấy, Hà Nội",
    education: "Cử nhân CNTT – ĐH Bách Khoa Hà Nội",
    experience: "3 năm",
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
    stage: "Bài kiểm tra",
    stageCode: "testing",
    matchScore: 93,
    appliedDate: "13/09/2026",
    coverLetter: "Với thế mạnh về tối ưu chuyển đổi và mobile app, tôi mong muốn được thử sức với các bài toán quy mô lớn hơn tại FPT.",
    cvSnapshotUrl: "https://example.com/cv/tran-minh-anh.pdf"
  },
  {
    id: "APP-1003",
    candidateId: "CAND-03",
    userId: "USR-1021",
    candidateName: "Lê Hoàng Nam",
    initials: "HN",
    candidateRole: "UI Designer",
    candidateEmail: "hoangnam.ui@example.com",
    candidatePhone: "0987 654 321",
    location: "Đà Nẵng",
    address: "Hải Châu, Đà Nẵng",
    education: "Cử nhân Mỹ thuật Công nghiệp – ĐH Nghệ thuật Huế",
    experience: "4 năm",
    skills: ["Visual Design", "Figma", "Design Tokens", "Illustration", "Brand"],
    bio: "Visual/UI Designer đam mê thẩm mỹ tinh tế, pixel-perfect và các tương tác micro-animations.",
    workHistory: [
      {
        period: "2022 – Nay",
        role: "Visual Lead tại Creative Studio",
        desc: "Chịu trách nhiệm thẩm mỹ và nhận diện hình ảnh cho các web app cao cấp."
      }
    ],
    appliedJobId: "JOB-2048",
    appliedJobTitle: "Senior Product Designer",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Sàng lọc",
    stageCode: "screening",
    matchScore: 89,
    appliedDate: "12/09/2026",
    coverLetter: "Mong muốn đóng góp năng lực visual design và design tokens vào hệ thống sản phẩm số của quý công ty.",
    cvSnapshotUrl: "https://example.com/cv/le-hoang-nam.pdf"
  },
  {
    id: "APP-1004",
    candidateId: "CAND-04",
    userId: "USR-1018",
    candidateName: "Phạm Thùy Linh",
    initials: "TL",
    candidateRole: "UX Researcher & Designer",
    candidateEmail: "thuylinh.ux@example.com",
    candidatePhone: "0934 567 890",
    location: "TP. Hồ Chí Minh",
    address: "Bình Thạnh, TP.HCM",
    education: "Thạc sĩ Tương tác Người – Máy (HCI) – ĐH KH Tự Nhiên TP.HCM",
    experience: "2 năm",
    skills: ["User Interview", "Usability Test", "Figma", "Data Analysis"],
    bio: "UX Researcher chuyên sâu về định lượng và kiểm thử khả năng sử dụng của người dùng đa nền tảng.",
    workHistory: [
      {
        period: "2024 – Nay",
        role: "UX Researcher tại EdTech Startup",
        desc: "Thực hiện usability testing cải thiện 40% chỉ số giữ chân người học."
      }
    ],
    appliedJobId: "JOB-2048",
    appliedJobTitle: "Senior Product Designer",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Mới",
    stageCode: "new",
    matchScore: 87,
    appliedDate: "15/09/2026",
    coverLetter: "Hồ sơ ứng tuyển vị trí Product Designer với thế mạnh cốt lõi về nghiên cứu người dùng thực nghiệm.",
    cvSnapshotUrl: "https://example.com/cv/pham-thuy-linh.pdf"
  },
  {
    id: "APP-1005",
    candidateId: "CAND-05",
    userId: "USR-1015",
    candidateName: "Vũ Đình Trọng",
    initials: "DT",
    candidateRole: "Lead Product Designer",
    candidateEmail: "trongvu.lead@example.com",
    candidatePhone: "0945 678 901",
    location: "TP. Hồ Chí Minh",
    address: "Quận 7, TP.HCM",
    education: "Cử nhân CNTT – ĐH Quốc Tế (ĐHQG-HCM)",
    experience: "6 năm",
    skills: ["Design Strategy", "Figma", "Design Ops", "Product Thinking", "Agile"],
    bio: "Lead Designer với 6 năm kinh nghiệm dẫn dắt đội ngũ thiết kế, xây dựng quy trình DesignOps chuyên nghiệp.",
    workHistory: [
      {
        period: "2021 – Nay",
        role: "Head of Design tại E-logistics Co.",
        desc: "Dẫn dắt team 6 designers quản lý 3 ứng dụng phục vụ chuỗi cung ứng."
      }
    ],
    appliedJobId: "JOB-2048",
    appliedJobTitle: "Senior Product Designer",
    companyId: "COMP-01",
    companyName: "FPT Digital Talent",
    stage: "Đề nghị",
    stageCode: "offer",
    matchScore: 94,
    appliedDate: "10/09/2026",
    coverLetter: "Đã hoàn thành các vòng phỏng vấn chuyên môn và đang trao đổi về chế độ đãi ngộ.",
    cvSnapshotUrl: "https://example.com/cv/vu-dinh-trong.pdf"
  }
];
