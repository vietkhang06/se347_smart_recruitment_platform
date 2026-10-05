// Dữ liệu mẫu phục vụ đồ án SE347.
// Không phải tin tuyển dụng thực tế của doanh nghiệp.

const positions = [
  {
    title: "Frontend Intern (React)",
    category: "Frontend",
    type: "Thực tập",
    experience: "Không yêu cầu kinh nghiệm",
    salary: "5 – 8 triệu VNĐ",
    location: "TP. Hồ Chí Minh",
    skills: ["React", "HTML", "CSS", "JavaScript"],
    description:
      "Xây dựng giao diện tìm kiếm và hồ sơ ứng viên, xử lý trạng thái tải và giao diện responsive.",
  },
  {
    title: "Backend Developer (Java / Spring Boot)",
    category: "Backend",
    type: "Toàn thời gian",
    experience: "2 năm",
    salary: "20 – 30 triệu VNĐ",
    location: "Hà Nội",
    skills: ["Java", "Spring Boot", "PostgreSQL"],
    description:
      "Phát triển API tuyển dụng, phân quyền người dùng và tối ưu truy vấn dữ liệu.",
  },
  {
    title: "Fullstack Developer (React / Node.js)",
    category: "Fullstack",
    type: "Hybrid",
    experience: "3 năm",
    salary: "30 – 45 triệu VNĐ",
    location: "TP. Hồ Chí Minh",
    skills: ["React", "Node.js", "TypeScript"],
    description:
      "Phát triển tính năng xuyên suốt từ giao diện tới API, kiểm thử và triển khai sản phẩm.",
  },
  {
    title: "Flutter Mobile Developer",
    category: "Mobile",
    type: "Toàn thời gian",
    experience: "1 năm",
    salary: "15 – 25 triệu VNĐ",
    location: "Đà Nẵng",
    skills: ["Flutter", "Dart", "REST API"],
    description:
      "Xây dựng ứng dụng di động đa nền tảng, tích hợp API và thông báo trong ứng dụng.",
  },
  {
    title: "Manual Tester Fresher",
    category: "Kiểm thử / QA",
    type: "Toàn thời gian",
    experience: "Không yêu cầu kinh nghiệm",
    salary: "8 – 12 triệu VNĐ",
    location: "Cần Thơ",
    skills: ["Test Case", "SQL", "Postman"],
    description:
      "Thiết kế test case cho luồng ứng tuyển, báo lỗi và xác nhận kết quả sửa lỗi.",
  },
  {
    title: "QA Automation Engineer",
    category: "Kiểm thử / QA",
    type: "Hybrid",
    experience: "3 năm",
    salary: "25 – 40 triệu VNĐ",
    location: "Hà Nội",
    skills: ["Playwright", "TypeScript", "CI/CD"],
    description:
      "Xây dựng bộ kiểm thử tự động cho web và API, tích hợp kiểm thử vào CI/CD.",
  },
  {
    title: "Data Analyst Junior",
    category: "Dữ liệu / AI",
    type: "Toàn thời gian",
    experience: "Dưới 1 năm",
    salary: "12 – 18 triệu VNĐ",
    location: "TP. Hồ Chí Minh",
    skills: ["SQL", "Python", "Power BI"],
    description:
      "Phân tích hành vi người dùng, xây dựng dashboard và kiểm tra chất lượng dữ liệu.",
  },
  {
    title: "Machine Learning Engineer",
    category: "Dữ liệu / AI",
    type: "Làm việc từ xa",
    experience: "3 năm",
    salary: "35 – 50 triệu VNĐ",
    location: "Toàn quốc",
    skills: ["Python", "PyTorch", "MLOps"],
    description:
      "Xây dựng mô hình gợi ý công việc, đánh giá độ chính xác và theo dõi mô hình sau triển khai.",
  },
  {
    title: "Senior DevOps Engineer",
    category: "DevOps / Cloud",
    type: "Hybrid",
    experience: "5 năm",
    salary: "50 – 70 triệu VNĐ",
    location: "TP. Hồ Chí Minh",
    skills: ["Docker", "Kubernetes", "AWS", "Terraform"],
    description:
      "Tự động hóa triển khai, giám sát hệ thống và xây dựng quy trình khôi phục dịch vụ.",
  },
  {
    title: "Cloud Engineer (Azure)",
    category: "DevOps / Cloud",
    type: "Hợp đồng",
    experience: "2 năm",
    salary: "25 – 35 triệu VNĐ",
    location: "Hà Nội",
    skills: ["Azure", "Linux", "CI/CD"],
    description:
      "Vận hành hạ tầng cloud, quản lý cấu hình và tối ưu chi phí môi trường thử nghiệm.",
  },
  {
    title: "Security Analyst",
    category: "An toàn thông tin",
    type: "Toàn thời gian",
    experience: "1 năm",
    salary: "18 – 28 triệu VNĐ",
    location: "Đà Nẵng",
    skills: ["OWASP", "SIEM", "Linux"],
    description:
      "Phân tích cảnh báo bảo mật và phối hợp khắc phục lỗ hổng trên hệ thống thử nghiệm được cấp quyền.",
  },
  {
    title: "IT Support / Network Engineer",
    category: "Hệ thống / Mạng",
    type: "Toàn thời gian",
    experience: "Dưới 1 năm",
    salary: "8 – 10 triệu VNĐ",
    location: "Hải Phòng",
    skills: ["TCP/IP", "Windows", "Linux"],
    description:
      "Hỗ trợ thiết bị làm việc, xử lý sự cố kết nối và cập nhật tài liệu vận hành nội bộ.",
  },
  {
    title: "UI/UX Designer (Web & Mobile)",
    category: "UI/UX sản phẩm số",
    type: "Freelance",
    experience: "2 năm",
    salary: "Thỏa thuận",
    location: "Toàn quốc",
    skills: ["Figma", "Prototyping", "UX Research"],
    description:
      "Thiết kế luồng trải nghiệm ứng viên và HR, tạo prototype và kiểm thử khả dụng.",
  },
  {
    title: "IT Business Analyst",
    category: "Business Analyst / Product",
    type: "Hybrid",
    experience: "2 năm",
    salary: "20 – 30 triệu VNĐ",
    location: "TP. Hồ Chí Minh",
    skills: ["BPMN", "User Story", "SQL"],
    description:
      "Thu thập yêu cầu, mô tả luồng nghiệp vụ và thống nhất tiêu chí nghiệm thu với nhóm phát triển.",
  },
  {
    title: "Frontend Developer Part-time",
    category: "Frontend",
    type: "Bán thời gian",
    experience: "1 năm",
    salary: "8 – 12 triệu VNĐ",
    location: "Cần Thơ",
    skills: ["Vue.js", "JavaScript", "CSS"],
    description:
      "Phát triển giao diện quản trị responsive và phối hợp tích hợp API theo lịch làm việc thỏa thuận.",
  },
  {
    title: "Backend Engineer (Python)",
    category: "Backend",
    type: "Làm việc từ xa",
    experience: "3 năm",
    salary: "30 – 45 triệu VNĐ",
    location: "Toàn quốc",
    skills: ["Python", "FastAPI", "Redis"],
    description:
      "Xây dựng API xử lý hồ sơ, hàng đợi tác vụ và cơ chế cache cho hệ thống tuyển dụng.",
  },
];

