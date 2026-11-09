import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import RecruitmentTrendChart from "../../../components/charts/RecruitmentTrendChart";
import { formatNumber, formatPercent } from "../../../utils/formatUtils";

export default function OverviewView({ employerData, onOpenComposer, onOpenCandidate, onNavigateTab }) {
  const metrics = Array.isArray(employerData?.metrics) ? employerData.metrics : [];
  const candidates = Array.isArray(employerData?.candidates) ? employerData.candidates : [];
  const interviews = Array.isArray(employerData?.interviews) ? employerData.interviews : [];
  const activity = Array.isArray(employerData?.activity) ? employerData.activity : [];

  return (
    <div data-aos="fade-up">
      {/* 4 Metric KPI Cards */}
      <Row className="g-3 mb-4">
        {metrics.map((m, idx) => (
          <Col lg={3} sm={6} key={idx}>
            <Card className="matcha-card p-3 border-0 shadow-sm h-100 hover-shadow transition-all">
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
              <span className="badge bg-success bg-opacity-10 text-success p-2">Dữ liệu hệ thống</span>
            </div>

            <RecruitmentTrendChart weeklyData={employerData.weeklyPerformance} />
          </Card>
        </Col>

        {/* Priority Today Interviews & Quick Actions */}
        <Col lg={4}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Lịch phỏng vấn</h5>
              <button
                type="button"
                className="btn btn-link btn-sm text-success p-0 text-decoration-none fw-semibold"
                onClick={() => onNavigateTab("interviews")}
              >
                Xem lịch →
              </button>
            </div>

            <div className="d-flex flex-column gap-3 mb-4">
              {interviews.length === 0 ? (
                <div className="p-3 rounded border border-dashed text-center text-muted small bg-surface-2">
                  Chưa có lịch phỏng vấn nào sắp tới
                </div>
              ) : (
                interviews.slice(0, 2).map((iv, i) => (
                  <div key={i} className="p-3 rounded border bg-surface-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge bg-primary">{iv.time || "09:00"} · {iv.date || "Hôm nay"}</span>
                      <span className="small text-success fw-semibold">{iv.status || "Sắp diễn ra"}</span>
                    </div>
                    <strong className="d-block text-truncate">{iv.candidate || iv.candidateName || "Ứng viên"}</strong>
                    <div className="text-muted small text-truncate">{iv.role || iv.appliedJobTitle || "Vị trí"}</div>
                  </div>
                ))
              )}
            </div>

            <h6 className="fw-bold mb-2">Hoạt động mới nhất</h6>
            <div className="d-flex flex-column gap-2 small text-muted mt-auto">
              {activity.map((act, i) => (
                <div key={i} className="d-flex align-items-start gap-2">
                  <span className="badge bg-secondary bg-opacity-10 text-body flex-shrink-0">{act.time}</span>
                  <span className="text-truncate-2">{act.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Featured Candidates Row */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div>
            <h5 className="fw-bold mb-0">Ứng viên phù hợp nhất (AI Matching)</h5>
            <p className="text-muted small mb-0">Được sắp xếp theo độ tương thích với các vị trí đang mở</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-success" size="sm" onClick={() => onNavigateTab("ranking")}>
              <i className="bi bi-stars me-1" />
              Bảng xếp hạng AI →
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={() => onNavigateTab("candidates")}>
              Kho ứng viên →
            </Button>
          </div>
        </div>

        <Row className="g-3">
          {candidates.length === 0 ? (
            <Col xs={12}>
              <div className="text-center py-4 text-muted border border-dashed rounded bg-surface-2 small">
                Chưa có hồ sơ ứng viên nộp đơn. Hãy tạo tin tuyển dụng để nhận CV!
              </div>
            </Col>
          ) : (
            candidates.slice(0, 3).map((c) => {
              const score = c.matchScore ?? c.match ?? 88;
              return (
                <Col xs={12} md={4} key={c.id || c.applicationId}>
                  <Card className="p-3 border shadow-sm h-100 bg-surface d-flex flex-column hover-shadow transition-all">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                          style={{ width: "36px", height: "36px", backgroundColor: "var(--primary)", fontSize: "12px" }}
                        >
                          {c.initials || c.candidateInitials || "UV"}
                        </div>
                        <div className="overflow-hidden">
                          <strong className="d-block small text-truncate">{c.name || c.candidateName}</strong>
                          <span className="text-muted d-block text-truncate" style={{ fontSize: "11px" }}>
                            {c.appliedJobTitle || c.role || c.candidateRole || "Ứng viên"}
                          </span>
                        </div>
                      </div>
                      <Badge bg="success" className="bg-opacity-10 text-success flex-shrink-0">
                        {score}%
                      </Badge>
                    </div>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {(Array.isArray(c.skills) ? c.skills : []).slice(0, 4).map((s) => (
                        <span key={s} className="badge bg-secondary bg-opacity-10 text-body" style={{ fontSize: "10px" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                        <span className="text-muted small text-truncate me-1" style={{ fontSize: "12px" }}>
                          <i className="bi bi-geo-alt me-1" />{c.location || "Việt Nam"}
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-success text-decoration-none fw-semibold flex-shrink-0"
                          onClick={() => onOpenCandidate(c)}
                        >
                          Hồ sơ →
                        </Button>
                      </div>
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      </Card>
    </div>
  );
}
