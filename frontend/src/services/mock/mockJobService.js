import { JOBS_FIXTURE } from "../../fixtures/jobs.fixture";
import { ADMIN_CATEGORIES_FIXTURE, ADMIN_SKILLS_FIXTURE } from "../../fixtures/admin.fixture";
import { toJobViewModel } from "../../mappers/jobMapper";

const STORAGE_KEY = "matchajob_store_jobs_v2";
const DRAFT_KEY = "matchajob_store_job_composer_draft";

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(JOBS_FIXTURE));
      return JOBS_FIXTURE;
    }
    return JSON.parse(raw);
  } catch {
    return JOBS_FIXTURE;
  }
}

function saveJobs(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("matchajob:jobs-changed", { detail: list }));
  } catch (err) {
    console.error("[mockJobService] Failed to persist jobs", err);
  }
}

export const mockJobService = {
  async getEmployerJobs(companyId = "COMP-01", filters = {}) {
    await delay();
    const rawList = loadJobs();
    let jobs = rawList.map(toJobViewModel);

    if (filters.status && filters.status !== "all" && filters.status !== "Tất cả") {
      const target = filters.status.toLowerCase();
      jobs = jobs.filter((j) => j.statusCode === target || j.status.toLowerCase() === target);
    }

    if (filters.keyword && filters.keyword.trim()) {
      const kw = filters.keyword.toLowerCase().trim();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(kw) ||
          j.department.toLowerCase().includes(kw) ||
          j.skills.some((s) => s.toLowerCase().includes(kw))
      );
    }

    return jobs;
  },

  async getJobById(jobId) {
    await delay();
    const rawList = loadJobs();
    const found = rawList.find((j) => String(j.id) === String(jobId));
    if (!found) return null;
    return toJobViewModel(found);
  },

  async createJob(jobInput, companyId = "COMP-01") {
    await delay();
    const rawList = loadJobs();
    const newId = `JOB-${Date.now().toString().slice(-4)}`;
    const newRaw = {
      ...jobInput,
      id: newId,
      companyId,
      status: jobInput.status || "active",
      applicantCount: 0,
      viewCount: 1,
      postedAt: new Date().toISOString()
    };
    const nextList = [newRaw, ...rawList];
    saveJobs(nextList);
    return toJobViewModel(newRaw);
  },

  async updateJob(jobId, jobUpdate) {
    await delay();
    const rawList = loadJobs();
    let updatedRaw = null;
    const nextList = rawList.map((j) => {
      if (String(j.id) === String(jobId)) {
        updatedRaw = { ...j, ...jobUpdate, id: jobId };
        return updatedRaw;
      }
      return j;
    });
    if (updatedRaw) saveJobs(nextList);
    return updatedRaw ? toJobViewModel(updatedRaw) : null;
  },

  async updateJobStatus(jobId, status) {
    await delay();
    const rawList = loadJobs();
    let updatedRaw = null;
    const nextList = rawList.map((j) => {
      if (String(j.id) === String(jobId)) {
        updatedRaw = { ...j, status };
        return updatedRaw;
      }
      return j;
    });
    if (updatedRaw) saveJobs(nextList);
    return updatedRaw ? toJobViewModel(updatedRaw) : null;
  },

  async deleteJob(jobId) {
    await delay();
    const rawList = loadJobs();
    const nextList = rawList.filter((j) => String(j.id) !== String(jobId));
    saveJobs(nextList);
    return true;
  },

  async getCategories() {
    await delay(30);
    return ADMIN_CATEGORIES_FIXTURE;
  },

  async getSkills(categoryId = null) {
    await delay(30);
    if (!categoryId) return ADMIN_SKILLS_FIXTURE;
    return ADMIN_SKILLS_FIXTURE.filter((s) => !s.categoryId || s.categoryId === categoryId);
  },

  getJobDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveJobDraft(draft) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      return true;
    } catch {
      return false;
    }
  },

  clearJobDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      return true;
    } catch {
      return false;
    }
  }
};