export const MOCK_IT_JOBS = positions.map((position, index) => ({
  id: `DEMO-IT-${String(index + 1).padStart(3, "0")}`,

  title: position.title,
  category: position.category,

  companyId: "COMP-01",
  company: "FPT Digital Talent",
  logo: "FP",
  team: "Engineering",

  type: position.type,
  workType: position.type,

  exp: position.experience,
  experience: position.experience,

  salary: position.salary,
  salaryMode:
    position.salary === "Thỏa thuận" ? "negotiable" : "range",

  location: position.location,
  address: position.location,

  status: "Đang tuyển",
  applicants: 0,
  views: 0,

  isDemo: true,

  posted: "05/10/2026",
  createdAt: "2026-10-05T08:00:00+07:00",
  deadline: "31/12/2026",

  specTags: position.skills,
  reqTags: [position.experience],

  desc: `[Dữ liệu mẫu đồ án] ${position.description}`,

  description: `
    <p>
      Tin mẫu phục vụ đồ án SE347, không phải thông báo
      tuyển dụng thực tế của doanh nghiệp.
    </p>
    <p>${position.description}</p>
  `,

  requirements: `
    <ul>
      <li>${position.experience}.</li>
      <li>
        Có kiến thức hoặc dự án sử dụng
        ${position.skills.join(", ")}.
      </li>
      <li>
        Biết sử dụng Git, phối hợp nhóm và mô tả giải pháp rõ ràng.
      </li>
    </ul>
  `,

  benefits: `
    <ul>
      <li>
        Nội dung phúc lợi minh họa: hỗ trợ đào tạo và review chuyên môn.
      </li>
      <li>Thu nhập minh họa: ${position.salary}.</li>
    </ul>
  `,

  schedule: `
    <p>
      Lịch làm việc mẫu: ${position.type}.
      Thời gian cụ thể thống nhất khi phỏng vấn.
    </p>
  `,

  summary: {
    industry: "Công nghệ thông tin",
    required: position.skills.join(", "),
    preferred: "Git, làm việc nhóm",
  },
}));