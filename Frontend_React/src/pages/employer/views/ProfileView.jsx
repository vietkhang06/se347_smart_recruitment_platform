import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";

export default function ProfileView() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("Nguyễn Lan Anh");
  const [roleTitle, setRoleTitle] = useState("Talent Acquisition Lead");
  const [email, setEmail] = useState("lananh@fpt.com");
  const [phone, setPhone] = useState("090 123 4567");

  const [twoFactor, setTwoFactor] = useState(true);
  const [deviceAlert, setDeviceAlert] = useState(true);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSaveProfile = (e) => {
    e.preventDefault();
    showToast("Đã lưu thông tin hồ sơ tài khoản tuyển dụng thành công!");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    showToast("Đã cập nhật mật khẩu mới thành công!");
    setShowPasswordModal(false);
    setOldPassword("");
    setNewPassword("");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Hồ sơ chuyên viên tuyển dụng</h5>
          <p className="text-muted small mb-0">Quản lý định danh cá nhân, thông tin liên hệ và cài đặt bảo mật</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSaveProfile}>
          <i className="bi bi-check2 me-1"></i>Lưu thay đổi
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: Profile Identity and Form */}
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                style={{ width: "60px", height: "60px", backgroundColor: "var(--primary)", fontSize: "22px" }}
              >
                LA
              </div>
              <div>
                <h5 className="fw-bold mb-0">{name}</h5>
                <div className="text-muted small">{roleTitle} · FPT Digital Talent</div>
                <Badge bg="success" className="bg-opacity-10 text-success border mt-1">
                  Quản trị viên tuyển dụng
                </Badge>
              </div>
            </div>

            <Form onSubmit={handleSaveProfile}>
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
                  <Form.Label className="small fw-semibold">Chức danh công việc</Form.Label>
                  <Form.Control
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="small fw-semibold">Email làm việc</Form.Label>
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
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Right: Security & Authentication */}
        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <h5 className="fw-bold mb-1">Bảo mật & Quyền truy cập</h5>
            <p className="text-muted small mb-3">Cập nhật lần cuối: 12/09/2026</p>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center p-3 rounded bg-surface-2 border">
                <div>
                  <strong className="d-block small">Xác thực hai bước (2FA)</strong>
                  <span className="text-muted" style={{ fontSize: "11px" }}>Bảo vệ tài khoản qua ứng dụng Authenticator</span>
                </div>
                <Form.Check
                  type="switch"
                  id="switch-2fa"
                  checked={twoFactor}
                  onChange={(e) => {
                    setTwoFactor(e.target.checked);
                    showToast(e.target.checked ? "Đã bật xác thực hai bước (2FA)" : "Đã tắt 2FA");
                  }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center p-3 rounded bg-surface-2 border">
                <div>
                  <strong className="d-block small">Thông báo đăng nhập mới</strong>
                  <span className="text-muted" style={{ fontSize: "11px" }}>Gửi email khi phát hiện thiết bị lạ</span>
                </div>
                <Form.Check
                  type="switch"
                  id="switch-device"
                  checked={deviceAlert}
                  onChange={(e) => {
                    setDeviceAlert(e.target.checked);
                    showToast(e.target.checked ? "Đã bật cảnh báo thiết bị lạ" : "Đã tắt cảnh báo");
                  }}
                />
              </div>
            </div>

            <div className="d-flex flex-column gap-2 mt-auto">
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => setShowPasswordModal(true)}
              >
                <i className="bi bi-key me-1"></i>Đổi mật khẩu
              </Button>
              <Button
                variant="outline-danger"
                className="w-100"
                onClick={() => {
                  showToast("Đã đăng xuất tài khoản nhà tuyển dụng");
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right me-1"></i>Đăng xuất
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Change Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">Đổi mật khẩu tài khoản</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleChangePassword}>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Mật khẩu hiện tại</Form.Label>
              <Form.Control
                type="password"
                required
                placeholder="Nhập mật khẩu hiện tại"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Mật khẩu mới</Form.Label>
              <Form.Control
                type="password"
                required
                placeholder="Ít nhất 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Hủy</Button>
            <Button variant="success" type="submit">Lưu mật khẩu mới</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
