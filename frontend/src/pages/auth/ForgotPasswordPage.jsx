import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useToast } from "../../context/ToastContext";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const { showToast } = useToast();

  const handleSendEmail = (e) => {
    e.preventDefault();
    setStep(2);
    showToast("Mã xác thực OTP đã được gửi đến email của bạn");
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setStep(3);
    showToast("Xác thực OTP thành công. Vui lòng thiết lập mật khẩu mới");
  };

  return (
    <Container className="py-5 my-auto">
      <Row className="justify-content-center">
        <Col lg={5} md={7}>
          <Card className="matcha-card p-4 p-md-5 border-0 shadow-lg text-center" data-aos="zoom-in">
            {step === 1 && (
              <Form onSubmit={handleSendEmail}>
                <div className="mb-4">
                  <div className="rounded-circle p-3 bg-success bg-opacity-10 text-success d-inline-block mb-3 fs-2">
                    <i className="bi bi-key"></i>
                  </div>
                  <h4 className="fw-bold mb-1">Khôi phục mật khẩu</h4>
                  <p className="text-muted small">Nhập email liên kết với tài khoản để nhận mã xác minh OTP</p>
                </div>

                <Form.Group className="mb-4 text-start">
                  <Form.Label className="small fw-semibold">Địa chỉ Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    required 
                    placeholder="name@example.com"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </Form.Group>

                <Button type="submit" variant="success" className="w-100 py-2 fw-bold mb-3">
                  Gửi mã xác thực
                </Button>

                <Link to="/login" className="small text-muted text-decoration-none">
                  <i className="bi bi-arrow-left me-1"></i>Quay lại đăng nhập
                </Link>
              </Form>
            )}

            {step === 2 && (
              <Form onSubmit={handleVerifyOtp}>
                <div className="mb-4">
                  <div className="rounded-circle p-3 bg-primary bg-opacity-10 text-primary d-inline-block mb-3 fs-2">
                    <i className="bi bi-shield-lock"></i>
                  </div>
                  <h4 className="fw-bold mb-1">Nhập mã xác thực OTP</h4>
                  <p className="text-muted small">Mã 6 chữ số vừa được gửi tới <strong>{email}</strong></p>
                </div>

                <div className="d-flex justify-content-center gap-2 mb-4">
                  {otp.map((digit, idx) => (
                    <Form.Control
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      className="text-center fw-bold fs-4"
                      style={{ width: "46px", height: "54px" }}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                    />
                  ))}
                </div>

                <Button type="submit" variant="success" className="w-100 py-2 fw-bold mb-3">
                  Xác nhận mã OTP
                </Button>

                <button 
                  type="button" 
                  className="btn btn-link btn-sm text-muted text-decoration-none"
                  onClick={() => setStep(1)}
                >
                  Gửi lại mã OTP
                </button>
              </Form>
            )}

            {step === 3 && (
              <div>
                <div className="mb-4">
                  <div className="rounded-circle p-3 bg-success text-white d-inline-block mb-3 fs-2 shadow-sm">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <h4 className="fw-bold mb-1">Khôi phục thành công!</h4>
                  <p className="text-muted small">Mật khẩu mới đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.</p>
                </div>

                <Button as={Link} to="/login" variant="success" className="w-100 py-2 fw-bold">
                  Đăng nhập ngay
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
