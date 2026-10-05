import { Link, useNavigate, useLocation } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import Button from "react-bootstrap/Button";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const currentHash = location.hash ? location.hash.replace("#", "") : "overview";

  const isEmployer = currentPath.startsWith("/employer") || (user && user.role === "employer");
  const isAdmin = currentPath.startsWith("/admin") || (user && user.role === "admin");

  const EMPLOYER_TABS = [
    { key: "overview", label: "Tổng quan" },
    { key: "jobs", label: "Tin tuyển dụng" },
    { key: "candidates", label: "Kho ứng viên" },
    { key: "pipeline", label: "Quy trình" },
    { key: "interviews", label: "Phỏng vấn" },
    { key: "analytics", label: "Phân tích" },
    { key: "company", label: "Doanh nghiệp" },
    { key: "billing", label: "Gói dịch vụ" },
    { key: "profile", label: "Hồ sơ HR" }
  ];

  const ADMIN_TABS = [
    { key: "overview", label: "Tổng quan" },
    { key: "moderation", label: "Kiểm duyệt" },
    { key: "users", label: "Người dùng" },
    { key: "reports", label: "Báo cáo" },
    { key: "categories", label: "Ngành nghề" },
    { key: "system", label: "Cấu hình" },
    { key: "logs", label: "Nhật ký" },
    { key: "notifications", label: "Thông báo" },
    { key: "profile", label: "Hồ sơ Admin" }
  ];

  const PUBLIC_TABS = [
    { path: "/jobs", label: "Việc làm" },
    { path: "/companies", label: "Công ty" },
    { path: "/guides", label: "Cẩm nang" },
    { path: "/candidate/applications", label: "Đơn ứng tuyển" }
  ];

  const handleEmployerTabClick = (key) => {
    if (currentPath.startsWith("/employer")) {
      window.location.hash = key;
    } else {
      navigate(`/employer#${key}`);
    }
  };

  const handleAdminTabClick = (key) => {
    if (currentPath.startsWith("/admin")) {
      window.location.hash = key;
    } else {
      navigate(`/admin#${key}`);
    }
  };

  return (
    <Navbar expand="xl" className="navbar-matcha sticky-top py-2 shadow-sm" style={{ zIndex: 1020 }}>
      <Container fluid className="px-3 px-xl-4">
        {/* Brand / Logo */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 me-3 py-0">
          <img src="/assets/logo.svg" alt="MatchaJob" width="30" height="30" />
          <span className="fw-bold fs-5 text-success mb-0" style={{ letterSpacing: "-0.5px" }}>MatchaJob</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar-nav" className="p-1 border-0" />

        <Navbar.Collapse id="main-navbar-nav">
          {/* Central Role-based Nav Links (Optimized: No icons, No counts, fits in 1 row) */}
          <Nav className="mx-auto align-items-center gap-1.5 my-2 my-xl-0 flex-nowrap overflow-hidden">
            {isEmployer ? (
              EMPLOYER_TABS.map((tab) => {
                const isActive = currentPath.startsWith("/employer") && currentHash === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`header-task-link btn p-0 border-0 bg-transparent ${isActive ? "active" : ""}`}
                    onClick={() => handleEmployerTabClick(tab.key)}
                  >
                    {tab.label}
                  </button>
                );
              })
            ) : isAdmin ? (
              ADMIN_TABS.map((tab) => {
                const isActive = currentPath.startsWith("/admin") && currentHash === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`header-task-link btn p-0 border-0 bg-transparent ${isActive ? "active" : ""}`}
                    onClick={() => handleAdminTabClick(tab.key)}
                  >
                    {tab.label}
                  </button>
                );
              })
            ) : (
              PUBLIC_TABS.map((tab) => {
                const isActive = currentPath === tab.path;
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`header-task-link ${isActive ? "active" : ""}`}
                  >
                    {tab.label}
                  </Link>
                );
              })
            )}
          </Nav>

          {/* Right Action Controls */}
          <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-xl-0">
            {/* Space Switcher Dropdown */}
            <NavDropdown
              title={<span className="small text-muted fw-medium"><i className="bi bi-grid me-1"></i>Không gian</span>}
              id="portals-nav-dropdown"
              className="small"
              align="end"
            >
              <NavDropdown.Item as={Link} to="/employer">
                <i className="bi bi-briefcase me-2 text-primary"></i>Nhà tuyển dụng (HR)
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin">
                <i className="bi bi-shield-lock me-2 text-purple"></i>Quản trị viên (Admin)
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/candidate/profile">
                <i className="bi bi-person-badge me-2 text-success"></i>Hồ sơ ứng viên
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/candidate/saved">
                <i className="bi bi-heart me-2 text-danger"></i>Việc đã lưu ({favorites.length})
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/candidate/applications">
                <i className="bi bi-send-check me-2 text-info"></i>Đơn ứng tuyển
              </NavDropdown.Item>
            </NavDropdown>

            {/* Theme Toggle Button */}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={toggleTheme}
              className="rounded-circle p-1 d-flex align-items-center justify-content-center"
              style={{ width: "32px", height: "32px" }}
              title="Đổi chế độ sáng / tối"
            >
              {theme === "dark" ? <i className="bi bi-sun-fill text-warning"></i> : <i className="bi bi-moon-stars-fill text-primary"></i>}
            </Button>

            {/* Favorite Jobs Badge (for candidate) */}
            {!isEmployer && !isAdmin && (
              <Button
                as={Link}
                to="/candidate/saved"
                variant="outline-secondary"
                size="sm"
                className="rounded-circle p-1 d-flex align-items-center justify-content-center position-relative"
                style={{ width: "32px", height: "32px" }}
                title="Việc làm đã lưu"
              >
                <i className="bi bi-heart-fill text-danger"></i>
                {favorites.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "9px" }}>
                    {favorites.length}
                  </span>
                )}
              </Button>
            )}

            {/* User Account / Auth Section */}
            {user ? (
              <NavDropdown
                title={<span className="fw-semibold small text-success"><i className="bi bi-person-circle me-1"></i>{user.name.split(" ")[0]}</span>}
                id="user-account-dropdown"
                align="end"
              >
                <div className="px-3 py-1 text-muted small">Đăng nhập: <strong>{user.role}</strong></div>
                <NavDropdown.Divider />
                {user.role === "employer" ? (
                  <NavDropdown.Item as={Link} to="/employer">Bảng điều khiển HR</NavDropdown.Item>
                ) : user.role === "admin" ? (
                  <NavDropdown.Item as={Link} to="/admin">Trang quản trị</NavDropdown.Item>
                ) : (
                  <NavDropdown.Item as={Link} to="/candidate/profile">Hồ sơ cá nhân</NavDropdown.Item>
                )}
                <NavDropdown.Item onClick={() => { logout(); navigate("/"); }}>
                  <i className="bi bi-box-arrow-right me-2 text-danger"></i>Đăng xuất
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <div className="d-flex gap-1.5">
                <Button as={Link} to="/login" variant="outline-success" size="sm" className="fw-medium py-1 px-2.5 small">
                  Đăng nhập
                </Button>
                <Button as={Link} to="/role" variant="success" size="sm" className="fw-medium py-1 px-2.5 small">
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
