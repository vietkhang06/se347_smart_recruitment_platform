import { createContext, useContext, useState } from "react";
import { storage } from "../services/storage";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser());
  const { showToast } = useToast();

  const login = (email, role = "candidate", name = "") => {
    const newUser = {
      email,
      role,
      name: name || (role === "admin" ? "Hà Minh Đức" : role === "employer" ? "Lan Anh (FPT Talent)" : "Nguyễn An Khang"),
      loggedIn: true
    };
    storage.setUser(newUser);
    setUser(newUser);
    showToast(`Đăng nhập thành công với vai trò ${role.toUpperCase()}`);
    return newUser;
  };

  const logout = () => {
    storage.setUser(null);
    setUser(null);
    showToast("Đã đăng xuất tài khoản");
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
