import { STORAGE_KEYS } from '../constants';
import { getItem, setItem } from '../utils/storage';
import { jobService } from './jobService';

const INITIAL_CANDIDATES = [
  {
    id: 1,
    name: 'Nguyễn An Khang',
    role: 'Senior Product Designer',
    initials: 'AK',
    experience: '5 năm',
    location: 'TP. Hồ Chí Minh',
    match: 96,
    skills: ['Figma', 'Design System', 'UX Research', 'Prototyping'],
    stage: 'Phỏng vấn',
    email: 'ankhang@example.com',
    phone: '090 123 4567',
    summary: 'Senior Product Designer với 5 năm kinh nghiệm dẫn dắt thiết kế các sản phẩm Fintech và SaaS quy mô lớn.',
    education: 'Cử nhân CNTT - Đại học Bách Khoa',
  },
  {
    id: 2,
    name: 'Trần Minh Anh',
    role: 'Product Designer',
    initials: 'MA',
    experience: '3 năm',
    location: 'Hà Nội',
    match: 93,
    skills: ['Figma', 'Prototype', 'Mobile UX', 'User Research'],
    stage: 'Sàng lọc',
    email: 'minhanh@example.com',
    phone: '091 234 5678',
    summary: 'Chuyên gia thiết kế UX ứng dụng di động với định hướng dữ liệu và tư duy trải nghiệm mượt mà.',
    education: 'Cử nhân Mỹ thuật Công nghiệp',
  },
  {
    id: 3,
    name: 'Lê Quốc Huy',
    role: 'Frontend Engineer',
    initials: 'QH',
    experience: '4 năm',
    location: 'Đà Nẵng',
    match: 91,
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Web Performance'],
    stage: 'Bài kiểm tra',
    email: 'quochuy@example.com',
    phone: '093 345 6789',
    summary: 'Frontend Engineer chuyên sâu về tối ưu web app React, kiến trúc component tái sử dụng cao.',
    education: 'Kỹ sư Phần mềm - Đại học FPT',
  },
  {
    id: 4,
    name: 'Phạm Thanh Hà',
    role: 'Data Analyst',
    initials: 'TH',
    experience: '2 năm',
    location: 'TP. Hồ Chí Minh',
    match: 88,
    skills: ['SQL', 'Power BI', 'Python', 'Data Modeling'],
    stage: 'Mới',
    email: 'thanhha@example.com',
    phone: '097 456 7890',
    summary: 'Data Analyst với khả năng xây dựng mô hình dự báo kinh doanh và thiết kế dashboard trực quan.',
    education: 'Cử nhân Kinh tế đối ngoại - FTU',
  },
  {
    id: 5,
    name: 'Võ Kim Ngân',
    role: 'Talent Acquisition',
    initials: 'KN',
    experience: '4 năm',
    location: 'TP. Hồ Chí Minh',
    match: 86,
    skills: ['Sourcing', 'ATS', 'Employer Branding', 'Interviewing'],
    stage: 'Đề nghị',
    email: 'kimngan@example.com',
    phone: '098 567 8901',
    summary: 'Chuyên viên tuyển dụng nhân sự công nghệ cấp cao với mạng lưới ứng viên IT rộng khắp.',
    education: 'Cử nhân Quản trị Nhân lực',
  },
  {
    id: 6,
    name: 'Đỗ Hoàng Long',
    role: 'Backend Engineer',
    initials: 'HL',
    experience: '3 năm',
    location: 'Hà Nội',
    match: 89,
    skills: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL'],
    stage: 'Phỏng vấn',
    email: 'hoanglong@example.com',
    phone: '094 678 9012',
    summary: 'Backend Engineer có kinh nghiệm thiết kế hệ thống thanh toán và xử lý luồng dữ liệu thời gian thực.',
    education: 'Kỹ sư Công nghệ Thông tin - HUST',
  },
];

export const candidateService = {
  getCandidates(filters = {}) {
    let list = INITIAL_CANDIDATES;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (filters.stage && filters.stage !== 'Tất cả') {
      list = list.filter((c) => c.stage === filters.stage);
    }
    if (filters.minMatch) {
      list = list.filter((c) => c.match >= filters.minMatch);
    }
    return list;
  },

  getCandidateById(id) {
    return INITIAL_CANDIDATES.find((c) => String(c.id) === String(id)) || null;
  },

  getProfile() {
    const saved = getItem(STORAGE_KEYS.CANDIDATE_PROFILE);
    if (saved) return saved;
    return {
      fullName: 'Nguyễn An Khang',
      email: 'ankhang@example.com',
      phone: '090 123 4567',
      role: 'Senior Product Designer',
      experience: '5 năm',
      location: 'TP. Hồ Chí Minh',
      bio: 'Product Designer đam mê tạo ra các giải pháp giao diện số tối ưu, thanh lịch và mang lại giá trị cao cho người dùng.',
      skills: ['Figma', 'Design System', 'UX Research', 'Prototyping', 'React Basics'],
      portfolio: 'https://behance.net/ankhang',
      linkedin: 'https://linkedin.com/in/ankhang',
    };
  },

  saveProfile(profileData) {
    setItem(STORAGE_KEYS.CANDIDATE_PROFILE, profileData);
    return profileData;
  },

  getSavedJobIds() {
    return getItem(STORAGE_KEYS.FAVORITES, [1, 2, 5]);
  },

  toggleSaveJob(jobId) {
    const list = this.getSavedJobIds();
    const id = Number(jobId);
    const index = list.indexOf(id);
    let updated;
    if (index >= 0) {
      updated = list.filter((item) => item !== id);
    } else {
      updated = [...list, id];
    }
    setItem(STORAGE_KEYS.FAVORITES, updated);
    return updated.includes(id);
  },

  getSavedJobs() {
    const ids = this.getSavedJobIds();
    const allJobs = jobService.getJobs();
    return allJobs.filter((j) => ids.includes(Number(j.id)));
  },

  analyzeCV(fileOrText) {
    return {
      score: 94,
      strengths: [
        'Kinh nghiệm 5 năm phù hợp tuyệt đối với yêu cầu Senior Level',
        'Bộ kỹ năng thiết kế Figma & Design System được trình bày rõ ràng',
        'Dự án đo lường được kết quả kinh doanh định lượng (Impact Metrics)',
      ],
      recommendations: [
        'Bổ sung thêm từ khóa về Design Operations và AI-Assisted Design',
        'Mô tả chi tiết phương pháp kiểm thử người dùng (Usability Testing)',
      ],
      keywordDensity: [
        { keyword: 'Design System', count: 6, relevance: 'Rất cao' },
        { keyword: 'UX Research', count: 4, relevance: 'Cao' },
        { keyword: 'Figma', count: 8, relevance: 'Tuyệt đối' },
      ],
    };
  },
};
