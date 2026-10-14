import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Badge,
  Row,
  Col,
  Form,
  Alert
} from "react-bootstrap";
import { saveAdminUser } from "../../../services/adminUsers";
import { useToast } from "../../../context/ToastContext";

export default function UserDetailModal({
  show,
  onHide,
  user,
  onToggleStatus,
  onUserUpdated
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    phone: ""
  });

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || user?.fullName || "",
      phone: user?.phone || ""
    });

    setEditing(false);
    setError("");
  }, [show, user?.id]);

  if (!user) return null;

  const active = [
    "Hoạt động",
    "Đã xác minh"
  ].includes(user.status);

  const save = event => {
    event.preventDefault();
    setError("");

    try {
      const updated = saveAdminUser(
        { ...user, ...form },
        user.id
      );

      onUserUpdated?.(updated);
      setEditing(false);
      showToast("Đã cập nhật người dùng.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          Chi tiết tài khoản người dùng
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="d-flex align-items-center gap-3 p-3 rounded mb-3 bg-surface-2 border">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              backgroundColor: "var(--primary)"
            }}
          >
            {typeof user.avatar === "string" && /^(https?:|data:image\/|blob:|\/)/i.test(user.avatar) ? (
              <img src={user.avatar} alt={user.name || "Ảnh người dùng"} className="rounded-circle w-100 h-100" style={{ objectFit: "cover" }} />
            ) : String(user.avatar || user.name || user.fullName || "US").slice(0, 2).toUpperCase()}
          </div>

          <div className="overflow-hidden">
            <h6 className="fw-bold mb-0">
              {user.name || user.fullName || "Người dùng"}
            </h6>
            <div className="small text-muted">
              {user.email}
            </div>
          </div>

          <Badge
            bg={active ? "success" : "warning"}
            className="ms-auto"
          >
            {user.status}
          </Badge>
        </div>

        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {editing ? (
          <Form onSubmit={save}>
            <Form.Group
              className="mb-2"
              controlId="edit-user-name"
            >
              <Form.Label>Họ và tên</Form.Label>

              <Form.Control
                required
                maxLength={100}
                value={form.name}
                onChange={event =>
                  setForm({
                    ...form,
                    name: event.target.value
                  })
                }
              />
            </Form.Group>

            <Form.Group
              className="mb-2"
              controlId="edit-user-email"
            >
              <Form.Label>Email</Form.Label>
              <Form.Control
                value={user.email || ""}
                readOnly
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <Form.Group controlId="edit-user-phone">
                  <Form.Label>Số điện thoại</Form.Label>

                  <Form.Control
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={event =>
                      setForm({
                        ...form,
                        phone: event.target.value
                      })
                    }
                  />
                </Form.Group>
              </Col>

              <Col sm={6}>
                <Form.Group controlId="edit-user-role">
                  <Form.Label>Vai trò</Form.Label>
                  <Form.Control
                    value={user.role || ""}
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>

            <p className="small text-muted">
              Email và vai trò được giữ nguyên để bảo toàn
              liên kết hồ sơ, CV và đơn ứng tuyển.
            </p>

            <div className="d-flex justify-content-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Hủy sửa
              </Button>

              <Button size="sm" type="submit">
                Lưu cập nhật
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <Row className="g-3 mb-3">
              {[
                ["Mã người dùng", user.id],
                ["Vai trò", user.role],
                [
                  "Số điện thoại",
                  user.phone || "Chưa cập nhật"
                ],
                ["Ngày tham gia", user.joined],
                [
                  "Xác minh",
                  user.isVerified
                    ? "Đã xác minh theo dữ liệu hiện có"
                    : "Chưa xác minh"
                ]
              ].map(([label, value]) => (
                <Col sm={6} key={label}>
                  <div className="small text-muted">
                    {label}
                  </div>

                  <div
                    className="fw-semibold"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {value}
                  </div>
                </Col>
              ))}
            </Row>

            <div className="d-flex justify-content-end">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => {
                  setForm({
                    name: user.name || user.fullName || "",
                    phone: user.phone || ""
                  });
                  setEditing(true);
                }}
              >
                Sửa thông tin tài khoản
              </Button>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-between">
        <Button
          variant={
            active
              ? "outline-danger"
              : "outline-success"
          }
          disabled={
            editing ||
            (!active && user.status !== "Tạm khóa")
          }
          onClick={() => onToggleStatus(user.id)}
        >
          {active
            ? "Tạm khóa tài khoản"
            : "Mở khóa tài khoản"}
        </Button>

        <Button variant="secondary" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
}