import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
vi.mock("../context/FavoritesContext", () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
vi.mock("../services/jobService", () => ({ jobService: { categories: vi.fn(), search: vi.fn(), getJobsSnapshot: () => [] } }));
vi.mock("../services/profileService", () => ({ candidateProfileService: { load: vi.fn(), save: vi.fn() } }));
import JobsPage from "../pages/public/JobsPage";
import ApiProfileEditor from "../components/candidate/ApiProfileEditor";
import { jobService } from "../services/jobService";
import { candidateProfileService } from "../services/profileService";
function LocationProbe() { const location = useLocation(); const navigate = useNavigate(); return <><output data-testid="url">{location.search}</output><button onClick={() => navigate(-1)}>Back test</button></>; }
const result = { content: [{ id: "job-1", title: "React Developer", company: "Company", match: "" }], totalPages: 2, totalElements: 9 };
beforeEach(() => {
  vi.clearAllMocks(); jobService.categories.mockResolvedValue([{ id: "it", name: "IT" }]); jobService.search.mockResolvedValue(result);
  candidateProfileService.load.mockResolvedValue({ headline: "Developer", experience_years: 2, location: "HCM" });
});
it("khôi phục bộ lọc URL và gửi page bắt đầu từ 0", async () => {
  render(<MemoryRouter initialEntries={["/jobs?q=react&location=HCM&workType=remote&categoryId=it&level=junior&sortBy=salary_desc&page=1"]}><JobsPage /><LocationProbe /></MemoryRouter>);
  await screen.findByText("React Developer");
  expect(jobService.search.mock.calls[0][0]).toMatchObject({ keyword: "react", location: "HCM", workType: "remote", categoryId: "it", level: "junior", sortBy: "salary_desc", page: 1 });
  expect(screen.getByLabelText("Hình thức làm việc").value).toBe("remote");
  fireEvent.change(screen.getByLabelText("Cấp bậc"), { target: { value: "senior" } });
  await waitFor(() => expect(screen.getByTestId("url").textContent).not.toContain("page="));
  expect(screen.getByTestId("url").textContent).toContain("level=senior");
  fireEvent.click(screen.getByText("Back test"));
  await waitFor(() => expect(screen.getByLabelText("Cấp bậc").value).toBe("junior"));
});
it("phân trang và reset bộ lọc", async () => {
  render(<MemoryRouter><JobsPage /><LocationProbe /></MemoryRouter>);
  await screen.findByText("React Developer");
  fireEvent.click(screen.getByText("Sau"));
  await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("page=1"));
  fireEvent.click(screen.getByText("Đặt lại"));
  await waitFor(() => expect(screen.getByTestId("url").textContent).toBe(""));
});
it("lỗi tải việc làm có thử lại, không hiện thành danh sách rỗng", async () => {
  jobService.search.mockRejectedValueOnce(new Error("Mất kết nối"));
  render(<MemoryRouter><JobsPage /></MemoryRouter>);
  expect(screen.getByRole("status").textContent).toContain("Đang tải");
  await screen.findByRole("alert"); expect(screen.queryByText("Không tìm thấy việc làm phù hợp")).toBeNull();
  fireEvent.click(screen.getByText("Thử lại")); await screen.findByText("React Developer");
});
it("kết quả rỗng có thao tác xóa bộ lọc", async () => {
  jobService.search.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
  render(<MemoryRouter><JobsPage /></MemoryRouter>);
  await screen.findByText("Không tìm thấy việc làm phù hợp"); expect(screen.getByText("Xóa bộ lọc")).toBeTruthy();
});
it("hồ sơ lưu bất đồng bộ, chống gửi lặp và nhận dữ liệu chuẩn hóa", async () => {
  let finish; candidateProfileService.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<ApiProfileEditor user={{ name: "Thông", email: "thong@example.com" }} />);
  await screen.findByLabelText("Chức danh mong muốn");
  fireEvent.change(screen.getByLabelText("Chức danh mong muốn"), { target: { value: " React Developer " } });
  fireEvent.click(screen.getByText("Lưu thay đổi hồ sơ"));
  expect(screen.getByText("Đang lưu…").closest("fieldset").disabled).toBe(true);
  expect(screen.queryByText("Đã lưu hồ sơ trên hệ thống.")).toBeNull();
  finish({ headline: "React Developer", experience_years: 2 });
  await screen.findByText("Đã lưu hồ sơ trên hệ thống.");
  expect(screen.getByLabelText("Chức danh mong muốn").value).toBe("React Developer");
});
it("lưu lỗi giữ nội dung đang sửa và không báo thành công", async () => {
  candidateProfileService.save.mockRejectedValue(new Error("Không lưu được"));
  render(<ApiProfileEditor user={{ name: "Thông" }} />);
  await screen.findByLabelText("Chức danh mong muốn");
  fireEvent.change(screen.getByLabelText("Chức danh mong muốn"), { target: { value: "Edited" } });
  fireEvent.click(screen.getByText("Lưu thay đổi hồ sơ"));
  await screen.findByText("Không lưu được");
  expect(screen.getByLabelText("Chức danh mong muốn").value).toBe("Edited");
  expect(screen.queryByText("Đã lưu hồ sơ trên hệ thống.")).toBeNull();
});

it("phản hồi tìm kiếm cũ không ghi đè kết quả mới", async () => {
  let oldResponse;
  jobService.search.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  render(<MemoryRouter><JobsPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Từ khóa"), { target: { value: "react" } });
  await screen.findByText("React Developer");
  oldResponse({ content: [{ id: "old", title: "Old result" }], totalElements: 1, totalPages: 1 });
  await waitFor(() => expect(screen.queryByText("Old result")).toBeNull());
  expect(screen.getByText("React Developer")).toBeTruthy();
});