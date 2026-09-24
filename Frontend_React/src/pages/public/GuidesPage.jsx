import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { MATCHAJOB_DATA } from "../../services/data";

export default function GuidesPage() {
  return (
    <Container className="py-5">
      <div className="text-center mb-5" data-aos="fade-down">
        <h1 className="fw-bold mb-2">Cẩm nang & Bí quyết phát triển sự nghiệp</h1>
        <p className="text-muted mx-auto" style={{ maxWidth: "620px" }}>
          Trang bị kiến thức phỏng vấn, kỹ năng xây dựng hồ sơ và kinh nghiệm thực chiến từ các chuyên gia tuyển dụng.
        </p>
      </div>

      <Row className="g-4">
        {MATCHAJOB_DATA.guides.map((guide, idx) => (
          <Col md={6} key={guide.id}>
            <Card 
              className="matcha-card p-4 h-100 border-0 shadow-sm"
              data-aos="fade-up"
              data-aos-delay={idx * 120}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Badge bg="success" className="bg-opacity-10 text-success border">
                  {guide.category}
                </Badge>
                <span className="text-muted small">
                  <i className="bi bi-clock me-1"></i>{guide.readTime}
                </span>
              </div>

              <h4 className="fw-bold fs-5 my-2">
                <a href="#read" onClick={(e) => e.preventDefault()} className="text-decoration-none text-body">
                  {guide.title}
                </a>
              </h4>

              <p className="text-muted small my-2 flex-grow-1">
                {guide.desc}
              </p>

              <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto small text-muted">
                <span>{guide.date}</span>
                <span className="text-success fw-medium cursor-pointer">
                  Đọc tiếp <i className="bi bi-arrow-right"></i>
                </span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
