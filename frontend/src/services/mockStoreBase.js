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
  PLANS: "matchajob_store_plans",
  JOB_DRAFT: "matchajob_store_job_composer_draft"
};

function load(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      `[mockStore] Failed to load ${key}, falling back to default`,
      error
    );
    return defaultData;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("matchajob:store-changed", {
        detail: { key, data }
      })
    );
  } catch (error) {
    console.error(`[mockStore] Failed to save ${key}`, error);
  }
}

function isJobAcceptingApplications(job) {
  if (!job || job.status !== "Đang tuyển") return false;

  const match = String(job.deadline || "").match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (!match) return true;

  const deadline = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1])
  );

  deadline.setHours(23, 59, 59, 999);
  return deadline.getTime() >= Date.now();
}

export const mockStore = {
  isJobAcceptingApplications(job) {
    return isJobAcceptingApplications(job);
  },

  // DOANH NGHIỆP
  getCompanies() {
    const list = load(STORAGE_KEYS.COMPANIES, MOCK_COMPANIES);
    let updated = false;
    const merged = Array.isArray(list) ? [...list] : [];
    if (Array.isArray(MOCK_COMPANIES)) {
      for (const comp of MOCK_COMPANIES) {
        if (!merged.some(c => String(c.id) === String(comp.id))) {
          merged.push(comp);
          updated = true;
        }
      }
    }
    if (updated) {
      save(STORAGE_KEYS.COMPANIES, merged);
    }
    return merged;
  },

  getCompany(id = "COMP-01") {
    const list = this.getCompanies();
    return list.find((company) => company.id === id) || list[0];
  },

  saveCompany(updatedCompany) {
    const list = this.getCompanies();
    const next = list.map((company) =>
      company.id === updatedCompany.id
        ? { ...company, ...updatedCompany }
        : company
    );

    save(STORAGE_KEYS.COMPANIES, next);
    return updatedCompany;
  },

  // TIN TUYỂN DỤNG
  getJobs() {
    return load(STORAGE_KEYS.JOBS, MOCK_JOBS);
  },

  getJobById(id) {
    return this.getJobs().find(
      (job) => String(job.id) === String(id)
    );
  },

  getEmployerJobs(companyId = "COMP-01") {
    return this.getJobs().filter(
      (job) => job.companyId === companyId
    );
  },

  saveJob(jobData) {
    const jobs = this.getJobs();
    const settings = this.getSystemSettings();

    const autoApprove =
      settings.find(
        (setting) => setting.key === "auto_approve_verified"
      )?.checked ?? true;

    const company = this.getCompany(jobData.companyId || "COMP-01");
    const status =
      autoApprove && company?.verified ? "Đang tuyển" : "Chờ duyệt";

    const newJob = {
      ...jobData,
      id:
        jobData.id ||
        `JOB-${Math.floor(2050 + Math.random() * 8000)}`,
      companyId: company.id,
      company: company.name,
      logo: company.logo,
      applicants: jobData.applicants || 0,
      views: jobData.views || 1,
      status,
      posted: jobData.posted || "Vừa xong"
    };

    save(STORAGE_KEYS.JOBS, [
      newJob,
      ...jobs.filter((job) => job.id !== newJob.id)
    ]);

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

    this.addAuditLog(
      "lananh@fpt.com",
      "CREATE_JOB",
      newJob.id,
      "10.24.6.18"
    );

    return newJob;
  },

  updateJob(id, updates) {
    const next = this.getJobs().map((job) =>
      job.id === id ? { ...job, ...updates } : job
    );

    save(STORAGE_KEYS.JOBS, next);
  },

  deleteJob(id) {
    const jobs = this.getJobs();
    const target = jobs.find((job) => job.id === id);

    save(
      STORAGE_KEYS.JOBS,
      jobs.filter((job) => job.id !== id)
    );

    if (target) {
      this.addAuditLog(
        "lananh@fpt.com",
        "DELETE_JOB",
        id,
        "10.24.6.18"
      );
    }
  },

  toggleJobStatus(id) {
    let updatedStatus = "";

    const next = this.getJobs().map((job) => {
      if (job.id === id) {
        updatedStatus =
          job.status === "Đang tuyển" ? "Tạm dừng" : "Đang tuyển";
        return { ...job, status: updatedStatus };
      }

      return job;
    });

    save(STORAGE_KEYS.JOBS, next);

    this.addAuditLog(
      "lananh@fpt.com",
      `TOGGLE_JOB_STATUS_${updatedStatus}`,
      id,
      "10.24.6.18"
    );

    return updatedStatus;
  },

  // ỨNG VIÊN VÀ TIẾN TRÌNH TUYỂN DỤNG
  getCandidates() {
    return load(STORAGE_KEYS.CANDIDATES, MOCK_CANDIDATES);
  },

  getCandidateById(id) {
    return this.getCandidates().find(
      (candidate) => candidate.id === Number(id)
    );
  },

  updateCandidateStage(candidateId, newStage, note = "") {
    const updatedCandidates = this.getCandidates().map((candidate) =>
      candidate.id === Number(candidateId)
        ? { ...candidate, stage: newStage }
        : candidate
    );

    save(STORAGE_KEYS.CANDIDATES, updatedCandidates);

    const targetStep = mapStageToCandidateStep(newStage);

    const updatedApps = this.getApplications().map((application) => {
      if (application.candidateId === Number(candidateId)) {
        return {
          ...application,
          stage: newStage,
          step: targetStep,
          statusBadge:
            newStage === "Đề nghị" || newStage === "Phỏng vấn"
              ? "is-success"
              : "is-warning"
        };
      }

      return application;
    });

    save(STORAGE_KEYS.APPLICATIONS, updatedApps);

    this.addAuditLog(
      "lananh@fpt.com",
      "MOVE_CANDIDATE_STAGE",
      `CAND-${candidateId} -> ${newStage}`,
      "10.24.6.18"
    );
  },

  rejectCandidate(candidateId, reason = "") {
    const updatedCandidates = this.getCandidates().map((candidate) =>
      candidate.id === Number(candidateId)
        ? {
            ...candidate,
            stage: "Đã từ chối",
            rejectReason: reason
          }
        : candidate
    );

    save(STORAGE_KEYS.CANDIDATES, updatedCandidates);

    const updatedApps = this.getApplications().map((application) =>
      application.candidateId === Number(candidateId)
        ? {
            ...application,
            stage: "Không phù hợp",
            statusBadge: "is-danger",
            rejectReason: reason
          }
        : application
    );

    save(STORAGE_KEYS.APPLICATIONS, updatedApps);

    this.addAuditLog(
      "lananh@fpt.com",
      "REJECT_CANDIDATE",
      `CAND-${candidateId}`,
      "10.24.6.18"
    );
  },

  // ĐƠN ỨNG TUYỂN
  getApplications() {
    return load(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
  },

  applyForJob({
    jobId,
    candidateId,
    candidateName,
    candidateEmail,
    candidatePhone,
    coverLetter,
    profileSnapshot
  }) {
    const job = this.getJobs().find(
      (item) => String(item.id) === String(jobId)
    );

    if (!job) {
      throw new Error(
        "Công việc không còn tồn tại hoặc đường dẫn không chính xác."
      );
    }

    if (!isJobAcceptingApplications(job)) {
      throw new Error("Công việc này hiện không nhận hồ sơ.");
    }

    const profile =
      profileSnapshot || load(STORAGE_KEYS.CANDIDATE_PROFILE, {});

    const signedInUser = load("matchajob-demo-user", {});

    const email = (
      candidateEmail ||
      signedInUser.email ||
      profile.email ||
      ""
    ).trim();

    const name = (
      candidateName ||
      signedInUser.name ||
      profile.name ||
      ""
    ).trim();

    if (!name || !email) {
      throw new Error("Vui lòng nhập họ tên và email hợp lệ.");
    }

    const apps = this.getApplications();
    const candidates = this.getCandidates();

    // Mỗi ứng viên có một bản ghi riêng cho từng công việc.
    const knownCandidate = candidates.find(
      (candidate) =>
        candidate.email?.toLowerCase() === email.toLowerCase() &&
        String(candidate.appliedJobId) === String(job.id)
    );

    const resolvedCandidateId =
      candidateId || knownCandidate?.id || Date.now();

    const alreadyApplied = apps.some(
      (application) =>
        String(application.jobId) === String(job.id) &&
        (
          Number(application.candidateId) ===
            Number(resolvedCandidateId) ||
          application.candidateEmail?.toLowerCase() ===
            email.toLowerCase()
        )
    );

    if (alreadyApplied) {
      throw new Error("Bạn đã nộp hồ sơ cho công việc này rồi.");
    }

    const newApp = {
      id: Date.now(),
      candidateId: resolvedCandidateId,
      candidateName: name,
      candidateEmail: email,
      candidatePhone: candidatePhone || profile.phone || "",
      jobId: job.id,
      title: job.title,
      companyId: job.companyId,
      company: job.company,
      stage: "Mới",
      step: 1,
      statusBadge: "is-neutral",
      date: new Date().toLocaleDateString("vi-VN"),
      coverLetter: coverLetter || "",
      cvId: profile.cvId || "",
      cvName: profile.cvName || ""
    };

    save(STORAGE_KEYS.APPLICATIONS, [newApp, ...apps]);

    this.updateJob(job.id, {
      applicants: (job.applicants || 0) + 1
    });

    const existing = candidates.find(
      (candidate) =>
        candidate.email?.toLowerCase() === email.toLowerCase() &&
        String(candidate.appliedJobId) === String(job.id)
    );

    if (!existing) {
      const newCandidate = {
        id: resolvedCandidateId,
        userId: knownCandidate?.userId || `USR-${resolvedCandidateId}`,
        name: newApp.candidateName,
        initials: newApp.candidateName
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        role: profile.role || job.title,
        email,
        phone: newApp.candidatePhone,
        experience: profile.experience || "Chưa cập nhật",
        location: job.location,
        education: profile.education || "",
        bio: profile.bio || "",
        cvId: profile.cvId || "",
        cvName: profile.cvName || "",
        skills: profile.skills || [],
        appliedJobId: job.id,
        appliedJobTitle: job.title,
        companyId: job.companyId,
        companyName: job.company,
        stage: "Mới",
        appliedDate: newApp.date,
        statusBadge: "is-neutral"
      };

      save(STORAGE_KEYS.CANDIDATES, [
        newCandidate,
        ...candidates
      ]);
    }

    return newApp;
  },

  // LỊCH PHỎNG VẤN
  getInterviews() {
    return load(STORAGE_KEYS.INTERVIEWS, MOCK_INTERVIEWS);
  },

  createInterview(interviewData) {
    const interviews = this.getInterviews();

    const newInterview = {
      ...interviewData,
      id:
        interviewData.id ||
        `INT-${Math.floor(310 + Math.random() * 90)}`,
      status: interviewData.status || "Đã lên lịch"
    };

    save(STORAGE_KEYS.INTERVIEWS, [
      newInterview,
      ...interviews
    ]);

    if (newInterview.candidateId) {
      this.updateCandidateStage(
        newInterview.candidateId,
        "Phỏng vấn"
      );
    } else {
      const found = this.getCandidates().find(
        (candidate) => candidate.name === newInterview.candidate
      );

      if (found) {
        this.updateCandidateStage(found.id, "Phỏng vấn");
      }
    }

    this.addAuditLog(
      "lananh@fpt.com",
      "SCHEDULE_INTERVIEW",
      `${newInterview.id} with ${newInterview.candidate}`,
      "10.24.6.18"
    );

    return newInterview;
  },

  updateInterview(id, updates) {
    const next = this.getInterviews().map((interview) =>
      interview.id === id
        ? { ...interview, ...updates }
        : interview
    );

    save(STORAGE_KEYS.INTERVIEWS, next);
  },

  cancelInterview(id) {
    const interviews = this.getInterviews();
    const target = interviews.find(
      (interview) => interview.id === id
    );

    save(
      STORAGE_KEYS.INTERVIEWS,
      interviews.filter((interview) => interview.id !== id)
    );

    if (target) {
      this.addAuditLog(
        "lananh@fpt.com",
        "CANCEL_INTERVIEW",
        id,
        "10.24.6.18"
      );
    }
  },

  // TÀI KHOẢN NGƯỜI DÙNG
  getUsers() {
    const list = load(STORAGE_KEYS.USERS, MOCK_USERS);
    let updated = false;
    const merged = Array.isArray(list) ? [...list] : [];
    if (Array.isArray(MOCK_USERS)) {
      for (const mockUser of MOCK_USERS) {
        const exists = merged.some(u =>
          (u.email && mockUser.email && String(u.email).trim().toLowerCase() === String(mockUser.email).trim().toLowerCase()) ||
          (u.id && mockUser.id && String(u.id) === String(mockUser.id))
        );
        if (!exists) {
          merged.push(mockUser);
          updated = true;
        }
      }
    }
    if (updated) {
      save(STORAGE_KEYS.USERS, merged);
    }
    return merged;
  },

  getUserById(id) {
    return this.getUsers().find((user) => user.id === id);
  },

  createUser(userData) {
    const users = this.getUsers();

    const newUser = {
      ...userData,
      id:
        userData.id ||
        `USR-${Math.floor(1030 + Math.random() * 100)}`,
      joined: "Hôm nay",
      status: userData.status || "Hoạt động",
      isVerified: true
    };

    save(STORAGE_KEYS.USERS, [newUser, ...users]);

    this.addAuditLog(
      "admin@matchajob.vn",
      "CREATE_USER",
      newUser.id,
      "10.24.6.18"
    );

    return newUser;
  },

  updateUser(id, updates) {
    const next = this.getUsers().map((user) =>
      user.id === id ? { ...user, ...updates } : user
    );

    save(STORAGE_KEYS.USERS, next);

    this.addAuditLog(
      "admin@matchajob.vn",
      "UPDATE_USER",
      id,
      "10.24.6.18"
    );
  },

  toggleUserStatus(id) {
    let newStatus = "";

    const next = this.getUsers().map((user) => {
      if (user.id === id) {
        const isActive =
          user.status === "Hoạt động" ||
          user.status === "Đã xác minh";

        newStatus = isActive ? "Tạm khóa" : "Hoạt động";
        return { ...user, status: newStatus };
      }

      return user;
    });

    save(STORAGE_KEYS.USERS, next);

    this.addAuditLog(
      "admin@matchajob.vn",
      newStatus === "Tạm khóa" ? "SUSPEND_USER" : "ACTIVATE_USER",
      id,
      "10.24.6.18"
    );

    return newStatus;
  },

  // KIỂM DUYỆT
  getReviews() {
    return load(STORAGE_KEYS.REVIEWS, MOCK_ADMIN_REVIEWS);
  },

  addReview(review) {
    save(STORAGE_KEYS.REVIEWS, [
      review,
      ...this.getReviews()
    ]);
  },

  approveReview(id, note = "") {
    let target = null;

    const next = this.getReviews().map((review) => {
      if (review.id === id) {
        target = review;
        return {
          ...review,
          status: "Đã duyệt",
          note,
          reviewedAt: "Vừa xong"
        };
      }

      return review;
    });

    save(STORAGE_KEYS.REVIEWS, next);

    if (target) {
      if (target.type === "job" && target.jobId) {
        this.updateJob(target.jobId, {
          status: "Đang tuyển"
        });

        this.addAuditLog(
          "admin@matchajob.vn",
          "APPROVE_JOB",
          target.jobId,
          "10.24.6.18"
        );
      } else if (target.type === "company" && target.companyId) {
        this.saveCompany({
          id: target.companyId,
          verified: true
        });

        this.addAuditLog(
          "admin@matchajob.vn",
          "VERIFY_COMPANY",
          target.companyId,
          "10.24.6.18"
        );
      }
    }
  },

  rejectReview(
    id,
    note = "Nội dung vi phạm tiêu chuẩn cộng đồng"
  ) {
    let target = null;

    const next = this.getReviews().map((review) => {
      if (review.id === id) {
        target = review;
        return {
          ...review,
          status: "Đã từ chối",
          note,
          reviewedAt: "Vừa xong"
        };
      }

      return review;
    });

    save(STORAGE_KEYS.REVIEWS, next);

    if (target) {
      if (target.type === "job" && target.jobId) {
        this.updateJob(target.jobId, {
          status: "Đã đóng",
          rejectReason: note
        });

        this.addAuditLog(
          "admin@matchajob.vn",
          "REJECT_JOB",
          target.jobId,
          "10.24.6.18"
        );
      } else if (target.type === "company" && target.companyId) {
        this.addAuditLog(
          "admin@matchajob.vn",
          "REJECT_VERIFY_COMPANY",
          target.companyId,
          "10.24.6.18"
        );
      }
    }
  },

  // BÁO CÁO VI PHẠM
  getReports() {
    return load(STORAGE_KEYS.REPORTS, MOCK_ADMIN_REPORTS);
  },

  resolveReport(id, resolution, action = "", note = "") {
    const reports = this.getReports();
    const target = reports.find((report) => report.id === id);

    const next = reports.map((report) =>
      report.id === id
        ? {
            ...report,
            status: "Đã xử lý",
            resolution,
            action,
            note,
            resolvedAt: "Vừa xong"
          }
        : report
    );

    save(STORAGE_KEYS.REPORTS, next);

    if (action === "close_job" && target?.jobId) {
      this.updateJob(target.jobId, {
        status: "Đã đóng",
        note: `Đã đóng do báo cáo ${id}`
      });
    } else if (action === "suspend_company" && target?.companyId) {
      const companyUser = this.getUsers().find(
        (user) => user.companyId === target.companyId
      );

      if (companyUser) {
        this.toggleUserStatus(companyUser.id);
      }
    }

    this.addAuditLog(
      "admin@matchajob.vn",
      "RESOLVE_REPORT",
      `${id} (${action || resolution})`,
      "10.24.6.18"
    );
  },

  // DANH MỤC NGÀNH NGHỀ
  getCategories() {
    return load(STORAGE_KEYS.CATEGORIES, MOCK_ADMIN_CATEGORIES);
  },

  saveCategory(category) {
    const list = this.getCategories();
    const exists = list.some((item) => item.id === category.id);

    const next = exists
      ? list.map((item) =>
          item.id === category.id
            ? { ...item, ...category }
            : item
        )
      : [
          ...list,
          {
            ...category,
            id:
              category.id ||
              `CAT-${Date.now().toString(36).toUpperCase()}`,
            jobs: category.jobs || 0,
            skills: category.skills || 0,
            status: category.status || "Hiển thị"
          }
        ];

    save(STORAGE_KEYS.CATEGORIES, next);

    this.addAuditLog(
      "admin@matchajob.vn",
      exists ? "UPDATE_CATEGORY" : "CREATE_CATEGORY",
      category.name,
      "10.24.6.18"
    );
  },

  deleteCategory(id) {
    const list = this.getCategories();
    const target = list.find((category) => category.id === id);

    save(
      STORAGE_KEYS.CATEGORIES,
      list.filter((category) => category.id !== id)
    );

    if (target) {
      this.addAuditLog(
        "admin@matchajob.vn",
        "DELETE_CATEGORY",
        target.name,
        "10.24.6.18"
      );
    }
  },

  toggleCategoryStatus(id) {
    let newStatus = "";

    const next = this.getCategories().map((category) => {
      if (category.id === id) {
        newStatus =
          category.status === "Hiển thị" ? "Nháp" : "Hiển thị";

        return { ...category, status: newStatus };
      }

      return category;
    });

    save(STORAGE_KEYS.CATEGORIES, next);
    return newStatus;
  },

  // CẤU HÌNH HỆ THỐNG
  getSystemSettings() {
    return load(STORAGE_KEYS.SETTINGS, MOCK_SYSTEM_SETTINGS);
  },

  toggleSystemSetting(id) {
    const next = this.getSystemSettings().map((setting) =>
      setting.id === id
        ? { ...setting, checked: !setting.checked }
        : setting
    );

    save(STORAGE_KEYS.SETTINGS, next);

    const setting = next.find((item) => item.id === id);

    this.addAuditLog(
      "admin@matchajob.vn",
      "TOGGLE_SYSTEM_SETTING",
      `${setting?.key} -> ${setting?.checked}`,
      "10.24.6.18"
    );

    return next;
  },

  getSystemServices() {
    return MOCK_SYSTEM_SERVICES;
  },

  // THÔNG BÁO
  getNotifications() {
    return load(
      STORAGE_KEYS.NOTIFICATIONS,
      MOCK_ADMIN_NOTIFICATIONS
    );
  },

  markNotificationRead(id) {
    const next = this.getNotifications().map((notification) =>
      notification.id === id
        ? { ...notification, unread: false }
        : notification
    );

    save(STORAGE_KEYS.NOTIFICATIONS, next);
  },

  markAllNotificationsRead() {
    const next = this.getNotifications().map((notification) => ({
      ...notification,
      unread: false
    }));

    save(STORAGE_KEYS.NOTIFICATIONS, next);
  },

  deleteNotification(id) {
    save(
      STORAGE_KEYS.NOTIFICATIONS,
      this.getNotifications().filter(
        (notification) => notification.id !== id
      )
    );
  },

  // NHẬT KÝ HOẠT ĐỘNG
  getAuditLogs() {
    return load(STORAGE_KEYS.LOGS, MOCK_AUDIT_LOGS);
  },

  addAuditLog(
    actor,
    action,
    target,
    ip = "10.24.6.18",
    status = "Thành công"
  ) {
    const logs = this.getAuditLogs();
    const now = new Date();
    const pad = (number) => String(number).padStart(2, "0");

    const time =
      `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/` +
      `${now.getFullYear()} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newEntry = {
      time,
      actor,
      action,
      target,
      ip,
      status
    };

    save(STORAGE_KEYS.LOGS, [newEntry, ...logs]);
  },

  // GÓI DỊCH VỤ
  getPlans() {
    return load(STORAGE_KEYS.PLANS, [
      {
        id: "p1",
        name: "Starter",
        price: "0đ",
        period: "/tháng",
        features: [
          "2 tin đang hoạt động",
          "30 hồ sơ/tháng",
          "1 thành viên"
        ],
        current: false,
        quota: 2
      },
      {
        id: "p2",
        name: "Growth",
        price: "1.490.000đ",
        period: "/tháng",
        features: [
          "15 tin đang hoạt động",
          "500 hồ sơ/tháng",
          "5 thành viên",
          "Báo cáo nâng cao"
        ],
        current: true,
        quota: 15
      },
      {
        id: "p3",
        name: "Scale",
        price: "4.990.000đ",
        period: "/tháng",
        features: [
          "Không giới hạn tin",
          "Kho ứng viên mở rộng",
          "Phân quyền nâng cao",
          "Hỗ trợ ưu tiên 24/7"
        ],
        current: false,
        quota: 999
      }
    ]);
  },

  activatePlan(planId) {
    const next = this.getPlans().map((plan) => ({
      ...plan,
      current: plan.id === planId
    }));

    save(STORAGE_KEYS.PLANS, next);

    const chosen = next.find((plan) => plan.id === planId);

    this.addAuditLog(
      "lananh@fpt.com",
      "UPGRADE_PLAN",
      chosen?.name || planId,
      "10.24.6.18"
    );

    return chosen;
  },

  // HỒ SƠ HR
  getEmployerProfile() {
    return load(STORAGE_KEYS.EMPLOYER_PROFILE, {
      name: "Nguyễn Lan Anh",
      roleTitle: "Talent Acquisition Lead",
      email: "lananh@fpt.com",
      phone: "090 123 4567",
      department: "Phòng Tuyển dụng & Thu hút nhân tài",
      company: "FPT Digital Talent",
      workLocation:
        "Tòa nhà FPT Tân Thuận, KCX Tân Thuận, Quận 7, TP.HCM",
      avatar: "LA",
      workingHours: "Thứ Hai – Thứ Sáu (08:30 – 17:30)"
    });
  },

  saveEmployerProfile(profile) {
    save(STORAGE_KEYS.EMPLOYER_PROFILE, profile);
    return profile;
  },

  // BẢN NHÁP TIN TUYỂN DỤNG
  getJobDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOB_DRAFT);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[mockStore] Failed to read job draft", error);
      return null;
    }
  },

  saveJobDraft(draftData) {
    try {
      const { contact, hrProfile, ...dataWithoutHr } = draftData;

      localStorage.setItem(
        STORAGE_KEYS.JOB_DRAFT,
        JSON.stringify(dataWithoutHr)
      );

      window.dispatchEvent(
        new CustomEvent("matchajob:store-changed", {
          detail: {
            key: STORAGE_KEYS.JOB_DRAFT,
            data: dataWithoutHr
          }
        })
      );

      return dataWithoutHr;
    } catch (error) {
      console.error("[mockStore] Failed to save job draft", error);
      return null;
    }
  },

  clearJobDraft() {
    try {
      localStorage.removeItem(STORAGE_KEYS.JOB_DRAFT);

      window.dispatchEvent(
        new CustomEvent("matchajob:store-changed", {
          detail: {
            key: STORAGE_KEYS.JOB_DRAFT,
            data: null
          }
        })
      );
    } catch (error) {
      console.error("[mockStore] Failed to clear job draft", error);
    }
  },

  resetAll() {
    Object.values(STORAGE_KEYS).forEach((key) =>
      localStorage.removeItem(key)
    );
    window.location.reload();
  }
};