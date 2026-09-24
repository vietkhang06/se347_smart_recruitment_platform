import { STORAGE_KEYS } from '../constants';
import { getItem, setItem } from '../utils/storage';

const INITIAL_JOBS = [
  {
    id: 1,
    title: 'Product Designer',
    company: 'FPT Software',
    logo: 'FP',
    salary: '30–45 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Toàn thời gian',
    match: 96,
    category: 'Thiết kế / Sáng tạo',
    exp: '2+ năm',
    posted: '2 giờ trước',
    status: 'Đang tuyển',
    applicants: 48,
    views: 1284,
    description: 'Thiết kế trải nghiệm người dùng và giao diện cho các nền tảng số quy mô lớn phục vụ hàng triệu người dùng. Xây dựng Design System chuẩn chỉnh.',
    requirements: ['2+ năm kinh nghiệm Figma & UX Research', 'Khả năng xây dựng Design System', 'Tư duy thiết kế lấy người dùng làm trung tâm'],
    skills: ['Figma', 'Design System', 'UX Research', 'Prototyping'],
  },
  {
    id: 2,
    title: 'Frontend Developer',
    company: 'VNG',
    logo: 'VN',
    salary: '25–40 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Toàn thời gian',
    match: 93,
    category: 'Công nghệ thông tin',
    exp: '1–3 năm',
    posted: '4 giờ trước',
    status: 'Đang tuyển',
    applicants: 36,
    views: 972,
    description: 'Phát triển giao diện web hiện đại với React/Next.js, tối ưu hóa hiệu năng và trải nghiệm người dùng mượt mà trên mọi thiết bị.',
    requirements: ['Thành thạo React, TypeScript, Tailwind CSS', 'Kinh nghiệm tối ưu Web Performance', 'Có tư duy clean code và teamwork tốt'],
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Web Performance'],
  },
  {
    id: 3,
    title: 'Data Analyst',
    company: 'DataFlow',
    logo: 'DF',
    salary: '22–35 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Toàn thời gian',
    match: 91,
    category: 'Dữ liệu & AI',
    exp: '1+ năm',
    posted: 'Hôm nay',
    status: 'Chờ duyệt',
    applicants: 27,
    views: 756,
    description: 'Khai phá dữ liệu người dùng, xây dựng dashboard trực quan hóa trên Power BI / Tableau để hỗ trợ ra quyết định kinh doanh.',
    requirements: ['Thành thạo SQL, Python (Pandas/NumPy)', 'Kinh nghiệm với Power BI hoặc Tableau', 'Khả năng phân tích số liệu nhạy bén'],
    skills: ['SQL', 'Power BI', 'Python', 'Data Analytics'],
  },
  {
    id: 4,
    title: 'Backend Developer',
    company: 'MoMo',
    logo: 'MM',
    salary: '28–45 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Toàn thời gian',
    match: 90,
    category: 'Công nghệ thông tin',
    exp: '2–4 năm',
    posted: 'Hôm nay',
    status: 'Đang tuyển',
    applicants: 42,
    views: 1150,
    description: 'Xây dựng API microservices chịu tải cao, bảo mật cho hệ sinh thái thanh toán ví điện tử hàng đầu Việt Nam.',
    requirements: ['Kinh nghiệm Java Spring Boot hoặc Go/NodeJS', 'Kiến thức vững về CSDL quan hệ và NoSQL', 'Hiểu biết về Kafka, Redis, Docker'],
    skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Microservices'],
  },
  {
    id: 5,
    title: 'UI/UX Designer',
    company: 'Tiki',
    logo: 'TK',
    salary: '20–32 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Hybrid',
    match: 88,
    category: 'Thiết kế / Sáng tạo',
    exp: '1–2 năm',
    posted: '1 ngày trước',
    status: 'Đang tuyển',
    applicants: 29,
    views: 890,
    description: 'Nghiên cứu hành vi mua sắm thương mại điện tử, thiết kế luồng thanh toán và giỏ hàng tối ưu tỷ lệ chuyển đổi.',
    requirements: ['Tối thiểu 1 năm UI/UX cho E-commerce', 'Thành thạo công cụ Figma, Adobe XD', 'Hiểu biết về A/B testing'],
    skills: ['UI/UX', 'Figma', 'E-commerce', 'A/B Testing'],
  },
  {
    id: 6,
    title: 'QA Automation Engineer',
    company: 'KMS Technology',
    logo: 'KM',
    salary: '18–30 triệu',
    location: 'Đà Nẵng',
    type: 'Toàn thời gian',
    match: 86,
    category: 'Công nghệ thông tin',
    exp: '1+ năm',
    posted: '1 ngày trước',
    status: 'Đã đóng',
    applicants: 22,
    views: 645,
    description: 'Xây dựng framework kiểm thử tự động cho hệ thống web và mobile app với Cypress và Selenium.',
    requirements: ['Kinh nghiệm viết test tự động bằng JS/Python', 'Hiểu biết về CI/CD pipeline', 'Khả năng tìm bug và phân tích nguyên nhân gốc'],
    skills: ['Cypress', 'Selenium', 'Automation Testing', 'CI/CD'],
  },
  {
    id: 7,
    title: 'Business Analyst',
    company: 'NashTech',
    logo: 'NT',
    salary: '20–34 triệu',
    location: 'Hà Nội',
    type: 'Toàn thời gian',
    match: 84,
    category: 'Kinh doanh / Bán hàng',
    exp: '2+ năm',
    posted: '2 ngày trước',
    status: 'Đang tuyển',
    applicants: 31,
    views: 820,
    description: 'Lấy yêu cầu khách hàng quốc tế, viết tài liệu đặc tả SRS/User Story và phối hợp cùng dev team triển khai.',
    requirements: ['Tiếng Anh giao tiếp tốt (IELTS 6.5+)', 'Kỹ năng viết User Stories, Use Cases', 'Khả năng kết nối giữa Business và Tech'],
    skills: ['Business Analysis', 'UML', 'User Stories', 'English'],
  },
  {
    id: 8,
    title: 'Mobile Developer',
    company: 'Zalo',
    logo: 'ZA',
    salary: '26–42 triệu',
    location: 'TP. Hồ Chí Minh',
    type: 'Hybrid',
    match: 89,
    category: 'Công nghệ thông tin',
    exp: '2+ năm',
    posted: '2 ngày trước',
    status: 'Đang tuyển',
    applicants: 38,
    views: 940,
    description: 'Phát triển các module cốt lõi cho ứng dụng nhắn tin và mạng xã hội phục vụ hơn 70 triệu người dùng tích cực.',
    requirements: ['Thành thạo Flutter hoặc React Native hoặc iOS/Android Native', 'Kinh nghiệm tối ưu memory, battery usage', 'Hiểu biết về socket/realtime'],
    skills: ['Flutter', 'React Native', 'Mobile Apps', 'WebSocket'],
  },
];

