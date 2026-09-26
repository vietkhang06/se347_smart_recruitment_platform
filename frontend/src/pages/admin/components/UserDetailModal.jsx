import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function UserDetailModal({ show, onHide, user, onToggleStatus, onUserUpdated }) {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Ứng viên");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setRole(user.role);
      setIsEditing(false);
    }
  }, [user, show]);

  if (!user) return null;

  const isActive = user.status === "Hoạt động" || user.status === "Đã xác minh";

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const updates = { name, email, phone, role };
    mockStore.updateUser(user.id, updates);
    if (onUserUpdated) onUserUpdated({ ...user, ...updates });
    showToast(`Đã cập nhật thông tin tài khoản ${user.id}`);
    setIsEditing(false);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-person-badge text-primary me-2"></i>Chi tiết tài khoản người dùng
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {/* Header Profile preview */}
        <div className="d-flex align-items-center gap-3 p-3 rounded mb-3 bg-surface-2 border">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: user.role === "Nhà tuyển dụng" ? "var(--primary)" : user.role === "Quản trị viên" ? "#0f172a" : "var(--purple)"
            }}
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h6 className="fw-bold mb-0 text-truncate">{name}</h6>
            <div className="text-muted small text-truncate">{email}</div>
          </div>
          <Badge bg={isActive ? "success" : "danger"} className="ms-auto">
            {user.status}
          </Badge>
        </div>

        {isEditing ? (
          <Form onSubmit={handleSaveEdit}>
            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Họ và tên</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Email</Form.Label>
              <Form.Control
                type="email"
                size="sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <Form.Label className="small fw-semibold">Số điện thoại</Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Col>
              <Col sm={6}>
                <Form.Label className="small fw-semibold">Vai trò (Role)</Form.Label>
                <Form.Select
                  size="sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Ứng viên">Ứng viên</option>
                  <option value="Nhà tuyển dụng">Nhà tuyển dụng</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </Form.Select>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mb-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                Hủy sửa
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Lưu cập nhật
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <Row className="g-3 mb-3">
              <Col sm={6}>
                <div className="small text-muted">Mã định danh (User ID):</div>
                <div className="fw-semibold"><code>{user.id}</code></div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted">Vai trò tài khoản:</div>
                <div className="fw-semibold">
                  <Badge bg="secondary" className="bg-opacity-10 text-body">{user.role}</Badge>
                </div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted">Số điện thoại:</div>
                <div className="fw-semibold">{user.phone || "Chưa cập nhật"}</div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted">Ngày tham gia:</div>
                <div className="fw-semibold">{user.joined}</div>
              </Col>
              <Col sm={12}>
                <div className="small text-muted">Xác minh danh tính:</div>
                <div className="fw-semibold text-success">
                  <i className="bi bi-shield-check me-1"></i>Đã xác thực Email & Bảo mật hệ thống
                </div>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mb-3">
              <Button variant="outline-primary" size="sm" onClick={() => setIsEditing(true)}>
                <i className="bi bi-pencil-square me-1"></i>Sửa thông tin tài khoản
              </Button>
            </div>
          </>
        )}

        <div className="p-3 rounded bg-surface border small text-muted">
          <i className="bi bi-info-circle text-primary me-1"></i>
          Quản trị viên có toàn quyền điều chỉnh trạng thái tài khoản hoặc thay đổi phân quyền truy cập.
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
          <i className={`bi ${isActive ? "bi-lock" : "bi-unlock"} me-1`}></i>
          {isActive ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
        </Button>
        <Button variant="secondary" onClick={onHide}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}
