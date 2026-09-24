import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import { useToast } from "../../../context/ToastContext";

export default function SystemView() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState([
    { id: "s1", label: "Tự động duyệt tin đăng từ các doanh nghiệp đã xác minh", desc: "Cho phép các tin đạt chuẩn từ doanh nghiệp tích xanh xuất bản ngay", checked: true },
    { id: "s2", label: "Kích hoạt bộ lọc AI phát hiện nội dung rủi ro", desc: "Tự động flag các tin có dấu hiệu thu phí hoặc từ ngữ phân biệt đối xử", checked: true },
    { id: "s3", label: "Bắt buộc công khai mức thu nhập trong tin tuyển dụng", desc: "Không cho phép để trống trường lương hoặc ẩn lương", checked: true },
    { id: "s4", label: "Gửi email cảnh báo vi phạm SLA sau 30 phút", desc: "Cảnh báo khẩn cấp tới đội ngũ quản trị khi có báo cáo chưa xử lý", checked: true },
    { id: "s5", label: "Bật chế độ bảo trì hệ thống toàn diện", desc: "Tạm dừng truy cập công khai của ứng viên để nâng cấp hạ tầng", checked: false }
  ]);

  const services = [
    { name: "Cổng web Ứng viên (Candidate App)", latency: "120ms", status: "Online" },
    { name: "Cổng web Tuyển dụng (Employer Portal)", latency: "142ms", status: "Online" },
    { name: "Dịch vụ AI Matching & Sàng lọc CV", latency: "320ms", status: "Online" },
    { name: "Dịch vụ Email & SMS Gateway", latency: "98ms", status: "Online" },
    { name: "Cổng thanh toán & Hóa đơn VietQR", latency: "164ms", status: "Online" }
  ];

  const handleToggle = (id) => {
    setSettings(
      settings.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const handleSave = () => {
    showToast("Đã lưu toàn bộ cấu hình quy tắc vận hành hệ thống!");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Cấu hình hệ thống & An ninh vận hành</h5>
          <p className="text-muted small mb-0">Thiết lập quy tắc tự động hóa, kiểm soát bảo mật và giám sát tình trạng hạ tầng</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSave}>
          <i className="bi bi-check2 me-1"></i>Lưu cấu hình
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: 5 Switch Settings */}
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <h5 className="fw-bold mb-3">Quy tắc tự động & Chính sách nền tảng</h5>
            <div className="d-flex flex-column gap-3">
              {settings.map((s) => (
                <div
                  key={s.id}
                  className="d-flex justify-content-between align-items-center p-3 rounded bg-surface-2 border"
                >
                  <div className="pe-3">
                    <strong className="d-block text-body small mb-1">{s.label}</strong>
                    <span className="text-muted" style={{ fontSize: "12px" }}>{s.desc}</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id={s.id}
                    checked={s.checked}
                    onChange={() => handleToggle(s.id)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Right: Service Health & Security Info */}
        <Col lg={5}>
          {/* Service Health Card */}
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0">Tình trạng dịch vụ (Service Health)</h5>
                <small className="text-muted">Cập nhật thời gian thực</small>
              </div>
              <span className="badge bg-success bg-opacity-10 text-success">Uptime 99.98%</span>
            </div>

            <div className="table-responsive">
              <Table hover className="align-middle mb-0 small">
                <tbody>
                  {services.map((svc, i) => (
                    <tr key={i}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="service-dot online"></span>
                          <span className="fw-semibold">{svc.name}</span>
                        </div>
                      </td>
                      <td className="text-end"><code>{svc.latency}</code></td>
                      <td className="text-end text-success fw-bold">{svc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          {/* Security Info Card */}
          <Card className="matcha-card p-4 border-0 shadow-sm">
            <h5 className="fw-bold mb-3">Chính sách bảo mật hệ thống</h5>
            <div className="d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Thời gian hết hạn phiên làm việc:</span>
                <strong>30 phút không hoạt động</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Xác thực 2 bước (2FA):</span>
                <strong className="text-success">Bắt buộc đối với toàn bộ Admin</strong>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span className="text-muted">Mã hóa dữ liệu tại chỗ:</span>
                <strong className="text-success">AES-256 Bit GCM</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
