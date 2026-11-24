import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ favorites: ["api-1"], fetchJob: null }));
vi.mock("../services/dataMode", () => ({ IS_API: true }));
vi.mock("../context/FavoritesContext", () => ({
  useFavorites: () => ({
    favorites: state.favorites,
    isFavorite: id => state.favorites.includes(String(id)),
    toggleFavorite: vi.fn(),
  }),
}));
vi.mock("../services/jobService", () => ({
  jobService: {
    getJobsSnapshot: () => [],
    getPublicJobById: (...args) => state.fetchJob(...args),
    isAcceptingApplications: job => job.status === "Đang tuyển",
  },
}));
import SavedJobsPage from "../pages/candidate/SavedJobsPage";

const apiJob = {
  id: "api-1", title: "Frontend API", company: "API Company", logo: "AC",
  status: "Đang tuyển", location: "HCM", type: "Toàn thời gian",
  exp: "Junior", salary: "Thỏa thuận", posted: "Hôm nay", match: null,
};
const show = () => render(<MemoryRouter><SavedJobsPage /></MemoryRouter>);

beforeEach(() => {
  state.favorites = ["api-1"];
  state.fetchJob = vi.fn().mockResolvedValue(apiJob);
});

it("API: có trạng thái loading rồi hiển thị công việc đã lưu", async () => {
  let finish;
  state.fetchJob.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show();
  expect(screen.getByRole("status").textContent).toContain("Đang tải");
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  finish(apiJob);
  expect(await screen.findByText("Frontend API")).toBeTruthy();
});

it("API: lỗi tải có thông báo và thử lại thành công", async () => {
  state.fetchJob.mockRejectedValueOnce(new Error("Không kết nối được"))
    .mockResolvedValueOnce(apiJob);
  show();
  expect((await screen.findByRole("alert")).textContent).toContain("Không kết nối được");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("Frontend API")).toBeTruthy();
  expect(state.fetchJob).toHaveBeenCalledTimes(2);
});
