import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState("candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [terms, setTerms] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!terms) {
      showToast("Vui lòng đồng ý với Điều khoản dịch vụ", "warning");
      return;
    }
    login(email, role, name);
    showToast("Đăng ký tài khoản thành công!");
    navigate(role === "employer" ? "/employer" : "/");
  };

  return (
    <Container className="py-5 my-auto">
      <Row className="justify-content-center">
        <Col lg={6} md={8}>
          <Card className="matcha-card p-4 p-md-5 border-0 shadow-lg" data-aos="zoom-in">
            <div className="text-center mb-4">
              <h3 className="fw-bold mb-1">Tạo tài khoản mới</h3>
              <p className="text-muted small">Khởi đầu hành trình sự nghiệp số cùng MatchaJob</p>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Bạn là ai?</Form.Label>
                <div className="d-flex gap-3">
                  <Form.Check 
                    type="radio" 
                    id="role-cand" 
                    label="Ứng viên tìm việc" 
                    name="role" 
                    checked={role === "candidate"} 
                    onChange={() => setRole("candidate")} 
                  />
                  <Form.Check 
                    type="radio" 
                    id="role-emp" 
                    label="Nhà tuyển dụng (HR)" 
                    name="role" 
                    checked={role === "employer"} 
                    onChange={() => setRole("employer")} 
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Họ và tên của bạn</Form.Label>
                <Form.Control 
                  type="text" 
                  required 
                  placeholder="Ví dụ: Nguyễn An Khang"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </Form.Group>

              {role === "employer" && (
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">Tên doanh nghiệp</Form.Label>
                  <Form.Control 
                    type="text" 
                    required 
                    placeholder="Ví dụ: FPT Software, Tiki..."
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)} 
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Địa chỉ Email</Form.Label>
                <Form.Control 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Mật khẩu (tối thiểu 6 ký tự)</Form.Label>
                <Form.Control 
                  type="password" 
                  required 
                  minLength={6}
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Check 
                  type="checkbox" 
                  id="reg-terms" 
                  label="Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư của MatchaJob" 
                  className="small text-muted"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
              </Form.Group>

              <Button type="submit" variant="success" className="w-100 py-2 fw-bold mb-3">
                Hoàn tất đăng ký
              </Button>

              <div className="text-center text-muted small">
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-success fw-bold text-decoration-none">
                  Đăng nhập
                </Link>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
