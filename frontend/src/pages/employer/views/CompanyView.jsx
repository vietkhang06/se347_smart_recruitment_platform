import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import { useToast } from "../../../context/ToastContext";

export default function CompanyView({ companyData }) {
  const { showToast } = useToast();

  const [name, setName] = useState(companyData?.name || "FPT Digital Talent");
  const [industry, setIndustry] = useState(companyData?.industry || "Công nghệ & Sản phẩm số");
  const [size, setSize] = useState(companyData?.size || "500+ nhân sự");
  const [location, setLocation] = useState(companyData?.location || "TP. Hồ Chí Minh");
  const [website, setWebsite] = useState(companyData?.website || "fptsoftware.com");
  const [about, setAbout] = useState(
    "Đội ngũ công nghệ phát triển các sản phẩm số có tác động tích cực đến hàng triệu người dùng. Môi trường làm việc năng động, tôn trọng sáng tạo và khuyến khích học hỏi liên tục."
  );

  const perks = [
    "Hybrid linh hoạt",
    "Bảo hiểm sức khỏe FPT Care",
    "Ngân sách học tập định kỳ",
    "Thưởng hiệu suất & Lương tháng 13",
    "Teambuilding & Du lịch hàng năm"
  ];

  const handleSave = (e) => {
    e.preventDefault();
    showToast("Đã lưu thông tin hồ sơ doanh nghiệp thành công!");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Hồ sơ Doanh nghiệp (Employer Branding)</h5>
          <p className="text-muted small mb-0">Xây dựng hình ảnh tuyển dụng uy tín và thu hút nhân tài hàng đầu</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSave}>
          <i className="bi bi-check2 me-1"></i>Lưu thay đổi
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: Edit Form */}
        <Col lg={7}>
          <Card className="matcha-card border-0 shadow-sm overflow-hidden mb-4">
            {/* Banner Cover with Avatar */}
            <div className="company-banner d-flex align-items-end justify-content-end p-3">
              <Button
                variant="light"
                size="sm"
                className="shadow-sm"
                onClick={() => showToast("Đã cập nhật ảnh bìa doanh nghiệp demo")}
              >
                <i className="bi bi-camera me-1"></i>Đổi ảnh bìa
              </Button>
              <div className="company-avatar-overlap">
                {name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="p-4" style={{ paddingTop: "48px" }}>
              <Form onSubmit={handleSave}>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Label className="small fw-semibold">Tên doanh nghiệp</Form.Label>
                    <Form.Control
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Lĩnh vực hoạt động</Form.Label>
                    <Form.Control
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Quy mô nhân sự</Form.Label>
                    <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                      <option value="Dưới 50 nhân sự">Dưới 50 nhân sự</option>
                      <option value="50 - 150 nhân sự">50 - 150 nhân sự</option>
                      <option value="150 - 500 nhân sự">150 - 500 nhân sự</option>
                      <option value="500+ nhân sự">500+ nhân sự</option>
                      <option value="1000+ nhân sự">1000+ nhân sự</option>
                    </Form.Select>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Trụ sở chính</Form.Label>
                    <Form.Control
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Website doanh nghiệp</Form.Label>
                    <Form.Control
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </Col>

                  <Col md={12}>
                    <Form.Label className="small fw-semibold">Giới thiệu tổng quan về văn hóa & sản phẩm</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </Col>
                </Row>
              </Form>
            </div>
          </Card>
        </Col>

        {/* Right: Live Public Card Preview */}
        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small fw-bold">XEM TRƯỚC HỒ SƠ CÔNG KHAI</span>
              <Badge bg="success" className="bg-opacity-10 text-success border">
                <i className="bi bi-patch-check-fill me-1"></i>Đã xác minh
              </Badge>
            </div>

            <div className="text-center py-3 border-bottom mb-3">
              <div
                className="rounded-3 d-inline-flex align-items-center justify-content-center fw-bold text-white shadow-sm mb-2"
                style={{ width: "64px", height: "64px", backgroundColor: "var(--primary)", fontSize: "24px" }}
              >
                {name.slice(0, 2).toUpperCase()}
              </div>
              <h5 className="fw-bold mb-1">{name}</h5>
              <div className="text-muted small">{industry} · {size}</div>
              <div className="text-muted small mt-1">
                <i className="bi bi-geo-alt me-1 text-danger"></i>{location} · <i className="bi bi-globe me-1 text-primary"></i>{website}
              </div>
            </div>

            <h6 className="fw-bold text-success mb-2">Giới thiệu chung</h6>
            <p className="small text-muted mb-4" style={{ lineHeight: "1.6" }}>
              {about}
            </p>

            <h6 className="fw-bold text-success mb-2">Chính sách đãi ngộ nổi bật</h6>
            <div className="d-flex flex-wrap gap-2 mb-4">
              {perks.map((p) => (
                <span key={p} className="badge bg-success bg-opacity-10 text-success p-2 small">
                  <i className="bi bi-check2 me-1"></i>{p}
                </span>
              ))}
            </div>

            <div className="mt-auto p-3 rounded bg-surface-2 border text-center small text-muted">
              <i className="bi bi-eye text-primary me-1"></i>
              Hồ sơ này sẽ hiển thị trực tiếp cho mọi ứng viên khi bấm vào trang chi tiết việc làm.
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
