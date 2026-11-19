import { describe, expect, it } from "vitest";
import { MOCK_JOBS } from "../mock/mockJobs";
import { isJobOpen } from "../services/jobService";

describe("Candidate Week 5 - demo jobs from a fresh browser", () => {
  const week5ReviewTime = new Date(2026, 10, 7, 12, 0).getTime();

  it("có vị trí đang tuyển thật sự còn hạn để ứng viên có thể tìm và ứng tuyển", () => {
    const available = MOCK_JOBS.filter(job => isJobOpen(job, week5ReviewTime));
    expect(available.length).toBeGreaterThanOrEqual(2);
    expect(available.map(job => job.id)).toContain("JOB-2047");
    expect(available.map(job => job.id)).toContain("JOB-2048");
  });

  it("tin chờ duyệt, tạm dừng hoặc đã đóng không bị công khai", () => {
    const unavailable = MOCK_JOBS.filter(job => job.status !== "Đang tuyển");
    expect(unavailable.length).toBeGreaterThan(0);
    expect(unavailable.every(job => !isJobOpen(job, week5ReviewTime))).toBe(true);
  });
});
