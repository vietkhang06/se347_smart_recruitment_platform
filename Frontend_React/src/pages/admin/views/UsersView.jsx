import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import UserDetailModal from "../components/UserDetailModal";
import { useToast } from "../../../context/ToastContext";

export default function UsersView({ users, setUsers }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());

    const matchRole = roleFilter === "all" ? true : u.role === roleFilter;

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? u.status === "Hoạt động" || u.status === "Đã xác minh"
        : u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const toggleUserStatus = (id) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const isCurrentlyActive = u.status === "Hoạt động" || u.status === "Đã xác minh";
          const newStatus = isCurrentlyActive ? "Tạm khóa" : "Hoạt động";
          showToast(`Đã chuyển trạng thái tài khoản ${u.name} sang: ${newStatus}`);
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quản lý người dùng hệ thống (User Directory)</h5>
          <p className="text-muted small mb-0">Theo dõi thông tin ứng viên, doanh nghiệp tuyển dụng và an toàn tài khoản</p>
        </div>
        <Button
          variant="outline-dark"
          size="sm"
          onClick={() => showToast("Đã xuất danh bạ người dùng (.CSV)")}
        >
          <i className="bi bi-download me-1"></i>Xuất danh sách
        </Button>
      </div>

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

      {/* Users Table */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã người dùng</th>
              <th>Họ và tên / Doanh nghiệp</th>
              <th>Email liên hệ</th>
              <th>Vai trò</th>
              <th>Ngày tham gia</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  Không tìm thấy tài khoản người dùng phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isActive = u.status === "Hoạt động" || u.status === "Đã xác minh";
                return (
                  <tr key={u.id}>
                    <td><code>{u.id}</code></td>
                    <td className="fw-semibold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <Badge bg={u.role === "Nhà tuyển dụng" ? "primary" : "secondary"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="text-muted small">{u.joined}</td>
                    <td>
                      <Badge bg={isActive ? "success" : u.status === "Chờ xác minh" ? "warning" : "danger"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(u)}
                        >
                          Chi tiết
                        </Button>
                        <Button
                          variant={isActive ? "outline-danger" : "outline-success"}
                          size="sm"
                          title={isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          <i className={`bi ${isActive ? "bi-lock" : "bi-unlock"}`}></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* User Detail Modal */}
      <UserDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        user={selectedUser}
        onToggleStatus={toggleUserStatus}
      />
    </Card>
  );
}
