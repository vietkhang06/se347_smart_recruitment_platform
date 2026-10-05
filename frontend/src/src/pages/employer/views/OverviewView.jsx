import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import RecruitmentTrendChart from "../../../components/charts/RecruitmentTrendChart";
import { useToast } from "../../../context/ToastContext";

export default function OverviewView({ employerData, onOpenComposer, onOpenCandidate, onNavigateTab }) {
  const { showToast } = useToast();

  return (
    <div data-aos="fade-up">
      {/* 4 Metric KPI Cards */}
      <Row className="g-3 mb-4">
        {employerData.metrics.map((m, idx) => (
          <Col lg={3} sm={6} key={idx}>
            <Card className="matcha-card p-3 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-muted small">{m.label}</span>
                <span className="fs-5">{m.icon}</span>
              </div>
              <div className="fs-2 fw-bold text-success mb-1">{m.value}</div>
              <div className="small text-muted">
                <span className="text-success fw-medium me-1">{m.change}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        {/* Main Performance Chart (Chart.js) */}
        <Col lg={8}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0">Hiệu suất tuyển dụng 7 ngày gần nhất</h5>
                <p className="text-muted small mb-0">Lượt nộp hồ sơ & lượt xem tin tương tác</p>
              </div>
              <span className="badge bg-success bg-opacity-10 text-success p-2">+12.8% tuần này</span>
            </div>

            <RecruitmentTrendChart weeklyData={employerData.weeklyPerformance} />
          </Card>
        </Col>

        {/* Priority Today Interviews & Quick Actions */}
        <Col lg={4}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Lịch phỏng vấn hôm nay</h5>
              <button
                type="button"
                className="btn btn-link btn-sm text-success p-0 text-decoration-none fw-semibold"
                onClick={() => onNavigateTab("interviews")}
              >
                Xem lịch →
              </button>
            </div>

            <div className="d-flex flex-column gap-3 mb-4">
              {employerData.interviews.slice(0, 2).map((iv, i) => (
                <div key={i} className="p-3 rounded border bg-surface-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="badge bg-primary">{iv.time} · {iv.date}</span>
                    <span className="small text-success fw-semibold">{iv.status}</span>
                  </div>
                  <strong className="d-block">{iv.candidate}</strong>
                  <div className="text-muted small">{iv.role}</div>
                </div>
              ))}
            </div>

            <h6 className="fw-bold mb-2">Hoạt động mới nhất</h6>
            <div className="d-flex flex-column gap-2 small text-muted mt-auto">
              {employerData.activity.map((act, i) => (
                <div key={i} className="d-flex align-items-start gap-2">
                  <span className="badge bg-secondary bg-opacity-10 text-body">{act.time}</span>
                  <span>{act.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Featured Candidates Row */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold mb-0">Ứng viên phù hợp nhất (AI Matching)</h5>
            <p className="text-muted small mb-0">Được sắp xếp theo độ tương thích với các vị trí đang mở</p>
          </div>
          <Button variant="outline-success" size="sm" onClick={() => onNavigateTab("candidates")}>
            Xem toàn bộ kho ứng viên →
          </Button>
        </div>

        <Row className="g-3">
          {employerData.candidates.slice(0, 3).map((c) => (
            <Col md={4} key={c.id}>
              <Card className="p-3 border shadow-sm h-100 bg-surface">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                      style={{ width: "36px", height: "36px", backgroundColor: "var(--primary)", fontSize: "12px" }}
                    >
                      {c.initials}
                    </div>
                    <div>
                      <strong className="d-block small">{c.name}</strong>
                      <span className="text-muted" style={{ fontSize: "11px" }}>{c.role}</span>
                    </div>
                  </div>
                  <Badge bg="success" className="bg-opacity-10 text-success">{c.match}%</Badge>
                </div>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {c.skills.map((s) => (
                    <span key={s} className="badge bg-secondary bg-opacity-10 text-body" style={{ fontSize: "10px" }}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                  <span className="text-muted small"><i className="bi bi-geo-alt me-1"></i>{c.location}</span>
                  <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold" onClick={() => onOpenCandidate(c)}>
                    Xem hồ sơ →
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
