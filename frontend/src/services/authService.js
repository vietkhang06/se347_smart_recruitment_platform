import { storage } from "./storage";

// Demo adapter: giữ hành vi đăng nhập cũ; chưa xác thực mật khẩu với server.
export const authService = {
  getUser: () => storage.getUser(),
  login(email, role = "candidate", name = "") {
    const user = {
      email, role, loggedIn: true,
      name: name || (role === "admin" ? "Hà Minh Đức" : role === "employer" ? "Lan Anh (FPT Talent)" : "Nguyễn An Khang")
    };
    storage.setUser(user);
    return user;
  },
  logout: () => storage.setUser(null),
  subscribe(callback) {
    const listener = (event) => {
      if (event.key === null || event.key === "matchajob-demo-user") callback();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }
};
