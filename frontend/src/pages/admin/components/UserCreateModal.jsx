import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert
} from "react-bootstrap";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";
import {
  saveAdminUser,
  USER_ROLES
} from "../../../services/adminUsers";

const empty = {
  name: "",
  email: "",
  phone: "",
  role: "Ứng viên",
  companyId: ""
};

export default function UserCreateModal({
  show,
  onHide,
  onUserCreated
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({ ...empty });
      setError("");
    }
  }, [show]);

  const change = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  };

  const submit = event => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const user = saveAdminUser(form);

      onUserCreated?.(user);

      showToast(
        "Đã thêm người dùng vào danh sách quản trị."
      );

      onHide();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
          Thêm người dùng hệ thống mới
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={submit}>
        <Modal.Body className="p-4">
          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          <Form.Group
            className="mb-3"
            controlId="new-user-name"
          >
            <Form.Label>
              Họ và tên / Đại diện pháp nhân
            </Form.Label>

            <Form.Control
              required
              maxLength={100}
              value={form.name}
              onChange={event =>
                change("name", event.target.value)
              }
            />
          </Form.Group>

          <Row className="g-2 mb-3">
            <Col sm={7}>
              <Form.Group controlId="new-user-email">
                <Form.Label>Email tài khoản</Form.Label>

                <Form.Control
                  type="email"
                  required
                  value={form.email}
                  onChange={event =>
                    change("email", event.target.value)
                  }
                />
              </Form.Group>
            </Col>

            <Col sm={5}>
              <Form.Group controlId="new-user-phone">
                <Form.Label>Số điện thoại</Form.Label>

                <Form.Control
                  type="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={event =>
                    change("phone", event.target.value)
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group
            className="mb-3"
            controlId="new-user-role"
          >
            <Form.Label>Vai trò tài khoản</Form.Label>

            <Form.Select
              value={form.role}
              onChange={event =>
                change("role", event.target.value)
              }
            >
              {USER_ROLES.map(role => (
                <option key={role}>{role}</option>
              ))}
            </Form.Select>
          </Form.Group>

          {form.role === "Nhà tuyển dụng" && (
            <Form.Group controlId="new-user-company">
              <Form.Label>
                Doanh nghiệp trực thuộc
              </Form.Label>

              <Form.Select
                required
                value={form.companyId}
                onChange={event =>
                  change("companyId", event.target.value)
                }
              >
                <option value="">
                  Chọn doanh nghiệp
                </option>

                {mockStore.getCompanies().map(company => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <p className="small text-muted mt-3 mb-0">
            Thao tác này tạo bản ghi người dùng trong
            bản demo, chưa tạo mật khẩu đăng nhập.
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={busy}
          >
            Hủy
          </Button>

          <Button type="submit" disabled={busy}>
            Tạo tài khoản
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}