import { NavLink, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/candidate.css";
export function CandidateGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        replace
        to={`/login?role=candidate&redirect=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  if (user.role !== "candidate")
    return (
      <div className="container py-5">
        <Empty
          title="Không gian dành cho ứng viên"
          text="Bạn đang dùng vai trò khác. Hãy đăng xuất và đăng nhập với vai trò ứng viên."
          to="/"
          action="Về trang chủ"
        />
      </div>
    );
  return children;
}
export function CandidateLayout({ title, subtitle, children }) {
  return (
    <div className="container candidate-space py-4 py-lg-5">
      <div className="candidate-eyebrow">MATCHAJOB / KHÔNG GIAN ỨNG VIÊN</div>
      <h1 className="candidate-title">{title}</h1>
      <p className="text-muted mb-4">{subtitle}</p>
      <nav className="candidate-nav" aria-label="Không gian ứng viên">
        {[
          ["/candidate/dashboard", "Tổng quan", "grid"],
          ["/candidate/profile", "Hồ sơ & CV", "person"],
          ["/candidate/saved", "Việc đã lưu", "heart"],
          ["/candidate/applications", "Đơn ứng tuyển", "send"],
          ["/candidate/interviews", "Lịch phỏng vấn", "calendar3"],
        ].map(([to, label, icon]) => (
          <NavLink key={to} to={to}>
            <i className={`bi bi-${icon}`} /> {label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
export function Empty({ title, text, to, action }) {
  return (
    <div className="candidate-panel candidate-empty">
      <i className="bi bi-inbox fs-1 text-success" />
      <h2 className="h5 mt-3">{title}</h2>
      <p className="text-muted">{text}</p>
      {to && (
        <Link className="btn btn-success" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
export function ErrorNotice({ message }) {
  return message ? (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  ) : null;
}
export function Status({ stage }) {
  const color = /từ chối|Không phù hợp|hủy|Đã rút/i.test(stage)
    ? "danger"
    : /^(Đề nghị|Đã xác nhận)$/.test(stage)
      ? "success"
      : "secondary";
  return (
    <span className={`badge bg-${color}`}>
      {stage === "Mới" ? "Đã nộp hồ sơ" : stage}
    </span>
  );
}
