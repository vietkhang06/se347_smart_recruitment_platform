import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";

export default function UserDetailModal({ show, onHide, user, onToggleStatus }) {
  const { showToast } = useToast();

  if (!user) return null;

  const isActive = user.status === "Hoạt động" || user.status === "Đã xác minh";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-person-badge text-primary me-2"></i>Chi tiết tài khoản người dùng
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="d-flex align-items-center gap-3 p-3 rounded mb-3 bg-surface-2 border">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
            style={{ width: "48px", height: "48px", backgroundColor: user.role === "Nhà tuyển dụng" ? "var(--primary)" : "var(--purple)" }}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h6 className="fw-bold mb-0 text-truncate">{user.name}</h6>
            <div className="text-muted small text-truncate">{user.email}</div>
          </div>
          <Badge bg={isActive ? "success" : "danger"} className="ms-auto">
            {user.status}
          </Badge>
        </div>

        <Row className="g-3 mb-3">
          <Col sm={6}>
            <div className="small text-muted">Mã định danh (User ID):</div>
            <div className="fw-semibold"><code>{user.id}</code></div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Vai trò tài khoản:</div>
            <div className="fw-semibold"><Badge bg="secondary" className="bg-opacity-10 text-body">{user.role}</Badge></div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Ngày đăng ký tham gia:</div>
            <div className="fw-semibold">{user.joined}</div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Xác minh danh tính:</div>
            <div className="fw-semibold text-success"><i className="bi bi-shield-check me-1"></i>Đã xác thực OTP & Email</div>
          </Col>
        </Row>

        <div className="p-3 rounded bg-surface border small text-muted">
          <i className="bi bi-info-circle text-primary me-1"></i>
          Quản trị viên có thẩm quyền tạm ngưng cung cấp dịch vụ hoặc khôi phục quyền truy cập của người dùng này theo điều khoản nền tảng.
        </div>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button
          variant={isActive ? "outline-danger" : "outline-success"}
          onClick={() => {
            onToggleStatus(user.id);
            onHide();
          }}
        >
          {isActive ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
        </Button>
        <Button variant="secondary" onClick={onHide}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}
