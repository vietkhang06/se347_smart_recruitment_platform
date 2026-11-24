import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ favorites: [], jobs: [], toggleFavorite: null }));

vi.mock("../services/dataMode", () => ({ IS_API: false }));
vi.mock("../context/FavoritesContext", () => ({
  useFavorites: () => ({
    favorites: state.favorites,
    isFavorite: id => state.favorites.includes(String(id)),
    toggleFavorite: state.toggleFavorite,
  }),
}));
vi.mock("../services/jobService", () => ({
  jobService: {
    getJobsSnapshot: () => state.jobs,
    isAcceptingApplications: job => job.status === "Đang tuyển",
  },
}));

import SavedJobsPage from "../pages/candidate/SavedJobsPage";

const job = (id, title, status = "Đang tuyển") => ({
  id, title, status, company: "Demo Company", location: "TP. HCM",
  type: "Toàn thời gian", exp: "1 năm", logo: "DC", salary: "Thỏa thuận",
  posted: "Hôm nay", desc: "Công việc mẫu", match: null,
});
const show = () => render(<MemoryRouter><SavedJobsPage /></MemoryRouter>);

beforeEach(() => {
  state.favorites = [];
  state.jobs = [];
  state.toggleFavorite = vi.fn();
});

it("hiện trạng thái chưa lưu việc và liên kết khám phá công việc", () => {
  show();
  expect(screen.getByText("Bạn chưa lưu công việc nào")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Khám phá việc làm ngay" }).getAttribute("href")).toBe("/jobs");
});

it("chỉ hiện các công việc thuộc danh sách đã lưu và tìm theo tên", () => {
  state.favorites = ["1", "2"];
  state.jobs = [job("1", "React Developer"), job("2", "Product Designer"), job("3", "Java Developer")];
  show();
  expect(screen.getByText("React Developer")).toBeTruthy();
  expect(screen.getByText("Product Designer")).toBeTruthy();
  expect(screen.queryByText("Java Developer")).toBeNull();

  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm việc đã lưu" }), {
    target: { value: "React" },
  });
  expect(screen.getByText("React Developer")).toBeTruthy();
  expect(screen.queryByText("Product Designer")).toBeNull();
});

it("lọc tin đang tuyển, và phân biệt rỗng bộ lọc với chưa lưu việc", () => {
  state.favorites = ["1", "2"];
  state.jobs = [job("1", "React Developer"), job("2", "Designer", "Đã đóng")];
  show();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByText("React Developer")).toBeTruthy();
  expect(screen.queryByText("Designer")).toBeNull();
  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm việc đã lưu" }), {
    target: { value: "không tồn tại" },
  });
  expect(screen.getByText("Không có công việc khớp bộ lọc.")).toBeTruthy();
  expect(screen.queryByText("Bạn chưa lưu công việc nào")).toBeNull();
});

it("cập nhật danh sách việc khi dữ liệu demo thay đổi mà không cần tải lại trang", async () => {
  state.favorites = ["1"];
  state.jobs = [job("1", "React Developer")];
  show();
  expect(screen.getByText("React Developer")).toBeTruthy();
  state.jobs = [job("1", "React Developer Updated")];
  act(() => window.dispatchEvent(new Event("matchajob:store-changed")));
  await waitFor(() => expect(screen.getByText("React Developer Updated")).toBeTruthy());
  expect(screen.queryByText("React Developer")).toBeNull();
});
