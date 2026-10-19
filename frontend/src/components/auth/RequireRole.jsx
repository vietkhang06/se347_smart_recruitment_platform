import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireRole({ role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/login?role=${role}`} replace state={{ from: location.pathname + location.search + location.hash }} />;
  if (user.role !== role) return <section className="container py-5" role="alert">
    <h1 className="h3">Bạn không có quyền truy cập trang này</h1>
    <p>Trang này dành cho vai trò {role === "candidate" ? "ứng viên" : role === "employer" ? "nhà tuyển dụng" : "quản trị viên"}.</p>
    <Link to="/">Về trang chủ</Link>
  </section>;
  return <Outlet />;
}
