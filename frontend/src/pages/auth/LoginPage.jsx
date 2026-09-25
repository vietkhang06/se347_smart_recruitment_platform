import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState(searchParams.get("role") || "candidate");
  const [email, setEmail] = useState("ankhang@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) setRole(roleParam);
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, role);
    if (role === "employer") {
      navigate("/employer");
    } else if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  const roleImages = {
    candidate: "/assets/auth-candidate.jpg",
    employer: "/assets/auth-employer.jpg",
    admin: "/assets/auth-admin.jpg"
  };

  const roleNames = {
    candidate: "Ứng viên tìm việc",
    employer: "Nhà tuyển dụng (HR)",
    admin: "Quản trị viên"
  };

  return (
    <Container className="py-5 my-auto">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="matcha-card border-0 shadow-lg overflow-hidden">
            <Row className="g-0">
              {/* Visual Banner side */}
              <Col md={6} className="d-none d-md-block position-relative" style={{ minHeight: "520px" }}>
                <img 
                  src={roleImages[role] || roleImages.candidate} 
                  alt={role} 
                  className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
                  style={{ filter: "brightness(0.85)" }}
                />
                <div 
                  className="position-absolute bottom-0 start-0 w-100 p-4 text-white"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
                >
                  <h4 className="fw-bold mb-1">Không gian {roleNames[role]}</h4>
                  <p className="small mb-0 opacity-75">
                    Hệ thống tuyển dụng thông minh hàng đầu với trải nghiệm tối ưu.
                  </p>
                </div>
              </Col>

              {/* Form side */}
              <Col md={6} className="p-4 p-lg-5 d-flex flex-column justify-content-center">
                <div className="mb-4 text-center text-md-start">
                  <h3 className="fw-bold mb-1">Đăng nhập tài khoản</h3>
                  <p className="text-muted small">Chào mừng bạn quay trở lại với MatchaJob</p>
                </div>

                {/* Role switcher buttons */}
                <div className="mb-4">
                  <Form.Label className="small fw-semibold text-muted d-block">Vai trò đăng nhập:</Form.Label>
                  <ButtonGroup className="w-100">
                    <Button 
                      variant={role === "candidate" ? "success" : "outline-secondary"} 
                      size="sm"
                      onClick={() => setRole("candidate")}
                    >
                      Ứng viên
                    </Button>
                    <Button 
                      variant={role === "employer" ? "primary" : "outline-secondary"} 
                      size="sm"
                      onClick={() => setRole("employer")}
                    >
                      Nhà tuyển dụng
                    </Button>
                    <Button 
                      variant={role === "admin" ? "dark" : "outline-secondary"} 
                      size="sm"
                      onClick={() => setRole("admin")}
                    >
                      Admin
                    </Button>
                  </ButtonGroup>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Địa chỉ Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between">
                      <Form.Label className="small fw-semibold">Mật khẩu</Form.Label>
                      <Link to="/forgot-password" className="small text-success text-decoration-none">
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="position-relative">
                      <Form.Control 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                      </button>
                    </div>
                  </Form.Group>

                  <Button type="submit" variant="success" className="w-100 py-2 fw-bold mb-3">
                    Đăng nhập ({roleNames[role]})
                  </Button>

                  <div className="text-center text-muted small">
                    Chưa có tài khoản?{" "}
                    <Link to="/register" className="text-success fw-bold text-decoration-none">
                      Đăng ký ngay
                    </Link>
                  </div>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
