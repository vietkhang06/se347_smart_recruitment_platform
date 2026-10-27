import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/dataMode", () => ({ IS_API: true, DATA_MODE: "api", TOKEN_KEY: "matchajob_access_token" }));
import { authService } from "../services/authService";
import { httpClient, buildFullUrl } from "../services/httpClient";
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/problem+json" } });
beforeEach(() => { localStorage.clear(); vi.stubGlobal("fetch", vi.fn()); });
describe("Auth API và HTTP contract", () => {
  it("sai mật khẩu không đăng nhập bằng fixture demo", async () => {
    fetch.mockResolvedValue(json({ detail: "Sai mật khẩu" }, 401));
    await expect(authService.loginWithCredentials("ankhang@example.com", "candidate", "wrong")).rejects.toThrow("Sai mật khẩu");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getUser()).toBeNull();
    expect(localStorage.getItem("matchajob_access_token")).toBeNull();
  });
  it("đăng ký dùng đúng payload và không tự tạo phiên", async () => {
    fetch.mockResolvedValue(json({ id: "new-user", status: "active" }, 201));
    await authService.register({ email: " NEW@EXAMPLE.COM ", password: "Password123!", role: "candidate" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: "new@example.com", password: "Password123!", role: "CANDIDATE" });
    expect(authService.getUser()).toBeNull();
  });
  it("mật khẩu Unicode quá 72 byte bị chặn trước request", async () => {
    await expect(authService.register({ email: "a@b.com", password: "😀".repeat(19), role: "candidate" })).rejects.toThrow("72 byte");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("role và company lấy từ users/me thay vì nút chọn hoặc COMP-01", async () => {
    fetch.mockResolvedValueOnce(json({ access_token: "jwt" }))
      .mockResolvedValueOnce(json({ id: "real-id", email: "hr@example.com", role: "employer", full_name: "HR", companies: [{ id: "real-company" }] }));
    const user = await authService.loginWithCredentials("hr@example.com", "admin", "Password123!");
    expect(user.role).toBe("employer"); expect(user.companyId).toBe("real-company");
    expect(fetch.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer jwt");
  });
  it("restore không nhận phiên demo khi đang dùng API", async () => {
    localStorage.setItem("matchajob-demo-user", JSON.stringify({ loggedIn: true, role: "admin" }));
    expect(authService.getUser()).toBeNull(); expect(await authService.restore()).toBeNull();
  });
  it("JSON problem giữ status và lỗi validation", async () => {
    fetch.mockResolvedValue(json({ detail: "Email đã tồn tại", errors: { email: "Trùng email" } }, 409));
    await expect(httpClient.post("/v1/auth/register", {}, { auth: false })).rejects.toMatchObject({ status: 409, data: { errors: { email: "Trùng email" } } });
  });
  it("không lặp /api khi caller truyền prefix", () => {
    expect(buildFullUrl("/api/v1/jobs")).toBe("http://localhost:8081/api/v1/jobs");
  });
  it("FormData giữ boundary do trình duyệt tạo", async () => {
    fetch.mockResolvedValue(json({ id: "cv" }));
    const form = new FormData(); form.append("file", new Blob(["CV"]), "cv.pdf");
    await httpClient.post("/v1/cv", form);
    expect(fetch.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });
  it("401 của token hiện tại phát sự kiện hết phiên", async () => {
    localStorage.setItem("matchajob_access_token", "old");
    const callback = vi.fn(); window.addEventListener("matchajob:session-expired", callback);
    fetch.mockResolvedValue(json({ detail: "Hết phiên" }, 401));
    await expect(httpClient.get("/v1/users/me")).rejects.toMatchObject({ status: 401 });
    expect(callback).toHaveBeenCalledTimes(1);
    window.removeEventListener("matchajob:session-expired", callback);
  });
});
