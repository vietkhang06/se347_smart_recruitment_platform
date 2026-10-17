import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import Button from "react-bootstrap/Button";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { mockStore } from "../../services/mockStore";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentHash = location.hash ? location.hash.replace("#", "") : "overview";

  // Lấy gói dịch vụ hiện tại để hiển thị badge trong menu profile
  const plans = typeof mockStore?.getPlans === "function" ? mockStore.getPlans() : [];
  const activePlan = plans.find((p) => p.current) || plans[0] || { name: "Pro" };
  const activePlanName = (activePlan.name || "PRO").toUpperCase();

  const isEmployer = currentPath.startsWith("/employer") || (user && user.role === "employer");
  const isAdmin = currentPath.startsWith("/admin") || (user && user.role === "admin");

  // Định hướng logo: HR và Admin sẽ về Dashboard, Khách/Ứng viên sẽ về trang chủ
  const getBrandDestination = () => {
    if (isEmployer) return "/employer#overview";
    if (isAdmin) return "/admin#overview";
    return "/";
  };

  const handleBrandClick = (e) => {
    if (isEmployer) {
      e.preventDefault();
      navigate("/employer#overview");
    } else if (isAdmin) {
      e.preventDefault();
      navigate("/admin#overview");
    }
  };

  const handleEmployerTabClick = (key) => {
    navigate(`/employer#${key}`);
  };

  const handleAdminTabClick = (key) => {
    navigate(`/admin#${key}`);
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  };

  const handleProfileClick = () => {
    if (isEmployer) {
      navigate("/employer#profile");
    } else if (isAdmin) {
      navigate("/admin#profile");
    } else {
      navigate("/candidate/profile");
    }
  };

  // Các nhóm tab Tuyển dụng và Hồ sơ dành cho HR
  const RECRUITMENT_TABS = [
    { key: "jobs", label: "Tin tuyển dụng", icon: "bi-briefcase" },
    { key: "candidates", label: "Kho ứng viên", icon: "bi-people" },
    { key: "pipeline", label: "Quy trình", icon: "bi-kanban" },
    { key: "interviews", label: "Phỏng vấn", icon: "bi-calendar-check" }
  ];

  const PROFILE_TABS = [
    { key: "profile", label: "Hồ sơ cá nhân", icon: "bi-person" },
    { key: "company", label: "Hồ sơ doanh nghiệp", icon: "bi-building" },
    { key: "analytics", label: "Phân tích", icon: "bi-bar-chart" },
    { key: "billing", label: "Gói dịch vụ", icon: "bi-credit-card" }
  ];

  const isRecruitmentGroupActive =
    currentPath.startsWith("/employer") &&
    RECRUITMENT_TABS.some((t) => t.key === currentHash);

  const isProfileGroupActive =
    currentPath.startsWith("/employer") &&
    PROFILE_TABS.some((t) => t.key === currentHash);

  // Tab Admin
  const ADMIN_TABS = [
    { key: "overview", label: "Tổng quan", icon: "bi-speedometer2" },
    { key: "moderation", label: "Kiểm duyệt", icon: "bi-shield-check" },
    { key: "users", label: "Người dùng", icon: "bi-people" },
    { key: "reports", label: "Báo cáo", icon: "bi-flag" },
    { key: "categories", label: "Ngành nghề", icon: "bi-tags" },
    { key: "system", label: "Cấu hình", icon: "bi-sliders" },
    { key: "logs", label: "Nhật ký", icon: "bi-journal-text" },
    { key: "notifications", label: "Thông báo", icon: "bi-bell" },
    { key: "profile", label: "Hồ sơ Admin", icon: "bi-person-badge" }
  ];

  // Tab Khách / Ứng viên
  const PUBLIC_TABS = [
    { path: "/jobs", label: "Việc làm", icon: "bi-briefcase" },
    { path: "/companies", label: "Công ty", icon: "bi-buildings" },
    { path: "/guides", label: "Cẩm nang", icon: "bi-journal-text" },
    { path: "/candidate/applications", label: "Đơn ứng tuyển", icon: "bi-send" }
  ];

  return (
    <Navbar
      expand="xl"
      className="navbar-matcha sticky-top p-0 shadow-sm"
      style={{ zIndex: 1020, height: "64px" }}
    >
      <Container fluid className="px-3 px-xl-4 h-100 d-flex align-items-center">
        {/* Brand / Logo */}
        <Navbar.Brand
          as={Link}
          to={getBrandDestination()}
          onClick={handleBrandClick}
          className="d-flex align-items-center gap-2.5 me-4 py-0 text-decoration-none flex-shrink-0"
          title={isEmployer ? "Bảng điều khiển HR" : isAdmin ? "Bảng điều khiển Admin" : "Trang chủ MatchaJob"}
        >
          <img src="/assets/logo.svg" alt="MatchaJob" width="34" height="34" />
          <span
            className="fw-bold fs-5 text-success mb-0"
            style={{ letterSpacing: "-0.4px" }}
          >
            MatchaJob
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar-nav" className="p-1 border-0" />

        <Navbar.Collapse id="main-navbar-nav" className="h-100">
          {/* Central Nav Links (Gom nhóm, hover dropdown, highlight gạch dưới TRÙNG VIỀN HEADER + outline icon) */}
          <Nav className="mx-auto align-items-stretch gap-1 my-0 h-100 flex-nowrap overflow-visible">
            {isEmployer ? (
              <>
                {/* 1. Tổng quan */}
                <button
                  type="button"
                  className={`header-nav-tab ${currentPath.startsWith("/employer") && currentHash === "overview"
                    ? "active"
                    : ""
                    }`}
                  onClick={() => handleEmployerTabClick("overview")}
                >
                  <i className="bi bi-speedometer2 tab-icon"></i>
                  <span>Tổng quan</span>
                </button>

                {/* 2. Tuyển dụng (Dropdown tự mở khi hover và chỉ tắt khi ngưng hover) */}
                <div className="nav-hover-dropdown">
                  <button
                    type="button"
                    className={`header-nav-tab ${isRecruitmentGroupActive ? "active" : ""
                      }`}
                    onClick={() => handleEmployerTabClick("jobs")}
                  >
                    <i className="bi bi-briefcase tab-icon"></i>
                    <span>Tuyển dụng</span>
                    <i
                      className="bi bi-chevron-down ms-1 dropdown-arrow"
                      style={{ fontSize: "11px" }}
                    ></i>
                  </button>

                  <div className="dropdown-menu">
                    {RECRUITMENT_TABS.map((tab) => {
                      const isActive =
                        currentPath.startsWith("/employer") &&
                        currentHash === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          className={`dropdown-item ${isActive ? "active" : ""}`}
                          onClick={() => handleEmployerTabClick(tab.key)}
                        >
                          <i className={`bi ${tab.icon} me-2 text-muted`}></i>
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Hồ sơ (Dropdown tự mở khi hover và chỉ tắt khi ngưng hover) */}
                <div className="nav-hover-dropdown">
                  <button
                    type="button"
                    className={`header-nav-tab ${isProfileGroupActive ? "active" : ""
                      }`}
                    onClick={() => handleEmployerTabClick("profile")}
                  >
                    <i className="bi bi-file-earmark-person tab-icon"></i>
                    <span>Hồ sơ</span>
                    <i
                      className="bi bi-chevron-down ms-1 dropdown-arrow"
                      style={{ fontSize: "11px" }}
                    ></i>
                  </button>

                  <div className="dropdown-menu">
                    {PROFILE_TABS.map((tab) => {
                      const isActive =
                        currentPath.startsWith("/employer") &&
                        currentHash === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          className={`dropdown-item ${isActive ? "active" : ""}`}
                          onClick={() => handleEmployerTabClick(tab.key)}
                        >
                          <i className={`bi ${tab.icon} me-2 text-muted`}></i>
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : isAdmin ? (
              ADMIN_TABS.map((tab) => {
                const isActive =
                  currentPath.startsWith("/admin") && currentHash === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`header-nav-tab ${isActive ? "active" : ""}`}
                    onClick={() => handleAdminTabClick(tab.key)}
                  >
                    <i className={`bi ${tab.icon} tab-icon`}></i>
                    <span>{tab.label}</span>
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
                    className={`header-nav-tab ${isActive ? "active" : ""}`}
                  >
                    <i className={`bi ${tab.icon} tab-icon`}></i>
                    <span>{tab.label}</span>
                  </Link>
                );
              })
            )}
          </Nav>

          {/* Right Action Controls: Nút theme switch và avatar pill*/}
          <div className="d-flex align-items-center gap-4 ms-auto h-100 my-0 flex-shrink-0">
            {/* Theme Toggle Sliding Switch */}
            <button
              type="button"
              className={`theme-toggle-switch ${theme === "dark" ? "is-dark" : "is-light"
                }`}
              onClick={toggleTheme}
              aria-label="Chuyển chế độ sáng / tối"
              title={
                theme === "dark"
                  ? "Chuyển sang Giao diện Sáng"
                  : "Chuyển sang Giao diện Tối"
              }
            >
              <span className="theme-toggle-track">
                <i className="bi bi-sun-fill theme-icon-sun"></i>
                <i className="bi bi-moon-stars-fill theme-icon-moon"></i>
              </span>
              <span className="theme-toggle-thumb">
                {theme === "dark" ? (
                  <i className="bi bi-moon-stars-fill"></i>
                ) : (
                  <i className="bi bi-sun-fill"></i>
                )}
              </span>
            </button>

            {/* Favorite Jobs Badge (dành cho candidate) */}
            {!isEmployer && !isAdmin && (
              <Button
                as={Link}
                to="/candidate/saved"
                variant="outline-secondary"
                size="sm"
                className="rounded-circle p-1 d-flex align-items-center justify-content-center position-relative"
                style={{ width: "36px", height: "36px" }}
                title="Việc làm đã lưu"
              >
                <i className="bi bi-heart-fill text-danger"></i>
                {favorites.length > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: "9px" }}
                  >
                    {favorites.length}
                  </span>
                )}
              </Button>
            )}

            {/* User Account / Auth Section */}
            {user ? (
              <NavDropdown
                title={
                  <span className="user-avatar-pill">
                    <span className="avatar-gradient-ring">
                      <span className="avatar-gradient-inner">
                        <i className="bi bi-person-fill text-primary" style={{ fontSize: "13px" }}></i>
                      </span>
                    </span>
                    <span className="fw-semibold small text-body d-none d-sm-inline">
                      {user.name ? user.name.split(" ")[0] : "Tài khoản"}
                    </span>
                    <i
                      className="bi bi-chevron-down text-muted"
                      style={{ fontSize: "10px" }}
                    ></i>
                  </span>
                }
                id="user-account-dropdown"
                align="end"
                className="user-profile-nav-dropdown"
              >
                {/* Header: Tên, Email và Avatar viền gradient (như ảnh mẫu) */}
                <div className="profile-dropdown-header p-3 d-flex align-items-center justify-content-between">
                  <div className="overflow-hidden me-2">
                    <div
                      className="fw-bold text-body text-truncate"
                      style={{ fontSize: "14.5px" }}
                    >
                      {user.name || user.username || "Tài khoản"}
                    </div>
                    <div
                      className="text-muted text-truncate"
                      style={{ fontSize: "12px" }}
                    >
                      {user.email || (user.role === "employer" ? "recruiter@fpt.com" : user.role === "admin" ? "admin@matchajob.com" : "candidate@gmail.com")}
                    </div>
                  </div>
                  <div className="avatar-gradient-ring flex-shrink-0">
                    <div className="avatar-gradient-inner">
                      <i className="bi bi-person-fill text-primary" style={{ fontSize: "18px" }}></i>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {/* 1. Hồ sơ (Profile) */}
                  <NavDropdown.Item
                    onClick={handleProfileClick}
                    className="profile-menu-item d-flex align-items-center gap-2.5"
                  >
                    <i className="bi bi-person profile-menu-icon"></i>
                    <span>Hồ sơ</span>
                  </NavDropdown.Item>

                  {/* 2. Gói dịch vụ hiện tại (Subscription) */}
                  <NavDropdown.Item
                    onClick={() => {
                      if (isEmployer) navigate("/employer#billing");
                      else if (isAdmin) navigate("/admin#overview");
                      else navigate("/candidate/profile");
                    }}
                    className="profile-menu-item d-flex align-items-center justify-content-between"
                  >
                    <div className="d-flex align-items-center gap-2.5">
                      <i className="bi bi-credit-card profile-menu-icon"></i>
                      <span>Gói dịch vụ</span>
                    </div>
                    <span className="profile-plan-pill">
                      <span className="plan-dot">●</span> {activePlanName}
                    </span>
                  </NavDropdown.Item>

                  {/* 3. Cài đặt (Settings) */}
                  <NavDropdown.Item
                    onClick={() => {
                      if (isEmployer) navigate("/employer#company");
                      else if (isAdmin) navigate("/admin#system");
                      else navigate("/candidate/profile");
                    }}
                    className="profile-menu-item d-flex align-items-center gap-2.5"
                  >
                    <i className="bi bi-gear profile-menu-icon"></i>
                    <span>Cài đặt</span>
                  </NavDropdown.Item>

                  {/* 4. Trung tâm trợ giúp (Help center) */}
                  <NavDropdown.Item
                    onClick={() => navigate("/guides")}
                    className="profile-menu-item d-flex align-items-center gap-2.5"
                  >
                    <i className="bi bi-question-circle profile-menu-icon"></i>
                    <span>Trung tâm trợ giúp</span>
                  </NavDropdown.Item>

                  <NavDropdown.Divider className="my-1.5" />

                  {/* 5. Đăng xuất (Sign out) */}
                  <NavDropdown.Item
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="profile-menu-item d-flex align-items-center gap-2.5 text-danger logout-item"
                  >
                    <i className="bi bi-box-arrow-right profile-menu-icon text-danger"></i>
                    <span>Đăng xuất</span>
                  </NavDropdown.Item>
                </div>
              </NavDropdown>
            ) : (
              <div className="d-flex gap-2">
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-success"
                  size="sm"
                  className="fw-medium py-1 px-3 small"
                >
                  Đăng nhập
                </Button>
                <Button
                  as={Link}
                  to="/role"
                  variant="success"
                  size="sm"
                  className="fw-medium py-1 px-3 small"
                >
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
