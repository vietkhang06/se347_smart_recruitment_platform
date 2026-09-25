import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { MATCHAJOB_DATA } from "../../services/data";

export default function CompaniesPage() {
  return (
    <Container className="py-5">
      <div className="text-center mb-5" data-aos="fade-down">
        <h1 className="fw-bold mb-2">Doanh nghiệp công nghệ tiêu biểu</h1>
        <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
          Khám phá môi trường làm việc lý tưởng tại các công ty công nghệ, kỳ lân công nghệ và tập đoàn số hàng đầu Việt Nam.
        </p>
      </div>

      <Row className="g-4">
        {MATCHAJOB_DATA.companies.map((company, idx) => (
          <Col lg={4} md={6} key={company.name}>
            <Card 
              className="matcha-card p-4 h-100 border-0 shadow-sm"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="d-flex align-items-center gap-3 mb-3">
                <div 
                  className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white fs-4 shadow-sm"
                  style={{ width: "56px", height: "56px", backgroundColor: "var(--primary)" }}
                >
                  {company.logo}
                </div>
                <div>
                  <h5 className="fw-bold mb-1">{company.name}</h5>
                  <span className="badge bg-secondary bg-opacity-10 text-body small">
                    {company.industry}
                  </span>
                </div>
              </div>

              <p className="text-muted small my-3 flex-grow-1">
                {company.desc}
              </p>

              <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                <span className="text-success fw-bold small">
                  <i className="bi bi-briefcase me-1"></i>{company.jobs} vị trí đang tuyển
                </span>
                <Button 
                  as={Link} 
                  to={`/jobs?q=${company.name}`} 
                  variant="outline-success" 
                  size="sm"
                  className="fw-medium"
                >
                  Xem việc làm
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
