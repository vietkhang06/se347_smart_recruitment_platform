import { useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import ReportDetailModal from "../components/ReportDetailModal";
import { useToast } from "../../../context/ToastContext";

export default function ReportsView({ reports, setReports }) {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleResolveReport = (id, actionDesc, note) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "Đã xử lý", resolution: actionDesc, note }
          : r
      )
    );
    showToast(`Đã xử lý vụ việc ${id}: ${actionDesc}`);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Báo cáo vi phạm & Khiếu nại người dùng</h5>
          <p className="text-muted small mb-0">Giám sát các hành vi vi phạm chính sách, thu phí trái phép hoặc lừa đảo</p>
        </div>
        <Button variant="outline-danger" size="sm" onClick={() => showToast("Đã kích hoạt quét tự động các từ khóa lừa đảo")}>
          <i className="bi bi-shield-exclamation me-1"></i>Quét cảnh báo cao
        </Button>
      </div>

      {/* 3 Summary Metric Blocks */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="p-3 rounded border border-danger bg-danger bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-danger small fw-semibold">Vụ việc nghiêm trọng</span>
              <div className="fs-3 fw-bold text-danger">3</div>
            </div>
            <i className="bi bi-shield-slash-fill fs-2 text-danger opacity-75"></i>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 rounded border border-warning bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-warning small fw-semibold">Đang trong tiến trình</span>
              <div className="fs-3 fw-bold text-warning">6</div>
            </div>
            <i className="bi bi-hourglass-split fs-2 text-warning opacity-75"></i>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 rounded border border-success bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-success small fw-semibold">Tỷ lệ đúng hạn SLA</span>
              <div className="fs-3 fw-bold text-success">92%</div>
            </div>
            <i className="bi bi-check-circle-fill fs-2 text-success opacity-75"></i>
          </div>
        </Col>
      </Row>

      {/* Reports Table */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã báo cáo</th>
              <th>Nội dung phản ánh</th>
              <th>Đối tượng bị báo cáo</th>
              <th>Người gửi</th>
              <th>Mức độ</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((rp) => (
              <tr key={rp.id}>
                <td><code>{rp.id}</code></td>
                <td>
                  <strong className="d-block text-danger">{rp.subject}</strong>
                </td>
                <td className="fw-semibold">{rp.target}</td>
                <td className="text-muted small">{rp.reporter}</td>
                <td>
                  <Badge bg={rp.severity === "Nghiêm trọng" ? "danger" : "warning"}>
                    {rp.severity}
                  </Badge>
                </td>
                <td className="text-muted small">{rp.age}</td>
                <td>
                  <Badge bg={rp.status === "Đã xử lý" ? "success" : "warning"}>
                    {rp.status}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant={rp.status === "Đã xử lý" ? "outline-secondary" : "outline-danger"}
                    size="sm"
                    onClick={() => handleOpenReport(rp)}
                  >
                    {rp.status === "Đã xử lý" ? "Chi tiết" : "Xử lý →"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        show={showModal}
        onHide={() => setShowModal(false)}
        report={selectedReport}
        onResolve={handleResolveReport}
      />
    </Card>
  );
}
