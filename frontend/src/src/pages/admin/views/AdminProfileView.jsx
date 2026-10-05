import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";

export default function AdminProfileView() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("Hà Minh Đức");
  const [email, setEmail] = useState("admin@matchajob.vn");
  const [phone, setPhone] = useState("090 888 2026");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");

  const permissions = [
    "Toàn quyền Quản lý Người dùng",
    "Phê duyệt & Từ chối Tin tuyển dụng",
    "Đối soát Doanh nghiệp Tích xanh",
    "Xử lý Khiếu nại & Chế tài Vi phạm",
    "Cấu hình Hệ thống & Bộ lọc AI",
    "Truy xuất Toàn bộ Audit Logs"
  ];

  const handleSave = (e) => {
    e.preventDefault();
    showToast("Đã lưu thông tin quản trị viên thành công!");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Hồ sơ Quản trị viên Cấp cao (Super Admin)</h5>
          <p className="text-muted small mb-0">Thông tin cá nhân, phạm vi quyền hạn và chứng thực tài khoản bảo mật</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSave}>
          <i className="bi bi-check2 me-1"></i>Lưu thay đổi
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: Admin Info Form */}
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                style={{ width: "60px", height: "60px", backgroundColor: "#0f172a", fontSize: "22px", border: "2px solid #3fb978" }}
              >
                AD
              </div>
              <div>
                <h5 className="fw-bold mb-0">{name}</h5>
                <div className="text-muted small">Platform Administrator · MatchaJob Core Team</div>
                <Badge bg="dark" className="border text-warning mt-1">
                  <i className="bi bi-shield-lock-fill me-1"></i>SUPER ADMIN (Level 5)
                </Badge>
              </div>
            </div>

            <Form onSubmit={handleSave}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="small fw-semibold">Họ và tên</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Col>

                <Col md={6}>
                  <Form.Label className="small fw-semibold">Email quản trị</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Col>

                <Col md={6}>
                  <Form.Label className="small fw-semibold">Số điện thoại liên hệ</Form.Label>
                  <Form.Control
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Col>

                <Col md={6}>
                  <Form.Label className="small fw-semibold">Múi giờ hệ thống</Form.Label>
                  <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Asia/Ho_Chi_Minh">(GMT+07:00) Hà Nội, TP.HCM, Bangkok</option>
                    <option value="Asia/Singapore">(GMT+08:00) Singapore</option>
                    <option value="Asia/Tokyo">(GMT+09:00) Tokyo</option>
                  </Form.Select>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Right: RBAC Permissions & Security */}
        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <h5 className="fw-bold mb-1">Phạm vi quyền hạn được cấp (RBAC)</h5>
            <p className="text-muted small mb-3">Được cấp phát bởi System Owner</p>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {permissions.map((perm) => (
                <span key={perm} className="badge bg-secondary bg-opacity-10 text-body p-2 small">
                  <i className="bi bi-shield-check text-success me-1"></i>{perm}
                </span>
              ))}
            </div>

            <div className="d-flex flex-column gap-2 mt-auto">
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => showToast("Đã mở khóa khóa bảo mật phần cứng YubiKey")}
              >
                <i className="bi bi-key-fill me-1"></i>Khóa bảo mật phần cứng (FIDO2)
              </Button>
              <Button
                variant="outline-danger"
                className="w-100"
                onClick={() => {
                  showToast("Đã đăng xuất phiên làm việc của Quản trị viên");
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right me-1"></i>Đăng xuất tài trị viên
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
