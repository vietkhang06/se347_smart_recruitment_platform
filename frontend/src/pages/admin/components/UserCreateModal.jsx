import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function UserCreateModal({ show, onHide, onUserCreated }) {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Ứng viên");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast("Vui lòng điền đầy đủ họ tên và email");
      return;
    }

    const newUser = mockStore.createUser({
      name,
      email,
      phone,
      role,
      companyName: role === "Nhà tuyển dụng" ? (companyName || name) : "",
      avatar: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "US"
    });

    if (onUserCreated) onUserCreated(newUser);
    showToast(`Đã tạo thành công tài khoản người dùng ${newUser.name} (${newUser.id})`);
    onHide();
    setName("");
    setEmail("");
    setPhone("");
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-person-plus text-primary me-2"></i>Thêm người dùng hệ thống mới
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Họ và tên / Đại diện pháp nhân</Form.Label>
            <Form.Control
              type="text"
              placeholder="VD: Trần Văn Nam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Row className="g-2 mb-3">
            <Col sm={7}>
              <Form.Label className="small fw-semibold">Email tài khoản</Form.Label>
              <Form.Control
                type="email"
                placeholder="VD: nam.tran@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Col>
            <Col sm={5}>
              <Form.Label className="small fw-semibold">Số điện thoại</Form.Label>
              <Form.Control
                type="text"
                placeholder="VD: 0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Vai trò tài khoản (Role)</Form.Label>
            <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Ứng viên">Ứng viên (Candidate)</option>
              <option value="Nhà tuyển dụng">Nhà tuyển dụng (Employer/HR)</option>
              <option value="Quản trị viên">Quản trị viên (Moderator/Admin)</option>
            </Form.Select>
          </Form.Group>

          {role === "Nhà tuyển dụng" && (
            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Tên doanh nghiệp trực thuộc</Form.Label>
              <Form.Control
                type="text"
                placeholder="VD: Tech Startup VN"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Hủy</Button>
          <Button variant="primary" type="submit" className="fw-bold">
            Tạo tài khoản
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
