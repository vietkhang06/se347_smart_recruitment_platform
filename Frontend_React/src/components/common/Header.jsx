import { Link, useNavigate } from "react-router-dom";
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

  return (
    <Navbar expand="lg" className="navbar-matcha sticky-top py-2 shadow-sm" style={{ zIndex: 1020 }}>
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
          <img src="/assets/logo.svg" alt="MatchaJob" width="34" height="34" />
          <span className="fw-bold fs-4 text-success" style={{ letterSpacing: "-0.5px" }}>MatchaJob</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar-nav" />

        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto ms-lg-3 gap-lg-1">
            <Nav.Link as={Link} to="/jobs" className="fw-medium">Việc làm</Nav.Link>
            <Nav.Link as={Link} to="/companies" className="fw-medium">Công ty</Nav.Link>
            <Nav.Link as={Link} to="/guides" className="fw-medium">Cẩm nang</Nav.Link>
            
            <NavDropdown title="Không gian" id="portals-nav-dropdown" className="fw-medium">
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
          </Nav>

          <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
            {/* Theme Toggle Button */}
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={toggleTheme} 
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ width: "38px", height: "38px" }}
              title="Đổi chế độ sáng / tối"
            >
              {theme === "dark" ? <i className="bi bi-sun-fill text-warning"></i> : <i className="bi bi-moon-stars-fill text-primary"></i>}
            </Button>

            {/* Favorite jobs badge button */}
            <Button
              as={Link}
              to="/candidate/saved"
              variant="outline-secondary"
              size="sm"
              className="rounded-circle p-2 d-flex align-items-center justify-content-center position-relative"
              style={{ width: "38px", height: "38px" }}
              title="Việc làm đã lưu"
            >
              <i className="bi bi-heart-fill text-danger"></i>
              {favorites.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "10px" }}>
                  {favorites.length}
                </span>
              )}
            </Button>

            {/* User Auth Section */}
            {user ? (
              <NavDropdown 
                title={<span className="fw-semibold text-success"><i className="bi bi-person-circle me-1"></i>{user.name.split(" ")[0]}</span>} 
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
              <div className="d-flex gap-2">
                <Button as={Link} to="/login" variant="outline-success" size="sm" className="fw-medium">
                  Đăng nhập
                </Button>
                <Button as={Link} to="/role" variant="success" size="sm" className="fw-medium">
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
