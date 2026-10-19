import { mockStore } from "./mockStore";
import { storage } from "./storage";

export const USER_ROLES = [
  "Ứng viên",
  "Nhà tuyển dụng",
  "Quản trị viên"
];

export const normalizeEmail = value =>
  String(value || "").trim().toLowerCase();

const USERS = "matchajob_store_users";
const LOGS = "matchajob_store_logs";

function actor() {
  const current = storage.getUser();

  if (current?.role !== "admin") {
    throw new Error("Hãy đăng nhập bằng tài khoản admin.");
  }

  return normalizeEmail(current.email);
}

function commit(users, action, target) {
  const email = actor();
  const logs = mockStore.getAuditLogs();

  const before = [
    localStorage.getItem(USERS),
    localStorage.getItem(LOGS)
  ];

  try {
    localStorage.setItem(USERS, JSON.stringify(users));

    localStorage.setItem(
      LOGS,
      JSON.stringify([
        {
          time: new Date().toLocaleString("vi-VN"),
          actor: email,
          action,
          target: String(target),
          ip: "",
          status: "Thành công"
        },
        ...logs
      ])
    );
  } catch {
    try {
      [USERS, LOGS].forEach((key, index) => {
        if (before[index] === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, before[index]);
        }
      });
    } catch {
      // Hiển thị lỗi lưu dữ liệu bên dưới.
    }

    throw new Error(
      "Không lưu được thay đổi. Kiểm tra bộ nhớ trình duyệt."
    );
  }

  window.dispatchEvent(new Event("matchajob:store-changed"));
}

export function saveAdminUser(input, id = null) {
  actor();

  const users = mockStore.getUsers();

  const old = id === null
    ? null
    : users.find(user => String(user.id) === String(id));

  if (id !== null && !old) {
    throw new Error("Tài khoản không còn tồn tại.");
  }

  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email);
  const phone = String(input.phone || "").trim();

  if (!name || name.length > 100) {
    throw new Error("Họ tên cần từ 1 đến 100 ký tự.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email không hợp lệ.");
  }

  if (phone && !/^[+\d][\d\s().-]{7,19}$/.test(phone)) {
    throw new Error("Số điện thoại không hợp lệ.");
  }

  if (!USER_ROLES.includes(input.role)) {
    throw new Error("Vai trò không hợp lệ.");
  }

  const duplicate = users.some(user =>
    String(user.id) !== String(id) &&
    normalizeEmail(user.email) === email
  );

  if (duplicate) {
    throw new Error("Email đã thuộc tài khoản khác.");
  }

  if (
    old &&
    (
      normalizeEmail(old.email) !== email ||
      old.role !== input.role
    )
  ) {
    throw new Error(
      "Giữ nguyên email và vai trò để bảo toàn liên kết hồ sơ hiện có."
    );
  }

  let company = null;

  if (!old && input.role === "Nhà tuyển dụng") {
    company = mockStore
      .getCompanies()
      .find(item => item.id === input.companyId);

    if (!company) {
      throw new Error("Hãy chọn doanh nghiệp trực thuộc.");
    }
  }

  const user = old
    ? {
        ...old,
        name,
        phone
      }
    : {
        id: `USR-${crypto.randomUUID()}`,
        name,
        email,
        phone,
        role: input.role,
        avatar: name
          .split(/\s+/)
          .map(word => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        joined: new Date().toLocaleDateString("vi-VN"),
        status: "Hoạt động",
        isVerified: false,
        ...(company
          ? {
              companyId: company.id,
              companyName: company.name
            }
          : {})
      };

  const next = old
    ? users.map(item => item.id === old.id ? user : item)
    : [user, ...users];

  commit(
    next,
    old ? "UPDATE_USER" : "CREATE_USER",
    user.id
  );

  return user;
}

export function changeAdminUserStatus(id, expectedStatus) {
  const email = actor();
  const users = mockStore.getUsers();

  const user = users.find(
    item => String(item.id) === String(id)
  );

  if (!user) {
    throw new Error("Tài khoản không còn tồn tại.");
  }

  if (user.status !== expectedStatus) {
    throw new Error(
      "Trạng thái vừa thay đổi. Hãy kiểm tra lại."
    );
  }

  if (
    normalizeEmail(user.email) === email ||
    normalizeEmail(user.personalEmail) === email
  ) {
    throw new Error(
      "Bạn không thể tự khóa tài khoản đang dùng."
    );
  }

  if (
    !["Hoạt động", "Đã xác minh", "Tạm khóa"].includes(
      user.status
    )
  ) {
    throw new Error(
      "Tài khoản này cần được xác minh trước."
    );
  }

  const locking = user.status !== "Tạm khóa";

  const hasOtherActiveAdmin = users.some(item =>
    item.id !== user.id &&
    item.role === "Quản trị viên" &&
    ["Hoạt động", "Đã xác minh"].includes(item.status)
  );

  if (
    locking &&
    user.role === "Quản trị viên" &&
    !hasOtherActiveAdmin
  ) {
    throw new Error(
      "Phải giữ ít nhất một quản trị viên đang hoạt động."
    );
  }

  const nextUser = {
    ...user,
    status: locking ? "Tạm khóa" : "Hoạt động"
  };

  commit(
    users.map(item => item.id === user.id ? nextUser : item),
    locking ? "SUSPEND_USER" : "ACTIVATE_USER",
    id
  );

  return nextUser;
}