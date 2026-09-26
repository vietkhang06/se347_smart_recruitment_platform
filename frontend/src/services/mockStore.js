import {
  MOCK_COMPANIES,
  MOCK_USERS,
  MOCK_JOBS,
  MOCK_CANDIDATES,
  MOCK_APPLICATIONS,
  MOCK_INTERVIEWS,
  MOCK_ADMIN_REVIEWS,
  MOCK_ADMIN_REPORTS,
  MOCK_ADMIN_CATEGORIES,
  MOCK_SYSTEM_SETTINGS,
  MOCK_SYSTEM_SERVICES,
  MOCK_ADMIN_NOTIFICATIONS,
  MOCK_AUDIT_LOGS,
  mapStageToCandidateStep
} from "../mock";

const STORAGE_KEYS = {
  COMPANIES: "matchajob_store_companies",
  USERS: "matchajob_store_users",
  JOBS: "matchajob_store_jobs",
  CANDIDATES: "matchajob_store_candidates",
  APPLICATIONS: "matchajob_store_applications",
  INTERVIEWS: "matchajob_store_interviews",
  REVIEWS: "matchajob_store_reviews",
  REPORTS: "matchajob_store_reports",
  CATEGORIES: "matchajob_store_categories",
  SETTINGS: "matchajob_store_settings",
  NOTIFICATIONS: "matchajob_store_notifications",
  LOGS: "matchajob_store_logs",
  EMPLOYER_PROFILE: "matchajob_store_employer_profile",
  CANDIDATE_PROFILE: "matchajob-candidate-profile",
  PLANS: "matchajob_store_plans"
};

