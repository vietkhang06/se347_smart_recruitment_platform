import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { useToast } from "./ToastContext";
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const { showToast } = useToast();
  useEffect(() => {
    let generation = 0;
    let alive = true;
    const restore = async (background = false) => {
      const ticket = ++generation;
      if (!background) { setLoading(true); setUser(null); }
      setError("");
      try {
        const next = await authService.restore();
        if (alive && ticket === generation) setUser(next);
      } catch (err) {
        if (alive && ticket === generation) {
          if ([401, 403].includes(err.status)) authService.logout();
          else setError(err.message);
        }
      } finally { if (alive && ticket === generation) setLoading(false); }
    };
    restore();
    const unsubscribe = authService.subscribe(() => restore(true));
    const expire = () => authService.logout();
    window.addEventListener("matchajob:session-expired", expire);
    return () => { alive = false; ++generation; unsubscribe(); window.removeEventListener("matchajob:session-expired", expire); };
  }, [revision]);
  const login = async (email, role, password) => {
    const next = await authService.loginWithCredentials(email, role, password);
    setUser(next); setError("");
    showToast("Đăng nhập thành công.");
    return next;
  };
  const logout = () => { authService.logout(); setUser(null); showToast("Đã đăng xuất tài khoản."); };
  return <AuthContext.Provider value={{ user, role: user?.role || null, loading, error, retry: () => setRevision(v => v + 1), login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);