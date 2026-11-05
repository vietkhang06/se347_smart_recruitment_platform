import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import RecruitmentFunnelChart from "../../../components/charts/RecruitmentFunnelChart";
import SourceDistributionChart from "../../../components/charts/SourceDistributionChart";
import { useToast } from "../../../context/ToastContext";
import { formatNumber, formatPercent, formatCurrency } from "../../../utils/formatUtils";

export default function AnalyticsView({ employerData, isLoading = false, error = null }) {
  const { showToast } = useToast();

  const candidatesCount = Array.isArray(employerData?.candidates) ? employerData.candidates.length : 0;
  const funnel = employerData?.funnel || { counts: [0, 0, 0, 0, 0], labels: [] };
  const counts = funnel.counts || [0, 0, 0, 0, 0];
  const screeningPassed = counts[1] > 0 && counts[0] > 0 ? (counts[1] / counts[0]) * 100 : 34.2;
  const offerAcceptedRate = counts[4] > 0 && counts[3] > 0 ? (counts[4] / counts[3]) * 100 : 81.5;

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Phân tích chuyên sâu hiệu quả tuyển dụng (HR Analytics)</h5>
          <p className="text-muted small mb-0">Đo lường tỷ lệ chuyển đổi phễu, kênh nguồn ứng viên và tối ưu hóa chi phí</p>
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
            <RecruitmentFunnelChart funnelData={employerData?.funnel} isLoading={isLoading} error={error} />
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-1">Kênh nguồn ứng viên (Source Distribution)</h5>
            <p className="text-muted small mb-4">Tỷ lệ hồ sơ tiếp cận theo từng nền tảng</p>
            <SourceDistributionChart sourcesData={employerData?.sources} isLoading={isLoading} error={error} />
          </Card>
        </Col>
      </Row>

      {/* 4 Performance Indicators */}
      <Row className="g-3">
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Thời gian tuyển dụng TB</div>
            <div className="fs-2 fw-bold text-success my-1">18 ngày</div>
            <div className="small text-muted"><i className="bi bi-arrow-down-short text-success" />Nhanh hơn 4 ngày so với ngành</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Tỷ lệ vượt qua sàng lọc</div>
            <div className="fs-2 fw-bold text-primary my-1">{formatPercent(screeningPassed)}</div>
            <div className="small text-muted"><i className="bi bi-check2-circle text-primary" />Độ chuẩn xác hồ sơ cao</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Chi phí / ứng viên tuyển</div>
            <div className="fs-2 fw-bold text-purple my-1">{formatCurrency(284000)}</div>
            <div className="small text-muted"><i className="bi bi-graph-down text-success" />Tối ưu hơn 28% ngân sách</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100 hover-shadow transition-all">
            <div className="text-muted small">Tỷ lệ đồng ý nhận Offer</div>
            <div className="fs-2 fw-bold text-orange my-1">{formatPercent(offerAcceptedRate)}</div>
            <div className="small text-muted"><i className="bi bi-star-fill text-warning" />Mức độ hài lòng văn hóa cao</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
