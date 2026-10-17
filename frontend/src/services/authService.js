import { storage } from "./storage";
import { mockStore } from "./mockStore";
import { httpClient } from "./httpClient";

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

// Kiểm tra tài khoản và vai trò trong hệ thống.
export const authService = {
  getUser() {
    const saved = storage.getUser();
    if (!saved?.loggedIn) return null;

    try {
      const account = findAccount(saved.email);
      if (!account) return saved;

      const actualRole = validateAccount(account);
      if (saved.role !== actualRole) return null;

      if (
        saved.id != null &&
        String(saved.id) !== String(account.id)
      ) {
        return null;
      }

      return toSession(account, actualRole);
    } catch {
      return saved;
    }
  },

  async loginWithCredentials(email, requestedRole = "candidate", password = "") {
    // 1. Thử gọi API backend POST /v1/auth/login nếu backend đang hoạt động
    try {
      const response = await httpClient.post("/v1/auth/login", {
        email: normalize(email),
        password: password || "Password123!"
      });

      if (response?.access_token) {
        localStorage.setItem("matchajob_access_token", response.access_token);
        if (response.user?.id) {
          localStorage.setItem("matchajob_active_user_id", response.user.id);
        }

        const backendRole = (response.user?.role || "").toLowerCase();
        const role = backendRole || requestedRole;

        let companyId = "COMP-01";
        const matchedLocal = findAccount(email);
        if (matchedLocal?.companyId) {
          companyId = matchedLocal.companyId;
        }

        const sessionUser = {
          id: response.user?.id || matchedLocal?.id || "USR-2001",
          email: normalize(response.user?.email || email),
          role,
          loggedIn: true,
          name: response.user?.full_name || matchedLocal?.name || "",
          ...(role === "employer" ? { companyId } : {})
        };

        storage.setUser(sessionUser);
        window.dispatchEvent(new Event("matchajob:auth-changed"));
        return sessionUser;
      }
    } catch (apiErr) {
      console.warn("[authService] Backend login error, fallback sang mock:", apiErr.message);
    }

    // 2. Fallback sang logic local mock
    return this.login(email, requestedRole);
  },

  login(email, requestedRole = "candidate") {
    const account = findAccount(email);
    const actualRole = validateAccount(account);

    if (requestedRole !== actualRole) {
      throw new Error(
        `Email này thuộc vai trò ${account.role}. Hãy chọn đúng vai trò.`
      );
    }

    const user = toSession(account, actualRole);
    storage.setUser(user);

    if (account.id) {
      localStorage.setItem("matchajob_active_user_id", String(account.id));
    }
    if (account.candidateId) {
      localStorage.setItem("matchajob_active_candidate_id", String(account.candidateId));
    }

    window.dispatchEvent(
      new Event("matchajob:auth-changed")
    );

    return user;
  },

  logout() {
    storage.setUser(null);
    localStorage.removeItem("matchajob_access_token");
    localStorage.removeItem("matchajob_active_user_id");
    localStorage.removeItem("matchajob_active_candidate_id");

    window.dispatchEvent(
      new Event("matchajob:auth-changed")
    );
  },

  subscribe(callback) {
    const onStorage = (event) => {
      if (
        event.key === null ||
        [
          "matchajob-demo-user",
          "matchajob_store_users",
          "matchajob_store_companies"
        ].includes(event.key)
      ) {
        callback();
      }
    };

    const onChange = () => callback();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "matchajob:auth-changed",
      onChange
    );
    window.addEventListener(
      "matchajob:store-changed",
      onChange
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "matchajob:auth-changed",
        onChange
      );
      window.removeEventListener(
        "matchajob:store-changed",
        onChange
      );
    };
  }
};