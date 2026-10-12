import { useState, useEffect } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Badge from "react-bootstrap/Badge";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function LogsView({ logs: initialLogs }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState(() => initialLogs || mockStore.getAuditLogs());
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const handleStoreChange = () => {
      setLogs(mockStore.getAuditLogs());
    };
    window.addEventListener("matchajob:store-changed", handleStoreChange);
    return () => {
      window.removeEventListener("matchajob:store-changed", handleStoreChange);
    };
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = (search || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (l.action || "").toLowerCase().includes(q) ||
      (l.actor || "").toLowerCase().includes(q) ||
      (l.target || "").toLowerCase().includes(q) ||
      (l.ip || "").toLowerCase().includes(q);

    const matchAction =
      actionFilter === "all"
        ? true
        : actionFilter === "admin"
        ? l.actor.includes("admin")
        : actionFilter === "employer"
        ? l.actor.includes("fpt") || l.action.includes("JOB")
        : l.actor.includes("system");

    return matchSearch && matchAction;
  });

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Nhật ký kiểm toán & An ninh (Audit Logs - {logs.length} sự kiện)</h5>
          <p className="text-muted small mb-0">Theo dõi toàn bộ lịch sử tác động, thay đổi quyền hạn và thao tác quản trị theo thời gian thực</p>
        </div>
        <Button
          variant="outline-dark"
          size="sm"
          onClick={() => showToast("Đã xuất tệp Audit Logs (.CSV) thành công")}
        >
          <i className="bi bi-file-earmark-arrow-down me-1"></i>Xuất nhật ký (.CSV)
        </Button>
      </div>

      {/* Filter and Date Strip */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="flex-grow-1" style={{ minWidth: 260 }}>
          <InputGroup size="sm">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo hành động (APPROVE_JOB...), người thực hiện hoặc đối tượng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <div style={{ width: 220 }}>
          <Form.Select
            size="sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">Tất cả nguồn tác động</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="employer">Nhà tuyển dụng (HR)</option>
            <option value="system">Hệ thống AI / Bot</option>
          </Form.Select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              <th className="text-start text-nowrap" style={{ width: "160px" }}>Thời gian</th>
              <th className="text-start text-nowrap">Người thực hiện</th>
              <th className="text-start text-nowrap">Hành động</th>
              <th className="text-start text-nowrap">Đối tượng tác động</th>
              <th className="text-center text-nowrap" style={{ width: "140px" }}>Địa chỉ IP</th>
              <th className="text-center text-nowrap" style={{ width: "110px" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">
                  Không tìm thấy sự kiện kiểm toán nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l, i) => (
                <tr key={i}>
                  <td className="text-start text-muted small text-nowrap">
                    <i className="bi bi-clock me-1"></i>{l.time || l.timestamp || "Vừa xong"}
                  </td>
                  <td className="text-start fw-semibold text-body">{l.actor}</td>
                  <td className="text-start">
                    <code>{l.action}</code>
                  </td>
                  <td className="text-start text-body">{l.target}</td>
                  <td className="text-center">
                    <small className="text-muted font-monospace">{l.ip}</small>
                  </td>
                  <td className="text-center">
                    <span
                      className={`status-badge ${
                        l.status === "success" || l.status === "Thành công"
                          ? "status-badge-success"
                          : l.status === "flagged" || l.status === "Cảnh báo"
                          ? "status-badge-warning"
                          : "status-badge-danger"
                      }`}
                    >
                      {l.status === "success"
                        ? "Thành công"
                        : l.status === "flagged"
                        ? "Cảnh báo"
                        : l.status === "failed"
                        ? "Thất bại"
                        : (l.status || "Thành công")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
