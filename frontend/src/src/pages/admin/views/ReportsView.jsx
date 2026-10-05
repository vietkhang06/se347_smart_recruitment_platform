import { useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import ReportDetailModal from "../components/ReportDetailModal";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function ReportsView({ reports, setReports }) {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const severeCount = reports.filter((r) => r.severity === "Nghiêm trọng" && r.status !== "Đã xử lý").length;
  const inProgressCount = reports.filter((r) => r.status === "Đang xử lý").length;
  const resolvedCount = reports.filter((r) => r.status === "Đã xử lý").length;

  const filteredReports = reports.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleResolveReport = (id, actionDesc, note) => {
    let penaltyAction = "";
    if (actionDesc.includes("Ẩn tin") || actionDesc.includes("gỡ")) penaltyAction = "close_job";
    if (actionDesc.includes("Khóa")) penaltyAction = "suspend_company";

    mockStore.resolveReport(id, actionDesc, penaltyAction, note);
    setReports(mockStore.getReports());
    showToast(`Đã xử lý vụ việc ${id}: ${actionDesc}`);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Báo cáo vi phạm & Khiếu nại người dùng ({reports.length})</h5>
          <p className="text-muted small mb-0">Giám sát các hành vi vi phạm chính sách, thu phí trái phép hoặc lừa đảo</p>
        </div>
        <Button variant="outline-danger" size="sm" onClick={() => showToast("Đã kích hoạt quét tự động các từ khóa lừa đảo")}>
          <i className="bi bi-shield-exclamation me-1"></i>Quét cảnh báo cao
        </Button>
      </div>

      {/* 3 Summary Dynamic Metric Blocks */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="p-3 rounded border border-danger bg-danger bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-danger small fw-semibold">Vụ việc nghiêm trọng</span>
              <div className="fs-3 fw-bold text-danger">{severeCount}</div>
            </div>
            <i className="bi bi-shield-slash-fill fs-2 text-danger opacity-75"></i>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 rounded border border-warning bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-warning small fw-semibold">Đang trong tiến trình</span>
              <div className="fs-3 fw-bold text-warning">{inProgressCount}</div>
            </div>
            <i className="bi bi-hourglass-split fs-2 text-warning opacity-75"></i>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 rounded border border-success bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-success small fw-semibold">Đã xử lý dứt điểm</span>
              <div className="fs-3 fw-bold text-success">{resolvedCount}</div>
            </div>
            <i className="bi bi-patch-check-fill fs-2 text-success opacity-75"></i>
          </div>
        </Col>
      </Row>

      {/* Filter strip */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="btn-group btn-group-sm">
          {[
            { key: "all", label: `Tất cả (${reports.length})` },
            { key: "Mới", label: "Mới phát sinh" },
            { key: "Đang xử lý", label: "Đang xử lý" },
            { key: "Đã xử lý", label: "Đã xử lý" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`btn ${statusFilter === item.key ? "btn-danger fw-bold" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã báo cáo</th>
              <th>Tiêu đề phản ánh</th>
              <th>Đối tượng bị báo cáo</th>
              <th>Người báo cáo</th>
              <th>Mức độ</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  Không có vụ việc nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => {
                const isResolved = r.status === "Đã xử lý";
                return (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td>
                      <strong className="text-body d-block">{r.subject}</strong>
                      {r.description && <small className="text-muted text-truncate d-block" style={{ maxWidth: 260 }}>{r.description}</small>}
                    </td>
                    <td><span className="fw-semibold">{r.target}</span></td>
                    <td className="small text-muted">{r.reporter}</td>
                    <td>
                      <Badge bg={r.severity === "Nghiêm trọng" ? "danger" : r.severity === "Cao" ? "warning" : "secondary"}>
                        {r.severity}
                      </Badge>
                    </td>
                    <td className="small text-muted">{r.age}</td>
                    <td>
                      <Badge bg={isResolved ? "success" : r.status === "Đang xử lý" ? "warning" : "danger"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant={isResolved ? "outline-secondary" : "outline-danger"}
                        size="sm"
                        onClick={() => handleOpenReport(r)}
                      >
                        {isResolved ? "Xem hồ sơ" : "Xử lý vi phạm"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onResolve={handleResolveReport}
      />
    </Card>
  );
}
