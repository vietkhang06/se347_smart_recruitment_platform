import { httpClient } from "./httpClient";
import { IS_API } from "./dataMode";
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

const salaryNumber = value => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const matchValue = job => {
  const value = job.matchScore ?? job.match;
  return value != null && String(value).trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : -1;
};
const postedTime = job => {
  const iso = Date.parse(job.postedAt);
  if (Number.isFinite(iso)) return iso;
  return getDeadlineTime(job.posted) || 0;
};
export const jobService = {
  async categories(options = {}) {
    if (IS_API) return httpClient.get("/v1/categories", { ...options, auth: false });
    return [...new Set(mockStore.getJobs().map(job => job.category || job.team).filter(Boolean))].map(name => ({ id: name, name }));
  },
  async search(filters = {}, options = {}) {
    const rawPage = Number(filters.page);
    const rawSize = Number(filters.size);
    const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
    const size = Number.isSafeInteger(rawSize) && rawSize > 0 ? Math.min(50, rawSize) : 8;
    if (IS_API) {
      const query = new URLSearchParams();
      for (const key of ["keyword", "categoryId", "level", "workType", "location", "salaryMin", "salaryMax", "sortBy"]) {
        if (filters[key]) query.set(key, filters[key]);
      }
      query.set("page", page); query.set("size", size);
      const result = await httpClient.get(`/v1/jobs?${query}`, { ...options, auth: false });
      if (!Array.isArray(result?.content)) throw new Error("Dữ liệu danh sách việc làm không hợp lệ.");
      return { ...result, content: result.content.map(mapApiJob) };
    }
    const q = String(filters.keyword || "").trim().toLowerCase();
    const jobs = mockStore.getJobs().filter(job => isJobOpen(job)
      && (!q || [job.title, job.company, job.location, job.category, job.team, ...(job.skills || []), ...(job.specTags || []), ...(job.reqTags || [])].join(" ").toLowerCase().includes(q))
      && (!filters.location || String(job.location).toLowerCase().includes(filters.location.toLowerCase()))
      && (!filters.categoryId || (job.category || job.team) === filters.categoryId)
      && (!filters.workType || job.type === filters.workType || job.workType === filters.workType)
      && (!filters.level || job.level === filters.level || job.exp === filters.level)
      && (!filters.experience || (job.experience || job.exp) === filters.experience));
    jobs.sort((a, b) => filters.sortBy === "salary_desc" ? salaryNumber(b.salaryMax || b.salaryMin) - salaryNumber(a.salaryMax || a.salaryMin)
      : filters.sortBy === "match_desc" ? matchValue(b) - matchValue(a)
      : filters.sortBy === "title_asc" ? a.title.localeCompare(b.title, "vi") : postedTime(b) - postedTime(a));
    return { content: jobs.slice(page * size, (page + 1) * size), page, size, totalElements: jobs.length, totalPages: Math.ceil(jobs.length / size) };
  },
  getJobsSnapshot: () => IS_API ? [] : mockStore.getJobs(),
  getJobSnapshot: (id) => IS_API ? null : mockStore.getJobById(id),
  isAcceptingApplications: (job) => IS_API ? isJobOpen(job) : mockStore.isJobAcceptingApplications(job),
  getDemoStats: () => ({ candidates: mockStore.getCandidates().length, applications: mockStore.getApplications().length }),
  getEmployerContact: () => IS_API ? {} : mockStore.getEmployerProfile(),
  // Danh sách công khai dành cho trang tìm việc.
  async getPublicJobs() {
    if (IS_API) return (await this.search()).content;
    const jobs = mockStore.getJobs();

    return jobs.filter((job) => isJobOpen(job));
  },

  // Chi tiết một tin công khai.
  // Trả về null nếu mã sai, tin chưa công khai hoặc đã hết hạn.
  async getPublicJobById(id, options = {}) {
    if (IS_API) {
      try { return mapApiJob(await httpClient.get(`/v1/jobs/${encodeURIComponent(id)}`, { ...options, auth: false })); }
      catch (error) { if (error.status === 404) return null; throw error; }
    }
    if (id === null || id === undefined || String(id).trim() === "") {
      return null;
    }

    const job = mockStore.getJobById(String(id));

    return isJobOpen(job) ? job : null;
  },
};
export function mapApiJob(raw) {
  const money = value => Number(value).toLocaleString("vi-VN");
  const salary = raw.salaryMode === "negotiable" || (raw.salaryMin == null && raw.salaryMax == null) ? "Thỏa thuận"
    : `${raw.salaryMin != null ? money(raw.salaryMin) : ""}${raw.salaryMin != null && raw.salaryMax != null ? " – " : ""}${raw.salaryMax != null ? money(raw.salaryMax) : ""} ${raw.salaryCurrency || "VND"}`;
  return { ...raw, company: raw.companyName || "Chưa cung cấp tên doanh nghiệp", logo: "DN", salary,
    categoryId: raw.category?.id, category: raw.category?.name || "", type: ({ full_time: "Toàn thời gian", part_time: "Bán thời gian", hybrid: "Kết hợp", remote: "Từ xa", contract: "Hợp đồng" })[raw.workType] || raw.workType || "Chưa cập nhật",
    exp: raw.experience || raw.level || "Chưa cập nhật", status: raw.status === "active" ? "Đang tuyển" : raw.status,
    posted: raw.postedAt ? new Date(raw.postedAt).toLocaleDateString("vi-VN") : "Chưa cập nhật",
    reqTags: (raw.skills || []).map(skill => typeof skill === "string" ? skill : skill.skillName).filter(Boolean),
    specTags: [], desc: "Xem chi tiết yêu cầu và thông tin tuyển dụng.", match: "", api: true };
}