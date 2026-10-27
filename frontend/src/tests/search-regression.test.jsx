import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const state = vi.hoisted(() => ({ jobs: [] }));
vi.mock("../services/dataMode", () => ({ IS_API: false }));
vi.mock("../services/mockStore", () => ({ mockStore: { getJobs: () => state.jobs } }));
vi.mock("../context/FavoritesContext", () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
import { jobService } from "../services/jobService";
import JobsPage from "../pages/public/JobsPage";

beforeEach(() => {
  state.jobs = [
    { id: "a", title: "React Developer", company: "Team", location: "Đồng Nai", type: "Toàn thời gian", exp: "1–3 năm", team: "Engineering", match: 91, status: "Đang tuyển", deadline: "2099-12-31" },
    { id: "b", title: "Designer", company: "Team", location: "Hà Nội", type: "Bán thời gian", exp: "3–5 năm", team: "Design", match: 98, status: "Đang tuyển", deadline: "2099-12-31" },
    { id: "c", title: "Chưa chấm điểm", company: "Team", location: "Đồng Nai", exp: "1–3 năm", match: null, status: "Đang tuyển", deadline: "2099-12-31" }
  ];
});

it("giữ tìm theo ngành, lọc kinh nghiệm và xếp điểm phù hợp trước khi phân trang", async () => {
  expect((await jobService.search({ keyword: "Engineering" })).content.map(j => j.id)).toEqual(["a"]);
  expect((await jobService.search({ experience: "1–3 năm" })).content.map(j => j.id)).toEqual(["a", "c"]);
  expect((await jobService.search({ sortBy: "match_desc", size: 1, page: 0 })).content[0].id).toBe("b");
  expect((await jobService.search({ sortBy: "match_desc", size: 1, page: 2 })).content[0].id).toBe("c");
});

function Url() { return <output data-testid="url">{useLocation().search}</output>; }

it("giữ dropdown địa điểm/kinh nghiệm và đồng bộ lựa chọn lên URL", async () => {
  render(<MemoryRouter><JobsPage /><Url /></MemoryRouter>);
  await screen.findByText("React Developer");
  expect(screen.getByLabelText("Địa điểm").tagName).toBe("SELECT");
  fireEvent.change(screen.getByLabelText("Kinh nghiệm"), { target: { value: "1–3 năm" } });
  await waitFor(() => expect(screen.queryByText("Designer")).toBeNull());
  expect(decodeURIComponent(screen.getByTestId("url").textContent)).toContain("experience=1–3");
  fireEvent.change(screen.getByLabelText("Sắp xếp"), { target: { value: "match_desc" } });
  await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("sortBy=match_desc"));
});

it("tin HR vừa đóng biến mất khi store phát sự kiện, không cần F5", async () => {
  render(<MemoryRouter><JobsPage /></MemoryRouter>);
  await screen.findByText("React Developer");
  state.jobs = state.jobs.map(job => job.id === "a" ? { ...job, status: "Đã đóng" } : job);
  act(() => window.dispatchEvent(new Event("matchajob:store-changed")));
  await waitFor(() => expect(screen.queryByText("React Developer")).toBeNull());
  expect(screen.getByText("Designer")).toBeTruthy();
});