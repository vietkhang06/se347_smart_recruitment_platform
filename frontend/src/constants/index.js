export const ROLES = {
  CANDIDATE: 'candidate',
  EMPLOYER: 'employer',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.CANDIDATE]: 'Ứng viên',
  [ROLES.EMPLOYER]: 'Nhà tuyển dụng',
  [ROLES.ADMIN]: 'Quản trị viên',
};

export const APPLICATION_STAGES = [
  'Mới',
  'Sàng lọc',
  'Bài kiểm tra',
  'Phỏng vấn',
  'Đề nghị',
  'Từ chối',
];

export const JOB_STATUSES = [
  'Đang tuyển',
  'Chờ duyệt',
  'Tạm dừng',
  'Đã đóng',
];

export const JOB_TYPES = [
  'Toàn thời gian',
  'Bán thời gian',
  'Thực tập',
  'Hybrid',
  'Từ xa',
];

export const SALARY_RANGES = [
  'Dưới 15 triệu',
  '15–25 triệu',
  '25–40 triệu',
  'Trên 40 triệu',
  'Thỏa thuận',
];

export const EXPERIENCE_LEVELS = [
  'Tất cả kinh nghiệm',
  'Chưa có kinh nghiệm',
  'Dưới 1 năm',
  '1–3 năm',
  '3–5 năm',
  'Trên 5 năm',
];

export const LOCATIONS = [
  'Tất cả địa điểm',
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Hybrid / Từ xa',
];

export const CATEGORIES = [
  'Tất cả ngành nghề',
  'Công nghệ thông tin',
  'Thiết kế / Sáng tạo',
  'Dữ liệu & AI',
  'Kinh doanh / Bán hàng',
  'Marketing / Truyền thông',
  'Tài chính / Kế toán',
];

export const STORAGE_KEYS = {
  DEMO_USER: 'matchajob-demo-user',
  FAVORITES: 'matchajob-favorites',
  APPLICATIONS: 'matchajob-applications',
  EMPLOYER_JOBS: 'matchajob-employer-posts',
  CANDIDATE_PROFILE: 'matchajob-candidate-profile',
  THEME: 'matchajob-theme',
};