export const jobService = {
  getJobs(filters = {}) {
    let list = getItem(STORAGE_KEYS.EMPLOYER_JOBS, INITIAL_JOBS);
    if (!list || list.length === 0) {
      list = INITIAL_JOBS;
      setItem(STORAGE_KEYS.EMPLOYER_JOBS, list);
    }

    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skills?.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (filters.category && filters.category !== 'Tất cả ngành nghề') {
      list = list.filter((j) => j.category === filters.category);
    }
    if (filters.location && filters.location !== 'Tất cả địa điểm') {
      list = list.filter((j) => j.location.includes(filters.location));
    }
    if (filters.type && filters.type !== 'Tất cả hình thức') {
      list = list.filter((j) => j.type === filters.type);
    }
    if (filters.status && filters.status !== 'Tất cả') {
      list = list.filter((j) => j.status === filters.status);
    }

    return list;
  },

  getJobById(id) {
    const list = this.getJobs();
    return list.find((j) => String(j.id) === String(id)) || null;
  },

  createJob(jobData) {
    const current = this.getJobs();
    const newJob = {
      id: `JOB-${Date.now().toString().slice(-4)}`,
      title: jobData.title,
      company: jobData.company || 'FPT Digital Talent',
      logo: 'MJ',
      salary: jobData.salary || 'Thỏa thuận',
      location: jobData.location || 'TP. Hồ Chí Minh',
      type: jobData.type || 'Toàn thời gian',
      category: jobData.category || 'Công nghệ thông tin',
      exp: jobData.exp || '1–3 năm',
      match: Math.floor(Math.random() * 15) + 85,
      posted: 'Vừa xong',
      status: 'Đang tuyển',
      applicants: 0,
      views: 1,
      description: jobData.description || '',
      skills: jobData.skills || ['React', 'Communication'],
      requirements: jobData.requirements || ['Đam mê và trách nhiệm cao'],
    };
    const updated = [newJob, ...current];
    setItem(STORAGE_KEYS.EMPLOYER_JOBS, updated);
    return newJob;
  },

  updateJobStatus(id, newStatus) {
    const current = this.getJobs();
    const updated = current.map((j) =>
      String(j.id) === String(id) ? { ...j, status: newStatus } : j
    );
    setItem(STORAGE_KEYS.EMPLOYER_JOBS, updated);
    return updated;
  },
};
