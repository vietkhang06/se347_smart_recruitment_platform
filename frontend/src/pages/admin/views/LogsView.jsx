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
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.target.toLowerCase().includes(search.toLowerCase()) ||
      l.ip.toLowerCase().includes(search.toLowerCase());

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
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Hành động (Action)</th>
              <th>Đối tượng tác động</th>
              <th>Địa chỉ IP</th>
              <th>Trạng thái</th>
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
                  <td className="small text-muted" style={{ whiteSpace: "nowrap" }}>
                    <i className="bi bi-clock me-1"></i>{l.time}
                  </td>
                  <td className="fw-semibold">
                    <span className="small text-body">{l.actor}</span>
                  </td>
                  <td>
                    <Badge
                      bg={
                        l.action.includes("APPROVE") || l.action.includes("CREATE")
                          ? "success"
                          : l.action.includes("DELETE") || l.action.includes("REJECT") || l.action.includes("SUSPEND")
                          ? "danger"
                          : "primary"
                      }
                      className="bg-opacity-10 text-body border"
                    >
                      {l.action}
                    </Badge>
                  </td>
                  <td><strong>{l.target}</strong></td>
                  <td>
                    <small className="text-muted font-monospace">{l.ip}</small>
                  </td>
                  <td>
                    <span className="badge bg-success bg-opacity-10 text-success">
                      {l.status || "Thành công"}
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
