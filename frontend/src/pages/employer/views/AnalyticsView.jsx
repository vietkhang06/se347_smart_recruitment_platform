import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import RecruitmentFunnelChart from "../../../components/charts/RecruitmentFunnelChart";
import SourceDistributionChart from "../../../components/charts/SourceDistributionChart";
import { useToast } from "../../../context/ToastContext";

export default function AnalyticsView({ employerData }) {
  const { showToast } = useToast();

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Phân tích chuyên sâu hiệu quả tuyển dụng (HR Analytics)</h5>
          <p className="text-muted small mb-0">Đo lường tỷ lệ chuyển đổi phễu, kênh nguồn ứng viên và tối ưu hóa chi phí</p>
        </div>
        <Button variant="outline-success" size="sm" onClick={() => showToast("Báo cáo phân tích tuyển dụng (.PDF) đã được gửi về email")}>
          <i className="bi bi-file-earmark-pdf me-1"></i>Xuất báo cáo tuyển dụng
        </Button>
      </div>

      {/* 2 Main Charts */}
      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-1">Phễu tuyển dụng chuyển đổi (Recruitment Funnel)</h5>
            <p className="text-muted small mb-4">Tỷ lệ giữ chân ứng viên qua 5 vòng đánh giá chuẩn hóa</p>
            <RecruitmentFunnelChart funnelData={employerData.funnel} />
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-1">Kênh nguồn ứng viên (Source Distribution)</h5>
            <p className="text-muted small mb-4">Tỷ lệ hồ sơ tiếp cận theo từng nền tảng</p>
            <SourceDistributionChart sourcesData={employerData.sources} />
          </Card>
        </Col>
      </Row>

      {/* 4 Performance Indicators */}
      <Row className="g-3">
        <Col md={3} sm={6}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100">
            <div className="text-muted small">Thời gian tuyển dụng TB</div>
            <div className="fs-2 fw-bold text-success my-1">18 ngày</div>
            <div className="small text-muted"><i className="bi bi-arrow-down-short text-success"></i>Nhanh hơn 4 ngày so với ngành</div>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100">
            <div className="text-muted small">Tỷ lệ vượt qua sàng lọc</div>
            <div className="fs-2 fw-bold text-primary my-1">34.2%</div>
            <div className="small text-muted"><i className="bi bi-check2-circle text-primary"></i>Độ chuẩn xác hồ sơ cao</div>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100">
            <div className="text-muted small">Chi phí / ứng viên tuyển</div>
            <div className="fs-2 fw-bold text-purple my-1">284.000đ</div>
            <div className="small text-muted"><i className="bi bi-graph-down text-success"></i>Tối ưu hơn 28% ngân sách</div>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="matcha-card p-3 border-0 shadow-sm text-center h-100">
            <div className="text-muted small">Tỷ lệ đồng ý nhận Offer</div>
            <div className="fs-2 fw-bold text-orange my-1">81.5%</div>
            <div className="small text-muted"><i className="bi bi-star-fill text-warning"></i>Mức độ hài lòng văn hóa cao</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
