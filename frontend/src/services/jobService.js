import { mockStore } from "./mockStore";

// Chuyển hạn nộp dạng DD/MM/YYYY hoặc YYYY-MM-DD
// thành thời điểm cuối ngày theo giờ trên máy.
function getDeadlineTime(value) {
  if (!value) return null;

  const text = String(value).trim();
  let year;
  let month;
  let day;

  const vietnameseDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (vietnameseDate) {
    day = Number(vietnameseDate[1]);
    month = Number(vietnameseDate[2]);
    year = Number(vietnameseDate[3]);
  } else if (isoDate) {
    year = Number(isoDate[1]);
    month = Number(isoDate[2]);
    day = Number(isoDate[3]);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Tránh JavaScript tự chuyển ngày không hợp lệ sang tháng sau.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

// Quy tắc hiện tại:
// chỉ công khai tin đang tuyển và chưa hết hạn.
export function isJobOpen(job, now = Date.now()) {
  if (!job || job.status !== "Đang tuyển") {
    return false;
  }

  const deadline = getDeadlineTime(job.deadline);

  // Không có hạn nộp hợp lệ: chưa tự kết luận tin đã hết hạn.
  return deadline === null || deadline >= now;
}

export const jobService = {
  getJobsSnapshot: () => mockStore.getJobs(),
  getJobSnapshot: (id) => mockStore.getJobById(id),
  isAcceptingApplications: (job) => mockStore.isJobAcceptingApplications(job),
  getDemoStats: () => ({ candidates: mockStore.getCandidates().length, applications: mockStore.getApplications().length }),
  getEmployerContact: () => mockStore.getEmployerProfile(),
  // Danh sách công khai dành cho trang tìm việc.
  async getPublicJobs() {
    const jobs = mockStore.getJobs();

    return jobs.filter((job) => isJobOpen(job));
  },

  // Chi tiết một tin công khai.
  // Trả về null nếu mã sai, tin chưa công khai hoặc đã hết hạn.
  async getPublicJobById(id) {
    if (id === null || id === undefined || String(id).trim() === "") {
      return null;
    }

    const job = mockStore.getJobById(String(id));

    return isJobOpen(job) ? job : null;
  },
};