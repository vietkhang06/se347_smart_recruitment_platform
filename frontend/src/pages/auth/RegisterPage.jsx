import { IS_API } from "../../services/dataMode";
import { authService } from "../../services/authService";
import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

export default function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    if (busy || success) return;
    setError("");
    if (!terms) { setError("Vui lòng đồng ý với Điều khoản dịch vụ."); return; }
    setBusy(true);
    try {
      const result = await authService.register({ email, password, role, name, companyName });
      setSuccess(result.message || "Đăng ký thành công. Hãy đăng nhập; nếu tài khoản chờ xác minh, cần hoàn tất xác minh trước.");
      setPassword("");
    } catch (err) { setError(err.message || "Không đăng ký được."); }
    finally { setBusy(false); }
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
              {!IS_API && <p className="text-muted small">Tài khoản demo được lưu trên trình duyệt này; không dùng mật khẩu thật.</p>}
              <fieldset disabled={busy || Boolean(success)}>
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              {success && <div className="alert alert-success" role="status">{success} <Link to={`/login?role=${role}`}>Đến đăng nhập</Link></div>}
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

              {!IS_API && <Form.Group className="mb-3" controlId="register-name">
                <Form.Label>Họ và tên</Form.Label><Form.Control maxLength={100} value={name} onChange={e => setName(e.target.value)} />
              </Form.Group>}
              {!IS_API && role === "employer" && <Form.Group className="mb-3" controlId="register-company">
                <Form.Label>Tên doanh nghiệp</Form.Label><Form.Control required maxLength={150} value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </Form.Group>}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Địa chỉ Email</Form.Label>
                <Form.Control aria-label="Email" autoComplete="email" maxLength={255} disabled={busy || Boolean(success)}
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Mật khẩu (tối thiểu 8 ký tự)</Form.Label>
                <Form.Control aria-label="Mật khẩu" autoComplete="new-password" disabled={busy || Boolean(success)}
                  type="password" 
                  required 
                  minLength={8}
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

              <Button disabled={busy || Boolean(success)} type="submit" variant="success" className="w-100 py-2 fw-bold mb-3">
                {busy ? "Đang đăng ký…" : "Hoàn tất đăng ký"}
              </Button>

              <div className="text-center text-muted small">
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-success fw-bold text-decoration-none">
                  Đăng nhập
                </Link>
              </div>
              </fieldset>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}