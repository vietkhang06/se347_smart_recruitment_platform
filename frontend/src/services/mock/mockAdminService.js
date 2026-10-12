import {
  ADMIN_REVIEWS_FIXTURE,
  ADMIN_USERS_FIXTURE,
  ADMIN_REPORTS_FIXTURE,
  ADMIN_CATEGORIES_FIXTURE,
  ADMIN_AUDIT_LOGS_FIXTURE
} from "../../fixtures/admin.fixture";

const STORAGE_KEYS = {
  REVIEWS: "matchajob_store_reviews_v2",
  USERS: "matchajob_store_users_v2",
  REPORTS: "matchajob_store_reports_v2",
  CATEGORIES: "matchajob_store_categories_v2",
  LOGS: "matchajob_store_logs_v2"
};

function delay(ms = 60) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export const mockAdminService = {
  async getReviews() {
    await delay();
    const list = load(STORAGE_KEYS.REVIEWS, ADMIN_REVIEWS_FIXTURE);
    return list.map((r) => ({
      ...r,
      type: r.type || (r.jobId ? "job" : "company"),
      title: r.title || r.jobTitle || "Duyệt thông tin",
      company: r.company || r.companyName || "Doanh nghiệp",
      submitted: r.submitted || r.submittedAt || "Gần đây",
      details: r.details || r.reason || ""
    }));
  },

  async approveReview(reviewId, notes = "") {
    await delay();
    const list = await this.getReviews();
    const next = list.map((r) => (String(r.id) === String(reviewId) ? { ...r, status: "Đã duyệt", notes } : r));
    save(STORAGE_KEYS.REVIEWS, next);
    return true;
  },

  async rejectReview(reviewId, reason = "") {
    await delay();
    const list = await this.getReviews();
    const next = list.map((r) => (String(r.id) === String(reviewId) ? { ...r, status: "Đã từ chối", reason } : r));
    save(STORAGE_KEYS.REVIEWS, next);
    return true;
  },

  async getUsers() {
    await delay();
    const list = load(STORAGE_KEYS.USERS, ADMIN_USERS_FIXTURE);
    return list.map((u) => ({
      ...u,
      name: u.name || u.fullName || "Người dùng",
      fullName: u.fullName || u.name || "Người dùng",
      role: u.role || (u.roleCode === "admin" ? "Quản trị viên" : u.roleCode === "employer" ? "Nhà tuyển dụng" : "Ứng viên"),
      status: u.status || (u.statusCode === "active" ? "Hoạt động" : "Chờ xác minh"),
      joined: u.joined || u.createdAt || "01/01/2026",
      avatar: u.avatar || (u.name || u.fullName || "US").slice(0, 2).toUpperCase()
    }));
  },

  async getReports() {
    await delay();
    const list = load(STORAGE_KEYS.REPORTS, ADMIN_REPORTS_FIXTURE);
    return list.map((r) => ({
      ...r,
      subject: r.subject || r.targetTitle || "Báo cáo vi phạm",
      target: r.target || r.targetTitle || "Đối tượng liên quan",
      reporter: r.reporter || r.reporterName || "Ẩn danh",
      age: r.age || r.createdAt || "Gần đây"
    }));
  },

  async resolveReport(reportId, actionTaken, resolution = "") {
    await delay();
    const list = await this.getReports();
    const next = list.map((r) =>
      String(r.id) === String(reportId) ? { ...r, status: "Đã xử lý", actionTaken, resolution } : r
    );
    save(STORAGE_KEYS.REPORTS, next);
    return true;
  },

  async getCategories() {
    await delay();
    return load(STORAGE_KEYS.CATEGORIES, ADMIN_CATEGORIES_FIXTURE);
  },

  async getAuditLogs() {
    await delay();
    return load(STORAGE_KEYS.LOGS, ADMIN_AUDIT_LOGS_FIXTURE);
  }
};