// Safe JSON loader
function load(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[mockStore] Failed to load ${key}, falling back to default`, err);
    return defaultData;
  }
}

// Safe JSON saver
function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("matchajob:store-changed", { detail: { key, data } }));
  } catch (err) {
    console.error(`[mockStore] Failed to save ${key}`, err);
  }
}

export const mockStore = {
  // ==========================================
  // 1. DOANH NGHIỆP (COMPANIES)
  // ==========================================
  getCompanies() {
    return load(STORAGE_KEYS.COMPANIES, MOCK_COMPANIES);
  },

  getCompany(id = "COMP-01") {
    const list = this.getCompanies();
    return list.find((c) => c.id === id) || list[0];
  },

  saveCompany(updatedCompany) {
    const list = this.getCompanies();
    const next = list.map((c) => (c.id === updatedCompany.id ? { ...c, ...updatedCompany } : c));
    save(STORAGE_KEYS.COMPANIES, next);
    return updatedCompany;
  },

  // ==========================================
  // 2. TIN TUYỂN DỤNG (JOBS)
  // ==========================================
  getJobs() {
    return load(STORAGE_KEYS.JOBS, MOCK_JOBS);
  },

  getJobById(id) {
    const jobs = this.getJobs();
    return jobs.find((j) => String(j.id) === String(id));
  },

  getEmployerJobs(companyId = "COMP-01") {
    const jobs = this.getJobs();
    return jobs.filter((j) => j.companyId === companyId);
  },

  saveJob(jobData) {
    const jobs = this.getJobs();
    const settings = this.getSystemSettings();
    const autoApprove = settings.find((s) => s.key === "auto_approve_verified")?.checked ?? true;

    // Check if company is verified
    const company = this.getCompany(jobData.companyId || "COMP-01");
    const status = (autoApprove && company?.verified) ? "Đang tuyển" : "Chờ duyệt";

    const newJob = {
      ...jobData,
      id: jobData.id || `JOB-${Math.floor(2050 + Math.random() * 8000)}`,
      companyId: company.id,
      company: company.name,
      logo: company.logo,
      applicants: jobData.applicants || 0,
      views: jobData.views || 1,
      status,
      posted: jobData.posted || "Vừa xong"
    };

    const nextJobs = [newJob, ...jobs.filter((j) => j.id !== newJob.id)];
    save(STORAGE_KEYS.JOBS, nextJobs);

    // If pending review, send to Admin Moderation
    if (status === "Chờ duyệt") {
      this.addReview({
        id: `REV-${Math.floor(890 + Math.random() * 100)}`,
        jobId: newJob.id,
        title: newJob.title,
        company: company.name,
        companyId: company.id,
        type: "job",
        risk: "Thấp",
        submitted: "Vừa xong",
        status: "Chờ duyệt",
        details: `Tin mới tạo từ ${company.name}, cần kiểm duyệt nội dung.`
      });
    }

    // Log action
    this.addAuditLog("lananh@fpt.com", "CREATE_JOB", newJob.id, "10.24.6.18");

    return newJob;
  },

  updateJob(id, updates) {
    const jobs = this.getJobs();
    const next = jobs.map((j) => (j.id === id ? { ...j, ...updates } : j));
    save(STORAGE_KEYS.JOBS, next);
  },

  deleteJob(id) {
    const jobs = this.getJobs();
    const target = jobs.find((j) => j.id === id);
    const next = jobs.filter((j) => j.id !== id);
    save(STORAGE_KEYS.JOBS, next);
    if (target) {
      this.addAuditLog("lananh@fpt.com", "DELETE_JOB", id, "10.24.6.18");
    }
  },

  toggleJobStatus(id) {
    const jobs = this.getJobs();
    let updatedStatus = "";
    const next = jobs.map((j) => {
      if (j.id === id) {
        updatedStatus = j.status === "Đang tuyển" ? "Tạm dừng" : "Đang tuyển";
        return { ...j, status: updatedStatus };
      }
      return j;
    });
    save(STORAGE_KEYS.JOBS, next);
    this.addAuditLog("lananh@fpt.com", `TOGGLE_JOB_STATUS_${updatedStatus}`, id, "10.24.6.18");
    return updatedStatus;
  },

  // ==========================================
  // 3. ỨNG VIÊN & TIẾN TRÌNH KANBAN (CANDIDATES & PIPELINE)
  // ==========================================
  getCandidates() {
    return load(STORAGE_KEYS.CANDIDATES, MOCK_CANDIDATES);
  },

  getCandidateById(id) {
    const list = this.getCandidates();
    return list.find((c) => c.id === Number(id));
  },

  updateCandidateStage(candidateId, newStage, note = "") {
    const candidates = this.getCandidates();
    const updatedCandidates = candidates.map((c) => {
      if (c.id === Number(candidateId)) {
        return { ...c, stage: newStage };
      }
      return c;
    });
    save(STORAGE_KEYS.CANDIDATES, updatedCandidates);

    // Also sync with Applications
    const apps = this.getApplications();
    const targetStep = mapStageToCandidateStep(newStage);
    const updatedApps = apps.map((app) => {
      if (app.candidateId === Number(candidateId)) {
        return {
          ...app,
          stage: newStage,
          step: targetStep,
          statusBadge: newStage === "Đề nghị" ? "is-success" : newStage === "Phỏng vấn" ? "is-success" : "is-warning"
        };
      }
      return app;
    });
    save(STORAGE_KEYS.APPLICATIONS, updatedApps);

    this.addAuditLog("lananh@fpt.com", "MOVE_CANDIDATE_STAGE", `CAND-${candidateId} -> ${newStage}`, "10.24.6.18");
  },

  rejectCandidate(candidateId, reason = "") {
    const candidates = this.getCandidates();
    const updatedCandidates = candidates.map((c) => {
      if (c.id === Number(candidateId)) {
        return { ...c, stage: "Đã từ chối", rejectReason: reason };
      }
      return c;
    });
    save(STORAGE_KEYS.CANDIDATES, updatedCandidates);

    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.candidateId === Number(candidateId)) {
        return { ...app, stage: "Không phù hợp", statusBadge: "is-danger" };
      }
      return app;
    });
    save(STORAGE_KEYS.APPLICATIONS, updatedApps);

    this.addAuditLog("lananh@fpt.com", "REJECT_CANDIDATE", `CAND-${candidateId}`, "10.24.6.18");
  },

  // ==========================================
  // 4. ĐƠN ỨNG TUYỂN (APPLICATIONS)
  // ==========================================
  getApplications() {
    return load(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
  },

  applyForJob({ jobId, candidateName, candidateEmail, candidatePhone, coverLetter }) {
    const jobs = this.getJobs();
    const job = jobs.find((j) => String(j.id) === String(jobId)) || jobs[0];

    const apps = this.getApplications();
    const newApp = {
      id: Date.now(),
      candidateId: 1, // Default logged-in demo candidate
      candidateName: candidateName || "Nguyễn An Khang",
      jobId: job.id,
      title: job.title,
      companyId: job.companyId,
      company: job.company,
      stage: "Mới",
      step: 1,
      statusBadge: "is-neutral",
      date: "Vừa xong",
      coverLetter: coverLetter || ""
    };

    save(STORAGE_KEYS.APPLICATIONS, [newApp, ...apps]);

    // Increase job applicants count
    this.updateJob(job.id, { applicants: (job.applicants || 0) + 1 });

    // Check if candidate already exists in employer pool, else add
    const candidates = this.getCandidates();
    const existing = candidates.find((c) => c.name === newApp.candidateName && c.appliedJobId === job.id);
    if (!existing) {
      const newCand = {
        id: Date.now(),
        userId: "USR-1028",
        name: newApp.candidateName,
        initials: newApp.candidateName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        role: job.title,
        email: candidateEmail || "ankhang.design@example.com",
        phone: candidatePhone || "0909 123 456",
        experience: "5 năm",
        location: job.location,
        match: 94,
        skills: job.specTags || ["Figma", "UI/UX", "Problem Solving"],
        appliedJobId: job.id,
        appliedJobTitle: job.title,
        companyId: job.companyId,
        companyName: job.company,
        stage: "Mới",
        appliedDate: "Hôm nay",
        statusBadge: "is-neutral"
      };
      save(STORAGE_KEYS.CANDIDATES, [newCand, ...candidates]);
    }

    return newApp;
  },

  // ==========================================
  // 5. LỊCH PHỎNG VẤN (INTERVIEWS)
  // ==========================================
  getInterviews() {
    return load(STORAGE_KEYS.INTERVIEWS, MOCK_INTERVIEWS);
  },

  createInterview(interviewData) {
    const interviews = this.getInterviews();
    const newInterview = {
      ...interviewData,
      id: interviewData.id || `INT-${Math.floor(310 + Math.random() * 90)}`,
      status: interviewData.status || "Đã lên lịch"
    };

    save(STORAGE_KEYS.INTERVIEWS, [newInterview, ...interviews]);

    // If candidate exists, auto update stage to "Phỏng vấn"
    if (newInterview.candidateId) {
      this.updateCandidateStage(newInterview.candidateId, "Phỏng vấn");
    } else {
      const candidates = this.getCandidates();
      const found = candidates.find((c) => c.name === newInterview.candidate);
      if (found) {
        this.updateCandidateStage(found.id, "Phỏng vấn");
      }
    }

    this.addAuditLog("lananh@fpt.com", "SCHEDULE_INTERVIEW", `${newInterview.id} with ${newInterview.candidate}`, "10.24.6.18");
    return newInterview;
  },

  updateInterview(id, updates) {
    const interviews = this.getInterviews();
    const next = interviews.map((iv) => (iv.id === id ? { ...iv, ...updates } : iv));
    save(STORAGE_KEYS.INTERVIEWS, next);
  },

  cancelInterview(id) {
    const interviews = this.getInterviews();
    const target = interviews.find((iv) => iv.id === id);
    const next = interviews.filter((iv) => iv.id !== id);
    save(STORAGE_KEYS.INTERVIEWS, next);
    if (target) {
      this.addAuditLog("lananh@fpt.com", "CANCEL_INTERVIEW", id, "10.24.6.18");
    }
  },

  // ==========================================
  // 6. TÀI KHOẢN NGƯỜI DÙNG (USERS)
  // ==========================================
  getUsers() {
    return load(STORAGE_KEYS.USERS, MOCK_USERS);
  },

  getUserById(id) {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  },

  createUser(userData) {
    const users = this.getUsers();
    const newUser = {
      ...userData,
      id: userData.id || `USR-${Math.floor(1030 + Math.random() * 100)}`,
      joined: "Hôm nay",
      status: userData.status || "Hoạt động",
      isVerified: true
    };
    save(STORAGE_KEYS.USERS, [newUser, ...users]);
    this.addAuditLog("admin@matchajob.vn", "CREATE_USER", newUser.id, "10.24.6.18");
    return newUser;
  },

  updateUser(id, updates) {
    const users = this.getUsers();
    const next = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    save(STORAGE_KEYS.USERS, next);
    this.addAuditLog("admin@matchajob.vn", "UPDATE_USER", id, "10.24.6.18");
  },

  toggleUserStatus(id) {
    const users = this.getUsers();
    let newStatus = "";
    const next = users.map((u) => {
      if (u.id === id) {
        const isActive = u.status === "Hoạt động" || u.status === "Đã xác minh";
        newStatus = isActive ? "Tạm khóa" : "Hoạt động";
        return { ...u, status: newStatus };
      }
      return u;
    });
    save(STORAGE_KEYS.USERS, next);
    this.addAuditLog("admin@matchajob.vn", newStatus === "Tạm khóa" ? "SUSPEND_USER" : "ACTIVATE_USER", id, "10.24.6.18");
    return newStatus;
  },

  // ==========================================
  // 7. KIỂM DUYỆT (ADMIN MODERATION)
  // ==========================================
  getReviews() {
    return load(STORAGE_KEYS.REVIEWS, MOCK_ADMIN_REVIEWS);
  },

  addReview(review) {
    const reviews = this.getReviews();
    save(STORAGE_KEYS.REVIEWS, [review, ...reviews]);
  },

  approveReview(id, note = "") {
    const reviews = this.getReviews();
    let target = null;
    const next = reviews.map((r) => {
      if (r.id === id) {
        target = r;
        return { ...r, status: "Đã duyệt", note, reviewedAt: "Vừa xong" };
      }
      return r;
    });
    save(STORAGE_KEYS.REVIEWS, next);

    if (target) {
      if (target.type === "job" && target.jobId) {
        this.updateJob(target.jobId, { status: "Đang tuyển" });
        this.addAuditLog("admin@matchajob.vn", "APPROVE_JOB", target.jobId, "10.24.6.18");
      } else if (target.type === "company" && target.companyId) {
        this.saveCompany({ id: target.companyId, verified: true });
        this.addAuditLog("admin@matchajob.vn", "VERIFY_COMPANY", target.companyId, "10.24.6.18");
      }
    }
  },

  rejectReview(id, note = "Nội dung vi phạm tiêu chuẩn cộng đồng") {
    const reviews = this.getReviews();
    let target = null;
    const next = reviews.map((r) => {
      if (r.id === id) {
        target = r;
        return { ...r, status: "Đã từ chối", note, reviewedAt: "Vừa xong" };
      }
      return r;
    });
    save(STORAGE_KEYS.REVIEWS, next);

    if (target) {
      if (target.type === "job" && target.jobId) {
        this.updateJob(target.jobId, { status: "Đã đóng", rejectReason: note });
        this.addAuditLog("admin@matchajob.vn", "REJECT_JOB", target.jobId, "10.24.6.18");
      } else if (target.type === "company" && target.companyId) {
        this.addAuditLog("admin@matchajob.vn", "REJECT_VERIFY_COMPANY", target.companyId, "10.24.6.18");
      }
    }
  },

  // ==========================================
  // 8. BÁO CÁO VI PHẠM (ADMIN REPORTS)
  // ==========================================
  getReports() {
    return load(STORAGE_KEYS.REPORTS, MOCK_ADMIN_REPORTS);
  },

  resolveReport(id, resolution, action = "", note = "") {
    const reports = this.getReports();
    const target = reports.find((r) => r.id === id);
    const next = reports.map((r) => {
      if (r.id === id) {
        return { ...r, status: "Đã xử lý", resolution, action, note, resolvedAt: "Vừa xong" };
      }
      return r;
    });
    save(STORAGE_KEYS.REPORTS, next);

    // Apply penalty action if chosen
    if (action === "close_job" && target?.jobId) {
      this.updateJob(target.jobId, { status: "Đã đóng", note: `Đã đóng do báo cáo ${id}` });
    } else if (action === "suspend_company" && target?.companyId) {
      const users = this.getUsers();
      const compUser = users.find((u) => u.companyId === target.companyId);
      if (compUser) this.toggleUserStatus(compUser.id);
    }

    this.addAuditLog("admin@matchajob.vn", "RESOLVE_REPORT", `${id} (${action || resolution})`, "10.24.6.18");
  },

  // ==========================================
  // 9. DANH MỤC NGÀNH NGHỀ (ADMIN CATEGORIES)
  // ==========================================
  getCategories() {
    return load(STORAGE_KEYS.CATEGORIES, MOCK_ADMIN_CATEGORIES);
  },

  saveCategory(cat) {
    const list = this.getCategories();
    const exists = list.some((c) => c.id === cat.id);
    const next = exists
      ? list.map((c) => (c.id === cat.id ? { ...c, ...cat } : c))
      : [...list, { ...cat, id: cat.id || `CAT-${Date.now().toString(36).toUpperCase()}`, jobs: cat.jobs || 0, skills: cat.skills || 0, status: cat.status || "Hiển thị" }];
    save(STORAGE_KEYS.CATEGORIES, next);
    this.addAuditLog("admin@matchajob.vn", exists ? "UPDATE_CATEGORY" : "CREATE_CATEGORY", cat.name, "10.24.6.18");
  },

  deleteCategory(id) {
    const list = this.getCategories();
    const target = list.find((c) => c.id === id);
    const next = list.filter((c) => c.id !== id);
    save(STORAGE_KEYS.CATEGORIES, next);
    if (target) {
      this.addAuditLog("admin@matchajob.vn", "DELETE_CATEGORY", target.name, "10.24.6.18");
    }
  },

  toggleCategoryStatus(id) {
    const list = this.getCategories();
    let newStatus = "";
    const next = list.map((c) => {
      if (c.id === id) {
        newStatus = c.status === "Hiển thị" ? "Nháp" : "Hiển thị";
        return { ...c, status: newStatus };
      }
      return c;
    });
    save(STORAGE_KEYS.CATEGORIES, next);
    return newStatus;
  },

  // ==========================================
  // 10. CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS)
  // ==========================================
  getSystemSettings() {
    return load(STORAGE_KEYS.SETTINGS, MOCK_SYSTEM_SETTINGS);
  },

  toggleSystemSetting(id) {
    const list = this.getSystemSettings();
    const next = list.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s));
    save(STORAGE_KEYS.SETTINGS, next);
    const setting = next.find((s) => s.id === id);
    this.addAuditLog("admin@matchajob.vn", "TOGGLE_SYSTEM_SETTING", `${setting?.key} -> ${setting?.checked}`, "10.24.6.18");
    return next;
  },

  getSystemServices() {
    return MOCK_SYSTEM_SERVICES;
  },

  // ==========================================
  // 11. THÔNG BÁO & AUDIT LOGS
  // ==========================================
  getNotifications() {
    return load(STORAGE_KEYS.NOTIFICATIONS, MOCK_ADMIN_NOTIFICATIONS);
  },

  markNotificationRead(id) {
    const list = this.getNotifications();
    const next = list.map((n) => (n.id === id ? { ...n, unread: false } : n));
    save(STORAGE_KEYS.NOTIFICATIONS, next);
  },

  markAllNotificationsRead() {
    const list = this.getNotifications();
    const next = list.map((n) => ({ ...n, unread: false }));
    save(STORAGE_KEYS.NOTIFICATIONS, next);
  },

  deleteNotification(id) {
    const list = this.getNotifications();
    const next = list.filter((n) => n.id !== id);
    save(STORAGE_KEYS.NOTIFICATIONS, next);
  },

  getAuditLogs() {
    return load(STORAGE_KEYS.LOGS, MOCK_AUDIT_LOGS);
  },

  addAuditLog(actor, action, target, ip = "10.24.6.18", status = "Thành công") {
    const logs = this.getAuditLogs();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const time = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newEntry = { time, actor, action, target, ip, status };
    save(STORAGE_KEYS.LOGS, [newEntry, ...logs]);
  },

  // ==========================================
  // 12. GÓI DỊCH VỤ (BILLING PLANS)
  // ==========================================
  getPlans() {
    return load(STORAGE_KEYS.PLANS, [
      { id: "p1", name: "Starter", price: "0đ", period: "/tháng", features: ["2 tin đang hoạt động", "30 hồ sơ/tháng", "1 thành viên"], current: false, quota: 2 },
      { id: "p2", name: "Growth", price: "1.490.000đ", period: "/tháng", features: ["15 tin đang hoạt động", "500 hồ sơ/tháng", "5 thành viên", "Báo cáo nâng cao"], current: true, quota: 15 },
      { id: "p3", name: "Scale", price: "4.990.000đ", period: "/tháng", features: ["Không giới hạn tin", "Kho ứng viên mở rộng", "Phân quyền nâng cao", "Hỗ trợ ưu tiên 24/7"], current: false, quota: 999 }
    ]);
  },

  activatePlan(planId) {
    const plans = this.getPlans();
    const next = plans.map((p) => ({ ...p, current: p.id === planId }));
    save(STORAGE_KEYS.PLANS, next);
    const chosen = next.find((p) => p.id === planId);
    this.addAuditLog("lananh@fpt.com", "UPGRADE_PLAN", chosen?.name || planId, "10.24.6.18");
    return chosen;
  },

  // Reset store to fresh mock
  resetAll() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }
};
