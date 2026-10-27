import { mockStore } from "../mockStore";
const USERS_KEY = "matchajob_store_users";
const roles = { candidate: "Ứng viên", employer: "Nhà tuyển dụng" };
export const DEMO_PASSWORD = "Demo123!";
const normalize = value => String(value || "").trim().toLowerCase();
function error(message, status) { return Object.assign(new Error(message), { status }); }
async function digest(password, salt) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
// Mật khẩu demo không thay thế cơ chế bảo mật backend. Không dùng mật khẩu thật.
export const mockAuthService = {
  async verify(account, password) {
    const valid = account.demoPasswordHash
      ? await digest(password, account.demoPasswordSalt) === account.demoPasswordHash
      : password === DEMO_PASSWORD;
    if (!valid) throw error("Email hoặc mật khẩu không đúng.", 401);
  },
  async register({ email, password, role, name = "", companyName = "" }) {
    email = normalize(email);
    if (!roles[role]) throw error("Vai trò đăng ký không hợp lệ.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw error("Email không hợp lệ.", 400);
    if (role === "employer" && !companyName.trim()) throw error("Nhập tên doanh nghiệp.", 400);
    const salt = crypto.randomUUID();
    const hash = await digest(password, salt);
    // Đọc lại sau await để hai lần đăng ký đồng thời không tạo email trùng.
    const users = mockStore.getUsers();
    if (users.some(u => [u.email, u.personalEmail].some(v => v && normalize(v) === email))) throw error("Email đã tồn tại.", 409);
    const id = `USR-${crypto.randomUUID()}`;
    const companiesKey = "matchajob_store_companies";
    const companyId = role === "employer" ? `COMP-${crypto.randomUUID()}` : null;
    const user = { id, email, name: name.trim() || email.split("@")[0], role: roles[role], status: "Hoạt động", joined: new Date().toLocaleDateString("vi-VN"), isVerified: false,
      demoPasswordHash: hash, demoPasswordSalt: salt, ...(companyId ? { companyId, contactPerson: name.trim() } : {}) };
    const beforeUsers = localStorage.getItem(USERS_KEY);
    const beforeCompanies = localStorage.getItem(companiesKey);
    try {
      if (companyId) {
        const companies = mockStore.getCompanies();
        localStorage.setItem(companiesKey, JSON.stringify([...companies, { id: companyId, name: companyName.trim(), email, status: "Chưa xác minh", logo: "DN", location: "Chưa cập nhật" }]));
      }
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    } catch {
      for (const [key, value] of [[USERS_KEY, beforeUsers], [companiesKey, beforeCompanies]]) {
        try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* Giữ lỗi lưu ban đầu. */ }
      }
      throw error("Không lưu được tài khoản. Kiểm tra dung lượng trình duyệt.", 507);
    }
    window.dispatchEvent(new Event("matchajob:store-changed"));
    return { id, email, message: "Đăng ký demo thành công. Bạn có thể đăng nhập ngay trên trình duyệt này." };
  }
};