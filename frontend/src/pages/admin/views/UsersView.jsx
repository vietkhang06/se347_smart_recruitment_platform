import { useState } from "react";
import {
  Card,
  Button,
  Table,
  Badge,
  Form,
  Modal,
  Alert
} from "react-bootstrap";
import UserDetailModal from "../components/UserDetailModal";
import UserCreateModal from "../components/UserCreateModal";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";
import {
  changeAdminUserStatus,
  USER_ROLES
} from "../../../services/adminUsers";

function exportUsers(users) {
  const cell = value => {
    let text = String(value ?? "");

    if (/^\s*[=+@-]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  };

  const rows = [
    ["Mã", "Họ tên", "Email", "Vai trò", "Trạng thái"],
    ...users.map(user => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.status
    ])
  ];

  const content = "\uFEFF" + rows
    .map(row => row.map(cell).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([content], {
      type: "text/csv;charset=utf-8"
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download = "matchajob-users.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function UsersView({
  users = [],
  setUsers
}) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const active = user =>
    ["Hoạt động", "Đã xác minh"].includes(user.status);

  const filtered = users.filter(user => {
    const matchesSearch = [
      user.id,
      user.name,
      user.email
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesRole =
      role === "all" || user.role === role;

    const matchesStatus =
      status === "all" ||
      (
        status === "active"
          ? active(user)
          : user.status === status
      );

    return matchesSearch && matchesRole && matchesStatus;
  });

  const pages = Math.max(
    1,
    Math.ceil(filtered.length / 10)
  );

  const current = Math.min(page, pages);

  const selected = users.find(
    user => user.id === selectedId
  );

  const refresh = () => {
    setUsers(mockStore.getUsers());
  };

  const requestStatus = id => {
    const user = mockStore
      .getUsers()
      .find(item => item.id === id);

    if (!user) return;

    setSelectedId(null);
    setError("");
    setConfirm(user);
  };

  const applyStatus = () => {
    try {
      const updated = changeAdminUserStatus(
        confirm.id,
        confirm.status
      );

      refresh();
      setConfirm(null);

      showToast(
        `Đã cập nhật trạng thái: ${updated.status}`
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card
      className="matcha-card p-4 border-0 shadow-sm"
      data-aos="fade-up"
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Quản lý người dùng hệ thống ({users.length})
          </h5>

          <p className="text-muted small mb-0">
            Theo dõi thông tin ứng viên, doanh nghiệp
            tuyển dụng và an toàn tài khoản
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-dark"
            size="sm"
            disabled={!filtered.length}
            onClick={() => {
              try {
                exportUsers(filtered);
              } catch {
                showToast("Không thể xuất CSV.");
              }
            }}
          >
            Xuất danh sách
          </Button>

          <Button
            variant="success"
            size="sm"
            onClick={() => setCreating(true)}
          >
            Thêm người dùng
          </Button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Form.Control
          size="sm"
          style={{ flex: "1 1 240px" }}
          aria-label="Tìm người dùng"
          placeholder="Tìm họ tên, email hoặc mã…"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Form.Select
          size="sm"
          style={{ width: 190 }}
          aria-label="Lọc vai trò"
          value={role}
          onChange={event => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả vai trò</option>

          {USER_ROLES.map(item => (
            <option key={item}>{item}</option>
          ))}
        </Form.Select>

        <Form.Select
          size="sm"
          style={{ width: 190 }}
          aria-label="Lọc trạng thái"
          value={status}
          onChange={event => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">
            Hoạt động / Xác minh
          </option>
          <option>Tạm khóa</option>
          <option>Chờ xác minh</option>
        </Form.Select>
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              {[
                "Mã người dùng",
                "Họ và tên / Doanh nghiệp",
                "Email liên hệ",
                "Vai trò",
                "Ngày tham gia",
                "Trạng thái",
                "Thao tác"
              ].map(label => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!filtered.length && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-4 text-muted"
                >
                  Không tìm thấy tài khoản phù hợp.
                </td>
              </tr>
            )}

            {filtered
              .slice((current - 1) * 10, current * 10)
              .map(user => (
                <tr key={user.id}>
                  <td>
                    <code
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {user.id}
                    </code>
                  </td>

                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: "var(--primary)"
                        }}
                      >
                        {String(user.name || "US")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>{user.name}</strong>

                        {user.companyName && (
                          <small className="d-block text-muted">
                            {user.companyName}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>{user.email}</td>

                  <td>
                    <Badge
                      bg={
                        user.role === "Quản trị viên"
                          ? "dark"
                          : "secondary"
                      }
                    >
                      {user.role}
                    </Badge>
                  </td>

                  <td className="small">
                    {user.joined}
                  </td>

                  <td>
                    <Badge
                      bg={
                        active(user)
                          ? "success"
                          : user.status === "Tạm khóa"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>

                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() =>
                          setSelectedId(user.id)
                        }
                      >
                        Chi tiết
                      </Button>

                      <Button
                        size="sm"
                        variant={
                          active(user)
                            ? "outline-danger"
                            : "outline-success"
                        }
                        disabled={
                          !active(user) &&
                          user.status !== "Tạm khóa"
                        }
                        onClick={() =>
                          requestStatus(user.id)
                        }
                      >
                        {active(user) ? "Khóa" : "Mở khóa"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 gap-2">
        <small>
          {filtered.length} kết quả · Trang {current}/{pages}
        </small>

        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Trước
          </Button>

          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            Sau
          </Button>
        </div>
      </div>

      <UserDetailModal
        show={Boolean(selected)}
        user={selected}
        onHide={() => setSelectedId(null)}
        onToggleStatus={requestStatus}
        onUserUpdated={refresh}
      />

      <UserCreateModal
        show={creating}
        onHide={() => setCreating(false)}
        onUserCreated={refresh}
      />

      <Modal
        show={Boolean(confirm)}
        onHide={() => setConfirm(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            Xác nhận đổi trạng thái
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          Bạn muốn{" "}
          {confirm?.status === "Tạm khóa"
            ? "mở khóa"
            : "tạm khóa"}{" "}
          tài khoản <strong>{confirm?.email}</strong>?
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirm(null)}
          >
            Hủy
          </Button>

          <Button
            variant="danger"
            onClick={applyStatus}
          >
            Xác nhận
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}