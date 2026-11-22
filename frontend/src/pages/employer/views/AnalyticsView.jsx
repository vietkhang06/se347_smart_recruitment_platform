import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import RecruitmentFunnelChart from "../../../components/charts/RecruitmentFunnelChart";
import SourceDistributionChart from "../../../components/charts/SourceDistributionChart";
import { useToast } from "../../../context/ToastContext";
import { formatNumber, formatPercent } from "../../../utils/formatUtils";

export default function AnalyticsView({ employerData, isLoading = false, error = null, onRetry }) {
  const { showToast } = useToast();

  const candidates = Array.isArray(employerData?.candidates) ? employerData.candidates : [];
  const jobs = Array.isArray(employerData?.jobs) ? employerData.jobs : [];
  const interviews = Array.isArray(employerData?.interviews) ? employerData.interviews : [];
  const candidatesCount = candidates.length;
  const funnel = employerData?.funnel || { counts: [0, 0, 0, 0, 0], labels: [] };
  const counts = Array.isArray(funnel.counts) ? funnel.counts : [0, 0, 0, 0, 0];

  const progressedCount = (counts[1] || 0) + (counts[2] || 0) + (counts[3] || 0) + (counts[4] || 0);
  const screeningPassed = candidatesCount > 0 ? Math.round((progressedCount / candidatesCount) * 1000) / 10 : 0;
  const offerRate = candidatesCount > 0 ? Math.round(((counts[4] || 0) / candidatesCount) * 1000) / 10 : 0;

  const scoredCandidates = candidates
    .map((c) => c.matchScore ?? c.match)
    .filter((v) => v != null && v !== "" && Number.isFinite(Number(v)))
    .map(Number);
  const avgMatchScore = scoredCandidates.length > 0
    ? Math.round((scoredCandidates.reduce((sum, s) => sum + s, 0) / scoredCandidates.length) * 10) / 10
    : null;

  const totalViews = jobs.reduce((sum, j) => sum + Number(j.viewCount ?? j.views ?? 0), 0);
  const activeJobsCount = jobs.filter((j) => j.statusCode === "active" || j.status === "Đang tuyển").length;

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Phân tích chuyên sâu hiệu quả tuyển dụng (HR Analytics)</h5>
          <p className="text-muted small mb-0">Đo lường tỷ lệ chuyển đổi phễu, kênh nguồn ứng viên và hiệu quả tin tuyển dụng</p>
        </div>
        <Button variant="outline-success" size="sm" onClick={() => showToast("Báo cáo phân tích tuyển dụng (.PDF) đã được chuẩn bị và gửi về email.")}>
          <i className="bi bi-file-earmark-pdf me-1" />Xuất báo cáo tuyển dụng
        </Button>
      </div>

      {/* 2 Main Charts */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <h5 className="fw-bold mb-0">Phễu tuyển dụng chuyển đổi (Recruitment Funnel)</h5>
              <span className="badge bg-success bg-opacity-10 text-success p-2 small">
                {formatNumber(candidatesCount)} ứng viên
              </span>
            </div>
            <p className="text-muted small mb-4">Tỷ lệ giữ chân ứng viên qua 5 vòng đánh giá chuẩn hóa</p>
            <RecruitmentFunnelChart funnelData={employerData?.funnel} isLoading={isLoading} error={error} onRetry={onRetry} />
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-1">Kênh nguồn ứng viên (Source Distribution)</h5>
            <p className="text-muted small mb-4">Phân bổ tỷ trọng hồ sơ theo kênh tiếp cận</p>
            <SourceDistributionChart sourcesData={employerData?.sources} isLoading={isLoading} error={error} onRetry={onRetry} />
          </Card>
        </Col>
      </Row>

      {/* 4 Performance Indicators (computed from real employerData) */}
      <Row className="g-3">
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Điểm tương thích AI TB</div>
            <div className="fs-2 fw-bold text-success my-1">
              {avgMatchScore !== null ? formatPercent(avgMatchScore) : "Chưa có"}
            </div>
            <div className="small text-muted">
              <i className="bi bi-stars text-success me-1" />
              {scoredCandidates.length}/{formatNumber(candidatesCount)} hồ sơ đã chấm điểm
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Tỷ lệ qua vòng mới</div>
            <div className="fs-2 fw-bold text-primary my-1">{formatPercent(screeningPassed)}</div>
            <div className="small text-muted">
              <i className="bi bi-check2-circle text-primary me-1" />
              {formatNumber(progressedCount)} hồ sơ đang xử lý / phỏng vấn
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Tổng lượt xem tin</div>
            <div className="fs-2 fw-bold text-purple my-1">{formatNumber(totalViews)}</div>
            <div className="small text-muted">
              <i className="bi bi-briefcase text-success me-1" />
              Trên {formatNumber(activeJobsCount)}/{formatNumber(jobs.length)} tin đang mở
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Tỷ lệ đề nghị / tuyển</div>
            <div className="fs-2 fw-bold text-orange my-1">{formatPercent(offerRate)}</div>
            <div className="small text-muted">
              <i className="bi bi-calendar-check text-warning me-1" />
              {formatNumber(interviews.length)} lịch phỏng vấn đã ghi nhận
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
