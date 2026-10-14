import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { useToast } from "./ToastContext";
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());
  const { showToast } = useToast();
  useEffect(() => authService.subscribe(() => setUser(authService.getUser())), []);
  const login = (email, role = "candidate", name = "") => {
    const next = authService.login(email, role, name);
    setUser(next);
    showToast(`Đăng nhập thành công với vai trò ${role.toUpperCase()}`);
    return next;
  };
  const logout = () => {
    authService.logout();
    setUser(null);
    showToast("Đã đăng xuất tài khoản");
  };
  return <AuthContext.Provider value={{ user, role: user?.role || null, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
