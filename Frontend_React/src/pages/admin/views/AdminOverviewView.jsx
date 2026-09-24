import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import PlatformGrowthChart from "../../../components/charts/PlatformGrowthChart";
import { useToast } from "../../../context/ToastContext";

export default function AdminOverviewView({ adminData, onNavigateTab }) {
  const { showToast } = useToast();

  return (
    <div data-aos="fade-up">
      {/* 4 KPI Metrics */}
      <Row className="g-3 mb-4">
        {adminData.metrics.map((m, idx) => (
          <Col lg={3} sm={6} key={idx}>
            <Card className="matcha-card p-3 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-muted small">{m.label}</span>
                <span className="fs-5">{m.icon}</span>
              </div>
              <div className="fs-2 fw-bold text-body mb-1">{m.value}</div>
              <div className="small text-muted">{m.change}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        {/* Platform Growth Chart.js */}
        <Col lg={8}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0">Tăng trưởng người dùng & Tin tuyển dụng</h5>
                <p className="text-muted small mb-0">Biểu đồ đường xu hướng 6 tháng gần nhất (Chart.js)</p>
              </div>
              <span className="badge bg-purple bg-opacity-10 text-purple p-2">+18.2% tăng trưởng</span>
            </div>
            <PlatformGrowthChart growthData={adminData.growthStats} />
          </Card>
        </Col>

        {/* 3 SLA Priority Tasks */}
        <Col lg={4}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <h5 className="fw-bold mb-3">Cảnh báo SLA cần xử lý</h5>
            <div className="d-flex flex-column gap-3 mb-3">
              <div
                className="priority-alert-card danger"
                onClick={() => onNavigateTab("reports")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-danger small">
                    <i className="bi bi-shield-slash me-1"></i>3 Báo cáo nghiêm trọng
                  </strong>
                  <span className="badge bg-danger">SLA 38p</span>
                </div>
                <div className="small text-muted">Có dấu hiệu thu phí ứng tuyển trái phép</div>
              </div>

              <div
                className="priority-alert-card warning"
                onClick={() => onNavigateTab("moderation")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-warning small">
                    <i className="bi bi-clock-history me-1"></i>8 Doanh nghiệp chờ xác minh
                  </strong>
                  <span className="badge bg-warning">Quá 24h</span>
                </div>
                <div className="small text-muted">Hồ sơ pháp lý cần đối soát mã số thuế</div>
              </div>

              <div
                className="priority-alert-card info"
                onClick={() => onNavigateTab("moderation")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-primary small">
                    <i className="bi bi-card-checklist me-1"></i>26 Tin đăng chờ duyệt
                  </strong>
                  <span className="badge bg-secondary">Tự động flag</span>
                </div>
                <div className="small text-muted">Kiểm tra mức lương và tính minh bạch</div>
              </div>
            </div>

            <div className="mt-auto p-3 rounded bg-surface-2 border text-center small text-muted">
              Nhấn vào từng cảnh báo để chuyển hướng xử lý trực tiếp.
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Admin Audit Activity */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold mb-0">Hoạt động quản trị gần nhất</h5>
            <p className="text-muted small mb-0">Nhật ký các thao tác quan trọng trên hệ thống</p>
          </div>
          <Button variant="outline-dark" size="sm" onClick={() => onNavigateTab("logs")}>
            Xem toàn bộ nhật ký →
          </Button>
        </div>

        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Đối tượng tác động</th>
                <th>Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody>
              {adminData.logs.slice(0, 3).map((l, i) => (
                <tr key={i}>
                  <td className="small text-muted">{l.time}</td>
                  <td className="fw-semibold">{l.actor}</td>
                  <td><code>{l.action}</code></td>
                  <td>{l.target}</td>
                  <td><small className="text-muted">{l.ip}</small></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
