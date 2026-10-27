import { mockAuthService } from "./mock/mockAuthService";
import { storage } from "./storage";
import { mockStore } from "./mockStore";
import { httpClient } from "./httpClient";
import { IS_API, DATA_MODE, TOKEN_KEY } from "./dataMode";

const ROLE_CODES = {
  "Ứng viên": "candidate",
  "Nhà tuyển dụng": "employer",
  "Quản trị viên": "admin"
};

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

function findAccount(email) {
  const target = normalize(email);
  if (!target) return null;

  const matches = mockStore.getUsers().filter((account) =>
    [account.email, account.personalEmail].some(
      (value) => value && normalize(value) === target
    )
  );

  return matches.length === 1 ? matches[0] : null;
}

function validateAccount(account) {
  if (!account) {
    throw new Error(
      "Email chưa có trong danh sách tài khoản demo."
    );
  }

  const role = ROLE_CODES[account.role];

  if (!role) {
    throw new Error("Vai trò tài khoản không hợp lệ.");
  }

  if (
    !["Hoạt động", "Đã xác minh"].includes(account.status)
  ) {
    throw new Error(
      "Tài khoản đang bị khóa hoặc chưa được xác minh."
    );
  }

  if (
    role === "employer" &&
    !mockStore.getCompanies().some(
      (company) =>
        String(company.id) === String(account.companyId)
    )
  ) {
    throw new Error(
      "Tài khoản HR chưa liên kết với doanh nghiệp hợp lệ."
    );
  }

  return role;
}

function toSession(account, role) {
  return {
    id: account.id,
    email: normalize(account.email),
    role,
    loggedIn: true,
    name: account.contactPerson || account.name || "",
    ...(role === "employer"
      ? { companyId: account.companyId }
      : {})
  };
}

function apiSession(data) {
  const role = String(data?.role || "").toLowerCase();
  if (!data?.id || !["candidate", "employer", "admin"].includes(role)) throw new Error("Dữ liệu tài khoản từ máy chủ không hợp lệ.");
  return { id: data.id, email: normalize(data.email), name: data.full_name || data.fullName || "", role,
    loggedIn: true, mode: DATA_MODE, companies: data.companies || [],
    ...(role === "employer" ? { companyId: data.companies?.[0]?.id || null } : {}) };
}
function persist(user) {
  storage.setUser(user);
  localStorage.setItem("matchajob_active_user_id", String(user.id));
  window.dispatchEvent(new Event("matchajob:auth-changed"));
  return user;
}
export const authService = {
  getUser() {
    const saved = storage.getUser();
    if (!saved?.loggedIn) return null;
    if (IS_API) return saved.mode === DATA_MODE && localStorage.getItem(TOKEN_KEY) ? saved : null;
    if (saved.mode && saved.mode !== "mock") return null;
    try {
      const account = findAccount(saved.email);
      const role = validateAccount(account);
      return saved.role === role && String(saved.id) === String(account.id) && saved.expiresAt > Date.now() ? { ...toSession(account, role), mode: "mock", expiresAt: saved.expiresAt } : null;
    } catch { return null; }
  },
  async restore() {
    if (!IS_API) return this.getUser();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (DATA_MODE === "api" && token.startsWith("fixture-session:")) { this.logout(); return null; }
    const data = await httpClient.get("/v1/users/me");
    if (localStorage.getItem(TOKEN_KEY) !== token) return null;
    const user = apiSession(data);
    storage.setUser(user);
    return user;
  },
  async loginWithCredentials(email, requestedRole = "candidate", password = "") {
    if (!IS_API) {
      const account = findAccount(email);
      const role = validateAccount(account);
      await mockAuthService.verify(account, password);
      if (requestedRole !== role) throw new Error(`Email này thuộc vai trò ${account.role}. Hãy chọn đúng vai trò.`);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("matchajob_active_candidate_id");
      if (account.candidateId) localStorage.setItem("matchajob_active_candidate_id", String(account.candidateId));
      return persist({ ...toSession(account, role), mode: "mock", expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    }
    if (!password) throw new Error("Vui lòng nhập mật khẩu.");
    const response = await httpClient.post("/v1/auth/login", { email: normalize(email), password }, { auth: false });
    if (!response?.access_token) throw new Error("Máy chủ không trả token đăng nhập.");
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.removeItem("matchajob_active_candidate_id");
    try {
      const user = apiSession(await httpClient.get("/v1/users/me"));
      return persist(user);
    } catch (error) { this.logout(); throw error; }
  },
  async register({ email, password, role, name = "", companyName = "" }) {
    if (!["candidate", "employer"].includes(role)) throw new Error("Vai trò đăng ký không hợp lệ.");
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) throw new Error("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.");
    if (!IS_API) return mockAuthService.register({ email, password, role, name, companyName });
    return httpClient.post("/v1/auth/register", { email: normalize(email), password, role: role.toUpperCase() }, { auth: false });
  },
  login(email, requestedRole = "candidate", password = "") {
    return this.loginWithCredentials(email, requestedRole, password);
  },
  logout() {
    storage.setUser(null);
    [TOKEN_KEY, "matchajob_active_user_id", "matchajob_active_candidate_id"].forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new Event("matchajob:auth-changed"));
  },
  subscribe(callback) {
    const onStorage = e => {
      if (!e.key || ["matchajob-demo-user", TOKEN_KEY, "matchajob_store_users", "matchajob_store_companies"].includes(e.key)) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("matchajob:auth-changed", callback);
    if (!IS_API) window.addEventListener("matchajob:store-changed", callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("matchajob:auth-changed", callback);
      window.removeEventListener("matchajob:store-changed", callback);
    };
  }
};