import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import PlatformGrowthChart from "../../../components/charts/PlatformGrowthChart";


export default function AdminOverviewView({ adminData, onNavigateTab }) {


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
                <p className="text-muted small mb-0">Biểu đồ minh họa 6 tháng, chưa kết nối thống kê thực tế</p>
              </div>
              <span className="badge bg-purple bg-opacity-10 text-purple p-2">Dữ liệu minh họa</span>
            </div>
            <PlatformGrowthChart growthData={adminData.growthStats} />
          </Card>
        </Col>

        {/* 3 SLA Priority Tasks */}
        <Col lg={4}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <h5 className="fw-bold mb-3">Cảnh báo cần xử lý</h5>
            <div className="d-flex flex-column gap-3 mb-3">
              <button
                type="button"
                style={{border: 0, cursor: "pointer"}}
                className="priority-alert-card danger text-start w-100"
                onClick={() => onNavigateTab("reports")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="alert-title-danger small d-flex align-items-center gap-1">
                    <i className="bi bi-shield-slash-fill"></i>{adminData.alerts.severeReportsCount} Báo cáo nghiêm trọng
                  </strong>
                  <span className="status-badge status-badge-danger" style={{ fontSize: "11px", padding: "1px 8px" }}>Cần đối soát</span>
                </div>
                <div className="small text-muted">{adminData.alerts.severeReportsCount ? "Mở danh sách để xem và xử lý báo cáo." : "Không có báo cáo nghiêm trọng đang chờ."}</div>
              </button>

              <button
                type="button"
                style={{border: 0, cursor: "pointer"}}
                className="priority-alert-card warning text-start w-100"
                onClick={() => onNavigateTab("moderation")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="alert-title-warning small d-flex align-items-center gap-1">
                    <i className="bi bi-clock-history"></i>{adminData.alerts.pendingCompanyReviews} Doanh nghiệp chờ xác minh
                  </strong>
                  <span className="status-badge status-badge-warning" style={{ fontSize: "11px", padding: "1px 8px" }}>Chờ kiểm tra</span>
                </div>
                <div className="small text-muted">Mở hàng đợi kiểm duyệt doanh nghiệp.</div>
              </button>

              <button
                type="button"
                style={{border: 0, cursor: "pointer"}}
                className="priority-alert-card info text-start w-100"
                onClick={() => onNavigateTab("moderation")}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="alert-title-info small d-flex align-items-center gap-1">
                    <i className="bi bi-card-checklist"></i>{adminData.alerts.pendingJobReviews} Tin đăng chờ duyệt
                  </strong>
                  <span className="status-badge status-badge-info" style={{ fontSize: "11px", padding: "1px 8px" }}>{adminData.alerts.highRiskReviews} rủi ro cao</span>
                </div>
                <div className="small text-muted">Chỉ tin được duyệt mới hiển thị với ứng viên.</div>
              </button>
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
          <Table hover className="matcha-table align-middle mb-0">
            <thead>
              <tr>
                <th className="text-start text-nowrap" style={{ width: "160px" }}>Thời gian</th>
                <th className="text-start text-nowrap">Người thực hiện</th>
                <th className="text-start text-nowrap">Hành động</th>
                <th className="text-start text-nowrap">Đối tượng tác động</th>
                <th className="text-center text-nowrap" style={{ width: "140px" }}>Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody>
              {adminData.logs.slice(0, 3).map((l, i) => (
                <tr key={i}>
                  <td className="text-start text-muted small text-nowrap">{l.time || l.timestamp || "Vừa xong"}</td>
                  <td className="text-start fw-semibold text-body">{l.actor}</td>
                  <td className="text-start"><code>{l.action}</code></td>
                  <td className="text-start text-body">{l.target}</td>
                  <td className="text-center"><small className="text-muted font-monospace">{l.ip}</small></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}