// Quản lý localStorage với fallback an toàn
import { mockStore } from "./mockStore";

const STORAGE_KEYS = {
  THEME: "matchajob-theme",
  LEGACY_THEME: "jobly-theme",
  FAVORITES: "matchajob-favorites",
  LEGACY_FAVORITES: "jobly-favorites",
  USER: "matchajob-demo-user",
  CANDIDATE_PROFILE: "matchajob-candidate-profile",
  APPLICATIONS: "matchajob-applications",
  EMPLOYER_POSTS: "matchajob-employer-posts"
};

export const storage = {
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 
           localStorage.getItem(STORAGE_KEYS.LEGACY_THEME) || 
           "light";
  },
  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    localStorage.setItem(STORAGE_KEYS.LEGACY_THEME, theme);
  },

  getFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES) || 
                  localStorage.getItem(STORAGE_KEYS.LEGACY_FAVORITES);
      return raw ? JSON.parse(raw) : [1, 2, 5]; // Default demo favorites
    } catch {
      return [1, 2, 5];
    }
  },
  setFavorites(favIds) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favIds));
    localStorage.setItem(STORAGE_KEYS.LEGACY_FAVORITES, JSON.stringify(favIds));
  },

  getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  },

  getCandidateProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CANDIDATE_PROFILE);
      return raw ? JSON.parse(raw) : {
        name: "Nguyễn An Khang",
        role: "Senior Product Designer",
        email: "ankhang.design@example.com",
        phone: "0909 123 456",
        experience: "5 năm",
        location: "TP. Hồ Chí Minh",
        bio: "Chuyên gia thiết kế UX/UI với 5 năm kinh nghiệm trong các sản phẩm Fintech và SaaS quy mô lớn."
      };
    } catch {
      return null;
    }
  },
  setCandidateProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.CANDIDATE_PROFILE, JSON.stringify(profile));
  },

  getApplications() {
    return mockStore.getApplications();
  },
  addApplication(application) {
    return mockStore.applyForJob({
      jobId: application.jobId || "JOB-2048",
      candidateName: application.applicantName || "Nguyễn An Khang",
      candidateEmail: application.applicantEmail || "ankhang@example.com",
      candidatePhone: application.applicantPhone || "0909 123 456",
      coverLetter: application.coverLetter || ""
    });
  }
};
