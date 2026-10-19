import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { useToast } from "./ToastContext";
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());
  const { showToast } = useToast();
  useEffect(() => authService.subscribe(() => setUser(authService.getUser())), []);
  const login = async (email, role = "candidate", password = "") => {
    let next;
    if (typeof authService.loginWithCredentials === "function" && password) {
      next = await authService.loginWithCredentials(email, role, password);
    } else {
      next = authService.login(email, role);
    }
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
