import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";
import { storage } from "../../../services/storage";
import {
  normalizeEmail,
  saveAdminUser
} from "../../../services/adminUsers";

const TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Singapore",
  "Asia/Tokyo"
];

const timezoneKey = (email) =>
  `matchajob_admin_timezone:${normalizeEmail(email)}`;

function readProfile() {
  const session = storage.getUser();
  const email = normalizeEmail(session?.email);

  const account = mockStore
    .getUsers()
    .find((item) => normalizeEmail(item.email) === email);

  let timezone = TIMEZONES[0];

  try {
    const saved = localStorage.getItem(timezoneKey(email));

    if (TIMEZONES.includes(saved)) {
      timezone = saved;
    }
  } catch {
    // Dùng múi giờ mặc định nếu không đọc được.
  }

  return {
    name: account?.name || session?.name || "",
    email,
    phone: account?.phone || "",
    timezone
  };
}

export default function AdminProfileView() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState(readProfile);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (busy) return;

    setError("");
    setBusy(true);

    try {
      const session = storage.getUser();

      if (
        session?.role !== "admin" ||
        normalizeEmail(session.email) !== form.email
      ) {
        throw new Error(
          "Phiên đăng nhập đã thay đổi. Hãy tải lại trang."
        );
      }

      const account = mockStore
        .getUsers()
        .find(
          (item) => normalizeEmail(item.email) === form.email
        );

      if (
        !account ||
        account.role !== "Quản trị viên" ||
        !["Hoạt động", "Đã xác minh"].includes(account.status)
      ) {
        throw new Error(
          "Không tìm thấy tài khoản quản trị đang hoạt động tương ứng."
        );
      }

      if (!TIMEZONES.includes(form.timezone)) {
        throw new Error("Múi giờ không hợp lệ.");
      }

      const key = timezoneKey(form.email);
      const before = localStorage.getItem(key);
      let saved;

      try {
        localStorage.setItem(key, form.timezone);

        saved = saveAdminUser(
          {
            ...account,
            name: form.name,
            phone: form.phone
          },
          account.id
        );
      } catch (cause) {
        try {
          if (before === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, before);
          }
        } catch {
          // Giữ lỗi lưu ban đầu để thông báo.
        }

        throw cause;
      }

      setForm((prev) => ({
        ...prev,
        name: saved.name,
        phone: saved.phone
      }));

      showToast("Đã lưu thông tin quản trị viên.");
    } catch (cause) {
      setError(cause?.message || "Không lưu được hồ sơ.");
    } finally {
      setBusy(false);
    }
  };

  const permissions = [
    "Quản lý người dùng",
    "Phê duyệt và từ chối tin tuyển dụng",
    "Đối soát doanh nghiệp",
    "Xử lý báo cáo vi phạm",
    "Cấu hình hệ thống",
    "Truy xuất nhật ký quản trị"
  ];

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Hồ sơ Quản trị viên
          </h5>
          <p className="text-muted small mb-0">
            Thông tin cá nhân và phạm vi quản trị
          </p>
        </div>

        <Button
          variant="success"
          size="sm"
          className="fw-bold"
          type="submit"
          form="admin-profile-form"
          disabled={busy}
        >
          <i className="bi bi-check2 me-1" />
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4">
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: "#0f172a",
                  fontSize: 22,
                  border: "2px solid #3fb978"
                }}
              >
                {form.name
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "AD"}
              </div>

              <div>
                <h5 className="fw-bold mb-0">
                  {form.name || "Quản trị viên"}
                </h5>
                <div className="text-muted small">
                  MatchaJob
                </div>
                <span className="status-badge status-badge-purple mt-1">
                  <i className="bi bi-shield-lock-fill me-1" />
                  Quản trị hệ thống
                </span>
              </div>
            </div>

            <Form
              id="admin-profile-form"
              onSubmit={handleSave}
            >
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="admin-profile-name">
                    <Form.Label className="small fw-semibold">
                      Họ và tên
                    </Form.Label>
                    <Form.Control
                      required
                      maxLength={100}
                      value={form.name}
                      disabled={busy}
                      onChange={(event) =>
                        change("name", event.target.value)
                      }
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="admin-profile-email">
                    <Form.Label className="small fw-semibold">
                      Email quản trị
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={form.email}
                      readOnly
                    />
                    <Form.Text>
                      Email dùng để liên kết tài khoản đăng nhập.
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="admin-profile-phone">
                    <Form.Label className="small fw-semibold">
                      Số điện thoại liên hệ
                    </Form.Label>
                    <Form.Control
                      type="tel"
                      maxLength={20}
                      value={form.phone}
                      disabled={busy}
                      onChange={(event) =>
                        change("phone", event.target.value)
                      }
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="admin-profile-timezone">
                    <Form.Label className="small fw-semibold">
                      Múi giờ ưu tiên
                    </Form.Label>
                    <Form.Select
                      value={form.timezone}
                      disabled={busy}
                      onChange={(event) =>
                        change("timezone", event.target.value)
                      }
                    >
                      <option value="Asia/Ho_Chi_Minh">
                        (GMT+07:00) Hà Nội, TP.HCM
                      </option>
                      <option value="Asia/Singapore">
                        (GMT+08:00) Singapore
                      </option>
                      <option value="Asia/Tokyo">
                        (GMT+09:00) Tokyo
                      </option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <p className="small text-muted mt-3 mb-0">
                Thông tin được lưu trong bản demo trên trình
                duyệt này. Múi giờ ưu tiên được ghi nhớ, chưa
                áp dụng cho toàn bộ lịch và báo cáo.
              </p>
            </Form>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <h5 className="fw-bold mb-1">
              Phạm vi quản trị
            </h5>
            <p className="text-muted small mb-3">
              Các nhóm chức năng của vai trò quản trị viên
            </p>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {permissions.map((permission) => (
                <span
                  key={permission}
                  className="badge bg-secondary bg-opacity-10 text-body p-2 small"
                >
                  <i className="bi bi-shield-check text-success me-1" />
                  {permission}
                </span>
              ))}
            </div>

            <div className="d-flex flex-column gap-2 mt-auto">
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() =>
                  showToast(
                    "Bản demo chưa tích hợp khóa bảo mật FIDO2."
                  )
                }
              >
                <i className="bi bi-key-fill me-1" />
                Khóa bảo mật phần cứng (FIDO2)
              </Button>

              <Button
                variant="outline-danger"
                className="w-100"
                disabled={busy}
                onClick={logout}
              >
                <i className="bi bi-box-arrow-right me-1" />
                Đăng xuất quản trị viên
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}