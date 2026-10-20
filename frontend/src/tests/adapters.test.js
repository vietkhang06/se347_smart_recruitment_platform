import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
import { jobService } from "../services/jobService";
import { candidateProfileService } from "../services/profileService";
import fixture from "./fixtures/job-search-response.json";
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
it("job search sử dụng cấu trúc fixture PageResponse của nhóm", async () => {
  fetch.mockResolvedValue(json(fixture));
  const result = await jobService.search({ keyword: "java", categoryId: "cat", page: 2, size: 8, sortBy: "salary_desc" });
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.pathname).toBe("/api/v1/jobs"); expect(url.searchParams.get("page")).toBe("2");
  expect(url.searchParams.get("keyword")).toBe("java");
  expect(result.content[0]).toMatchObject({ id: fixture.content[0].id, category: "Software Engineering", status: "Đang tuyển", match: "" });
  expect(result.content[0].company).toBe("Chưa cung cấp tên doanh nghiệp");
  expect(result.totalElements).toBe(fixture.totalElements);
});
it("detail 404 trả null; lỗi mạng phải nổi lên giao diện", async () => {
  fetch.mockResolvedValueOnce(json({ detail: "Not found" }, 404));
  expect(await jobService.getPublicJobById("missing")).toBeNull();
  fetch.mockRejectedValueOnce(new Error("offline"));
  await expect(jobService.getPublicJobById("job")).rejects.toMatchObject({ status: 0 });
});
it("PATCH profile chỉ gửi trường được phép, không gửi id/cv/score", async () => {
  fetch.mockResolvedValue(json({ headline: "Dev", experience_years: 0 }));
  await candidateProfileService.save({ headline: " Dev ", experience_years: "0", id: "other", user_id: "other", cv_url: "fake", ai_cv_score: 100 });
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body).toEqual({ headline: "Dev", bio: "", education: "", location: "", address: "", experience_years: 0 });
});
it("experience trống giữ nguyên, ngoài phạm vi bị chặn", async () => {
  fetch.mockResolvedValue(json({}));
  await candidateProfileService.save({ experience_years: "" });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("experience_years");
  await expect(candidateProfileService.save({ experience_years: 61 })).rejects.toThrow("0 đến 60");
});