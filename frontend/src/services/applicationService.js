import { STORAGE_KEYS } from '../constants';
import { getItem, setItem } from '../utils/storage';
import { formatDate } from '../utils/formatters';

const DEFAULT_APPLICATIONS = [
  {
    id: 'APP-101',
    jobId: 1,
    title: 'Senior Product Designer',
    company: 'FPT Digital Talent',
    logo: 'FP',
    date: '18/09/2026',
    stage: 'Phỏng vấn',
    next: '19/09 · 09:00',
    notes: 'Phỏng vấn chuyên môn vòng 2 cùng Lead Designer',
  },
  {
    id: 'APP-102',
    jobId: 5,
    title: 'Product Designer',
    company: 'Tiki',
    logo: 'TK',
    date: '14/09/2026',
    stage: 'Bài kiểm tra',
    next: 'Hạn nộp 20/09',
    notes: 'Thiết kế luồng thanh toán Checkout One-step',
  },
  {
    id: 'APP-103',
    jobId: 2,
    title: 'UI/UX Designer',
    company: 'VNG',
    logo: 'VN',
    date: '09/09/2026',
    stage: 'Đã xem hồ sơ',
    next: 'Đang chờ phản hồi',
    notes: 'Hồ sơ đã chuyển sang Hiring Manager xét duyệt',
  },
];

export const applicationService = {
  getApplications() {
    return getItem(STORAGE_KEYS.APPLICATIONS, DEFAULT_APPLICATIONS);
  },

  applyForJob(job, candidateData = {}) {
    const current = this.getApplications();
    const existing = current.find((a) => String(a.jobId) === String(job.id));
    if (existing) {
      return { success: false, message: 'Bạn đã ứng tuyển vào vị trí này rồi.' };
    }

    const newApp = {
      id: `APP-${Date.now().toString().slice(-4)}`,
      jobId: job.id,
      title: job.title,
      company: job.company,
      logo: job.logo || 'MJ',
      date: formatDate(new Date()),
      stage: 'Mới',
      next: 'Chờ nhà tuyển dụng phản hồi',
      notes: candidateData.notes || 'Hồ sơ ứng tuyển đã được gửi thành công.',
    };

    const updated = [newApp, ...current];
    setItem(STORAGE_KEYS.APPLICATIONS, updated);
    return { success: true, application: newApp };
  },

  updateStage(applicationId, newStage, nextStep = '') {
    const current = this.getApplications();
    const updated = current.map((app) =>
      app.id === applicationId
        ? { ...app, stage: newStage, next: nextStep || app.next }
        : app
    );
    setItem(STORAGE_KEYS.APPLICATIONS, updated);
    return updated;
  },
};
