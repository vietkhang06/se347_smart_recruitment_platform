import { Alert } from "react-bootstrap";
import { setAdminStatus, deleteAdminUser, runAdminBatch, copyAdminText } from "../../../services/mockStore";
import { useState, useEffect } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import UserDetailModal from "../components/UserDetailModal";
import UserCreateModal from "../components/UserCreateModal";
import CustomThreeDotsToggle from "../../../components/common/CustomThreeDotsToggle";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

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

export default function UsersView({ users = [], setUsers }) {
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { setSelectedUserIds([]); setPage(1); }, [search, roleFilter, statusFilter]);

  const filteredUsers = users.filter((u) => {
    const q = (search || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      String(u.id || "").toLowerCase().includes(q);

    const matchRole = roleFilter === "all" ? true : u.role === roleFilter;

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? u.status === "Hoạt động" || u.status === "Đã xác minh"
        : u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const pages = Math.max(1, Math.ceil(filteredUsers.length / 10));
  const current = Math.min(page, pages);
  const selectedIds = selectedUserIds.filter(id => filteredUsers.some(u => u.id === id));
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.includes(u.id));
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < filteredUsers.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const run = (ids, operation, label) => {
    if (!ids.length || !window.confirm(`${label} ${ids.length} tài khoản?`)) return;
    const result = runAdminBatch(ids, operation);
    setUsers(mockStore.getUsers());
    setSelectedUserIds(result.failed.map(item => item.id));
    setError(result.failed.map(item => `${item.id}: ${item.message}`).join("\n"));
    showToast(`Đã xử lý ${result.succeeded}/${ids.length} tài khoản.`);
  };
  const handleBulkLock = () => run(selectedIds, id => setAdminStatus(id, "Tạm khóa"), "Tạm khóa");
  const handleBulkActivate = () => run(selectedIds, id => setAdminStatus(id, "Hoạt động"), "Mở khóa");
  const handleBulkDelete = () => run(selectedIds, deleteAdminUser, "Xóa");
  const toggleUserStatus = id => {
    const user = mockStore.getUsers().find(u => u.id === id);
    if (!user) return;
    setShowDetailModal(false);
    run([id], key => setAdminStatus(key, user.status === "Tạm khóa" ? "Hoạt động" : "Tạm khóa"), "Đổi trạng thái");
  };
  const handleDeleteUser = id => run([id], deleteAdminUser, "Xóa");

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleUserCreated = () => {
    setUsers(mockStore.getUsers());
  };

  const handleUserUpdated = (updatedUser) => {
    setUsers(mockStore.getUsers());
    setSelectedUser(updatedUser);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quản lý người dùng hệ thống ({users.length})</h5>
          <p className="text-muted small mb-0">Theo dõi thông tin ứng viên, doanh nghiệp tuyển dụng và an toàn tài khoản</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-dark"
            size="sm"
            disabled={!filteredUsers.length} onClick={() => { try { exportUsers(filteredUsers); showToast("Đã tạo tệp CSV."); } catch { setError("Không thể tạo tệp CSV."); } }}
          >
            <i className="bi bi-download me-1"></i>Xuất danh sách
          </Button>
          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-person-plus me-1"></i>Thêm người dùng
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" style={{whiteSpace: "pre-wrap"}}>{error}</Alert>}
      {/* Filter and Search Bar */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <InputGroup size="sm">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo họ tên, email hoặc mã USR-..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <div style={{ width: 170 }}>
          <Form.Select size="sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="Ứng viên">Ứng viên</option>
            <option value="Nhà tuyển dụng">Nhà tuyển dụng</option>
            <option value="Quản trị viên">Quản trị viên</option>
          </Form.Select>
        </div>

        <div style={{ width: 170 }}>
          <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động / Xác minh</option>
            <option value="Tạm khóa">Tạm khóa</option>
            <option value="Chờ xác minh">Chờ xác minh</option>
          </Form.Select>
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success"></i>
            <span>Đã chọn <strong className="text-success">{selectedIds.length}</strong> tài khoản người dùng</span>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkActivate}
            >
              <i className="bi bi-unlock me-1"></i>Kích hoạt đã chọn
            </Button>
            <Button
              variant="outline-warning"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkLock}
            >
              <i className="bi bi-lock me-1"></i>Tạm khóa đã chọn
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash me-1"></i>Xóa đã chọn
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              onClick={() => setSelectedUserIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: "48px", textAlign: "center" }}>
                <Form.Check
                  className="matcha-checkbox-wrap"
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Chọn tất cả người dùng"
                />
              </th>
              <th className="text-center text-nowrap" style={{ width: "110px" }}>Mã người dùng</th>
              <th className="text-start text-nowrap">Họ và tên / Doanh nghiệp</th>
              <th className="text-start text-nowrap">Email liên hệ</th>
              <th className="text-center text-nowrap">Vai trò</th>
              <th className="text-center text-nowrap">Ngày tham gia</th>
              <th className="text-center text-nowrap">Trạng thái</th>
              <th className="text-center text-nowrap" style={{ width: "80px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  Không tìm thấy tài khoản người dùng phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.slice((current - 1) * 10, current * 10).map((u) => {
                const isRoleAdmin = u.role === "Quản trị viên" || u.role === "admin" || u.roleCode === "admin";
                const isRoleEmployer = u.role === "Nhà tuyển dụng" || u.role === "employer" || u.roleCode === "employer";
                const roleLabel = isRoleAdmin ? "Quản trị viên" : isRoleEmployer ? "Nhà tuyển dụng" : "Ứng viên";

                const isActive = u.status === "Hoạt động" || u.status === "Đã xác minh" || u.status === "active" || u.statusCode === "active";
                const isPending = u.status === "Chờ xác minh" || u.status === "pending" || u.statusCode === "pending";
                const statusLabel = isActive ? "Hoạt động" : isPending ? "Chờ xác minh" : (u.status || "Tạm khóa");
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <tr key={u.id} className={isSelected ? "table-active" : ""}>
                    <td className="text-center">
                      <Form.Check
                        className="matcha-checkbox-wrap"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectUser(u.id)}
                        aria-label={`Chọn tài khoản ${u.id}`}
                      />
                    </td>
                    <td className="text-center"><code>{u.id}</code></td>
                    <td className="text-start fw-semibold">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm flex-shrink-0"
                          style={{
                            width: "32px",
                            height: "32px",
                            fontSize: "12px",
                            backgroundColor: isRoleEmployer ? "var(--primary)" : isRoleAdmin ? "#0f172a" : "var(--purple)"
                          }}
                        >
                          {typeof u.avatar === "string" && /^(https?:|data:image\/|blob:|\/)/i.test(u.avatar) ? <img src={u.avatar} alt={u.name || "Ảnh người dùng"} className="rounded-circle w-100 h-100" style={{objectFit: "cover"}} /> : String(u.avatar || u.name || u.fullName || "US").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-body">{u.name || u.fullName || "Người dùng"}</div>
                          {u.companyName && <small className="text-muted">{u.companyName}</small>}
                        </div>
                      </div>
                    </td>
                    <td className="text-start text-muted">{u.email}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          isRoleEmployer
                            ? "status-badge-info"
                            : isRoleAdmin
                            ? "status-badge-purple"
                            : "status-badge-secondary"
                        }`}
                      >
                        {isRoleEmployer && <i className="bi bi-briefcase me-1"></i>}
                        {isRoleAdmin && <i className="bi bi-shield-check me-1"></i>}
                        {!isRoleEmployer && !isRoleAdmin && <i className="bi bi-person me-1"></i>}
                        {roleLabel}
                      </span>
                    </td>
                    <td className="text-center text-muted small">{u.joined || u.createdAt || "Mới gia nhập"}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          isActive
                            ? "status-badge-success"
                            : isPending
                            ? "status-badge-warning"
                            : "status-badge-danger"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="text-center">
                      <Dropdown align="end">
                        <Dropdown.Toggle as={CustomThreeDotsToggle} />
                        <Dropdown.Menu className="matcha-dropdown-menu py-2">
                          <Dropdown.Item
                            onClick={() => handleOpenDetail(u)}
                            className="small py-2"
                          >
                            <i className="bi bi-person-lines-fill text-primary me-2"></i>Xem chi tiết hồ sơ
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => toggleUserStatus(u.id)}
                            className={`small py-2 ${isActive ? "text-warning" : "text-success"}`}
                          >
                            <i className={`bi ${isActive ? "bi-lock text-warning" : "bi-unlock text-success"} me-2`}></i>
                            {isActive ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            onClick={() => {
                              copyAdminText(u.email).then(() => showToast("Đã sao chép email.")).catch(e => setError(e.message));
                            }}
                            className="small py-2"
                          >
                            <i className="bi bi-envelope text-secondary me-2"></i>Sao chép email
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleDeleteUser(u.id)}
                            className="small py-2 text-danger"
                          >
                            <i className="bi bi-trash text-danger me-2"></i>Xóa tài khoản
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small>{filteredUsers.length} kết quả · Trang {current}/{pages}</small>
        <div className="d-flex gap-2"><Button size="sm" variant="outline-secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>Trước</Button><Button size="sm" variant="outline-secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>Sau</Button></div>
      </div>
      {/* User Detail Modal */}
      <UserDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        user={users.find(u => u.id === selectedUser?.id) || null}
        onToggleStatus={toggleUserStatus}
        onUserUpdated={handleUserUpdated}
      />

      {/* User Create Modal */}
      <UserCreateModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />
    </Card>
  );
}