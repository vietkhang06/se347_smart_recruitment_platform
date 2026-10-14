import { Alert } from "react-bootstrap";
import { resolveAdminReport, runAdminBatch, copyAdminText } from "../../../services/mockStore";
import { useState, useEffect } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import ReportDetailModal from "../components/ReportDetailModal";
import CustomThreeDotsToggle from "../../../components/common/CustomThreeDotsToggle";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function ReportsView({ reports = [], setReports }) {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReportIds, setSelectedReportIds] = useState([]);

  const [query, setQuery] = useState("");
  const [severeOnly, setSevereOnly] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setSelectedReportIds([]), [statusFilter, query, severeOnly]);
  const severeCount = reports.filter((r) => r.severity === "Nghiêm trọng" && r.status !== "Đã xử lý").length;
  const inProgressCount = reports.filter((r) => r.status === "Đang xử lý").length;
  const resolvedCount = reports.filter((r) => r.status === "Đã xử lý").length;

  const filteredReports = reports.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (!severeOnly || (r.severity === "Nghiêm trọng" && r.status !== "Đã xử lý")) &&
    [r.id, r.subject, r.targetTitle, r.target, r.reporter, r.reporterName].join(" ").toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectedIds = selectedReportIds.filter(id => filteredReports.some(r => r.id === id && r.status !== "Đã xử lý"));
  const selectable = filteredReports.filter(r => r.status !== "Đã xử lý");
  const isAllSelected = selectable.length > 0 && selectable.every(r => selectedIds.includes(r.id));
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < selectable.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(selectable.map((r) => r.id));
    }
  };

  const handleToggleSelectReport = (id) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkResolve = () => {
    if (!selectedIds.length) return;
    const note = window.prompt(`Nhập kết quả đối soát cho ${selectedIds.length} báo cáo (bắt buộc):`);
    if (note === null) return;
    if (!note.trim()) { setError("Vui lòng nhập kết quả đối soát."); return; }
    if (!window.confirm(`Đánh dấu đã xử lý ${selectedIds.length} báo cáo với ghi chú vừa nhập?`)) return;
    const result = runAdminBatch(selectedIds, id => resolveAdminReport(id, "record", note));
    setReports(mockStore.getReports());
    setSelectedReportIds(result.failed.map(item => item.id));
    setError(result.failed.map(item => `${item.id}: ${item.message}`).join("\n"));
    showToast(`Đã xử lý ${result.succeeded}/${selectedIds.length} báo cáo.`);
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleResolveReport = (id, action, note) => {
    resolveAdminReport(id, action, note);
    setReports(mockStore.getReports());
    showToast(`Đã xử lý báo cáo ${id}`);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Báo cáo vi phạm & Khiếu nại người dùng ({reports.length})</h5>
          <p className="text-muted small mb-0">Giám sát các hành vi vi phạm chính sách, thu phí trái phép hoặc lừa đảo</p>
        </div>
        <Button variant="outline-danger" size="sm" onClick={() => { setSevereOnly(!severeOnly); setStatusFilter("all"); }}>
          <i className="bi bi-shield-exclamation me-1"></i>{severeOnly ? "Hiển thị mọi mức độ" : "Lọc báo cáo nghiêm trọng"}
        </Button>
      </div>

      {error && <Alert variant="danger" style={{whiteSpace: "pre-wrap"}}>{error}</Alert>}
      <Form.Control type="search" className="mb-3" aria-label="Tìm báo cáo" placeholder="Tìm mã, tiêu đề, đối tượng, người báo cáo…" value={query} onChange={e => setQuery(e.target.value)} />
      {/* 3 Summary Compact Metric Blocks */}
      <Row className="g-2 mb-3">
        <Col md={4}>
          <div
            className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between"
            style={{ backgroundColor: "var(--surface-2)", borderColor: "rgba(239, 68, 68, 0.25)" }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: "32px", height: "32px", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
              >
                <i className="bi bi-shield-slash-fill fs-6"></i>
              </div>
              <span className="small fw-semibold text-muted">Vụ việc nghiêm trọng</span>
            </div>
            <span className="fw-bold fs-5 text-danger">{severeCount}</span>
          </div>
        </Col>

        <Col md={4}>
          <div
            className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between"
            style={{ backgroundColor: "var(--surface-2)", borderColor: "rgba(245, 158, 11, 0.25)" }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: "32px", height: "32px", backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}
              >
                <i className="bi bi-hourglass-split fs-6"></i>
              </div>
              <span className="small fw-semibold text-muted">Đang trong tiến trình</span>
            </div>
            <span className="fw-bold fs-5 text-warning">{inProgressCount}</span>
          </div>
        </Col>

        <Col md={4}>
          <div
            className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between"
            style={{ backgroundColor: "var(--surface-2)", borderColor: "rgba(34, 197, 94, 0.25)" }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: "32px", height: "32px", backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#22c55e" }}
              >
                <i className="bi bi-patch-check-fill fs-6"></i>
              </div>
              <span className="small fw-semibold text-muted">Đã xử lý dứt điểm</span>
            </div>
            <span className="fw-bold fs-5 text-success">{resolvedCount}</span>
          </div>
        </Col>
      </Row>

      {/* Modern Filter Pills */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        {[
          { key: "all", label: "Tất cả", count: reports.length },
          { key: "Mới", label: "Mới phát sinh", count: reports.filter((x) => x.status === "Mới").length },
          { key: "Đang xử lý", label: "Đang xử lý", count: reports.filter((x) => x.status === "Đang xử lý").length },
          { key: "Đã xử lý", label: "Đã xử lý", count: reports.filter((x) => x.status === "Đã xử lý").length }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`filter-pill ${statusFilter === item.key ? "active" : ""}`}
            onClick={() => setStatusFilter(item.key)}
          >
            <span>{item.label}</span>
            <span className="badge">{item.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success"></i>
            <span>Đã chọn <strong className="text-success">{selectedIds.length}</strong> báo cáo vi phạm</span>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkResolve}
            >
              <i className="bi bi-check2-all me-1"></i>Đánh dấu đã xử lý
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              onClick={() => setSelectedReportIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Reports Table */}
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
                  aria-label="Chọn tất cả báo cáo"
                />
              </th>
              <th className="text-center text-nowrap" style={{ width: "100px" }}>Mã báo cáo</th>
              <th className="text-start text-nowrap">Tiêu đề phản ánh</th>
              <th className="text-start text-nowrap">Đối tượng bị báo cáo</th>
              <th className="text-start text-nowrap">Người báo cáo</th>
              <th className="text-center text-nowrap">Mức độ</th>
              <th className="text-center text-nowrap">Thời gian</th>
              <th className="text-center text-nowrap">Trạng thái</th>
              <th className="text-center text-nowrap" style={{ width: "80px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  Không có vụ việc nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => {
                const isResolved = r.status === "Đã xử lý";
                const isSelected = selectedReportIds.includes(r.id);
                return (
                  <tr key={r.id} className={isSelected ? "table-active" : ""}>
                    <td className="text-center">
                      <Form.Check
                        className="matcha-checkbox-wrap"
                        type="checkbox"
                        checked={isSelected && !isResolved} disabled={isResolved}
                        onChange={() => handleToggleSelectReport(r.id)}
                        aria-label={`Chọn báo cáo ${r.id}`}
                      />
                    </td>
                    <td className="text-center"><code>{r.id}</code></td>
                    <td className="text-start">
                      <strong className="text-body d-block">{r.subject || r.targetTitle || "Báo cáo vi phạm"}</strong>
                      {r.description && <small className="text-muted text-truncate d-block" style={{ maxWidth: 260 }}>{r.description}</small>}
                    </td>
                    <td className="text-start"><span className="fw-semibold text-body">{r.target || r.targetTitle || "Đối tượng liên quan"}</span></td>
                    <td className="text-start small text-muted">{r.reporter || r.reporterName || "Ẩn danh"}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          r.severity === "Nghiêm trọng"
                            ? "status-badge-danger"
                            : r.severity === "Cao"
                            ? "status-badge-warning"
                            : "status-badge-secondary"
                        }`}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="text-center small text-muted">{r.age || r.createdAt || "Gần đây"}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          isResolved
                            ? "status-badge-success"
                            : r.status === "Đang xử lý"
                            ? "status-badge-warning"
                            : "status-badge-danger"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <Dropdown align="end">
                        <Dropdown.Toggle as={CustomThreeDotsToggle} />
                        <Dropdown.Menu className="matcha-dropdown-menu py-2">
                          <Dropdown.Item onClick={() => handleOpenReport(r)} className="small py-2">
                            <i className="bi bi-eye text-primary me-2"></i>Xem chi tiết vụ việc
                          </Dropdown.Item>
                          {!isResolved && (
                            <Dropdown.Item
                              onClick={() => {
                                handleOpenReport(r);
                              }}
                              className="small py-2 text-success"
                            >
                              <i className="bi bi-check2-circle text-success me-2"></i>Đánh dấu đã xử lý
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item onClick={() => copyAdminText(r.id).then(() => showToast("Đã sao chép mã.")).catch(e => setError(e.message))} className="small py-2">
                            <i className="bi bi-link-45deg text-secondary me-2"></i>Sao chép mã vụ việc
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            onClick={() => {
                              if (window.confirm(`Xác nhận cảnh cáo đối tượng ${r.target || r.targetTitle}?`)) {
                                showToast("Chưa tích hợp gửi cảnh cáo. Hãy ghi nhận quyết định trong hồ sơ báo cáo.");
                              }
                            }}
                            className="small py-2 text-danger"
                          >
                            <i className="bi bi-shield-exclamation text-danger me-2"></i>Cảnh cáo đối tượng
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

      {/* Report Detail Modal */}
      <ReportDetailModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setSelectedReport(null);
        }}
        report={reports.find(r => r.id === selectedReport?.id) || null}
        onResolve={handleResolveReport}
      />
    </Card>
  );
}