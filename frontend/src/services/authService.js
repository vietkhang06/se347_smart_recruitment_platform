import { storage } from "./storage";
import { mockStore } from "./mockStore";

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

// Kiểm tra tài khoản và vai trò trong demo.
// Chưa xác thực mật khẩu với server.
export const authService = {
  getUser() {
    const saved = storage.getUser();
    if (!saved?.loggedIn) return null;

    try {
      const account = findAccount(saved.email);
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
      return null;
    }
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

    window.dispatchEvent(
      new Event("matchajob:auth-changed")
    );

    return user;
  },

  logout() {
    storage.setUser(null);

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