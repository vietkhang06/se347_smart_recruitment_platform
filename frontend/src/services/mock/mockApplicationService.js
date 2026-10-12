import { APPLICATIONS_FIXTURE } from "../../fixtures/applications.fixture";
import { RANKINGS_FIXTURE } from "../../fixtures/rankings.fixture";
import { toApplicationViewModel, STAGE_TEXT_TO_CODE } from "../../mappers/applicationMapper";
import { toRankingListViewModel } from "../../mappers/rankingMapper";

const STORAGE_KEY = "matchajob_store_applications_v2";
const HISTORY_KEY = "matchajob_store_app_history_v2";

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(APPLICATIONS_FIXTURE));
      return APPLICATIONS_FIXTURE;
    }
    return JSON.parse(raw);
  } catch {
    return APPLICATIONS_FIXTURE;
  }
}

function saveApplications(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("matchajob:applications-changed", { detail: list }));
  } catch (err) {
    console.error("[mockApplicationService] Failed to persist applications", err);
  }
}

export const mockApplicationService = {
  async getApplications(companyId = "COMP-01", filters = {}) {
    await delay();
    const rawList = loadApplications();
    let apps = rawList.map((a) => toApplicationViewModel(a));

    if (filters.jobId && filters.jobId !== "all") {
      apps = apps.filter((a) => String(a.jobId) === String(filters.jobId) || String(a.appliedJobId) === String(filters.jobId));
    }

    if (filters.stage && filters.stage !== "all" && filters.stage !== "Tất cả") {
      const target = filters.stage.toLowerCase();
      apps = apps.filter((a) => a.stageCode === target || a.stage.toLowerCase() === target);
    }

    if (filters.keyword && filters.keyword.trim()) {
      const kw = filters.keyword.toLowerCase().trim();
      apps = apps.filter(
        (a) =>
          a.candidateName.toLowerCase().includes(kw) ||
          a.candidateRole.toLowerCase().includes(kw) ||
          a.skills.some((s) => s.toLowerCase().includes(kw))
      );
    }

    return apps;
  },

  async getApplicationById(applicationId) {
    await delay();
    const rawList = loadApplications();
    const found = rawList.find((a) => String(a.id) === String(applicationId));
    if (!found) return null;
    return toApplicationViewModel(found);
  },

  async getJobRanking(jobId) {
    await delay();
    // Trả về fixtures ranking
    return toRankingListViewModel(RANKINGS_FIXTURE);
  },

  async updateApplicationStage(applicationId, nextStage, reason = "", notes = "") {
    await delay();
    const rawList = loadApplications();
    let updatedApp = null;

    let stageCode = nextStage.toLowerCase();
    if (STAGE_TEXT_TO_CODE[nextStage]) {
      stageCode = STAGE_TEXT_TO_CODE[nextStage];
    }

    const nextList = rawList.map((app) => {
      if (String(app.id) === String(applicationId)) {
        updatedApp = {
          ...app,
          stage: nextStage,
          stageCode
        };
        return updatedApp;
      }
      return app;
    });

    if (updatedApp) {
      saveApplications(nextList);

      // Ghi nhận lịch sử chuyển trạng thái
      try {
        const historyRaw = localStorage.getItem(HISTORY_KEY);
        const historyList = historyRaw ? JSON.parse(historyRaw) : [];
        historyList.push({
          applicationId,
          targetStage: stageCode,
          reason,
          notes,
          changedAt: new Date().toISOString()
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
      } catch {}
    }

    return updatedApp ? toApplicationViewModel(updatedApp) : null;
  },

  async getApplicationHistory(applicationId) {
    await delay(30);
    try {
      const historyRaw = localStorage.getItem(HISTORY_KEY);
      const list = historyRaw ? JSON.parse(historyRaw) : [];
      return list.filter((h) => String(h.applicationId) === String(applicationId));
    } catch {
      return [];
    }
  },

  async getApplicationMatchScore(applicationId) {
    await delay(30);
    const app = await this.getApplicationById(applicationId);
    if (!app) return null;
    return {
      applicationId,
      overallScore: app.matchScore,
      skillsScore: Math.min(100, app.matchScore + 2),
      experienceScore: Math.max(60, app.matchScore - 4),
      rationale: "Điểm số được tổng hợp dựa trên độ tương thích kỹ năng và hồ sơ kinh nghiệm."
    };
  }
};
