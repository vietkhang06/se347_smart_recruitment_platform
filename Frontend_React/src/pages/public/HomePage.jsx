import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Card from "react-bootstrap/Card";
import { MATCHAJOB_DATA } from "../../services/data";
import JobCard from "../../components/jobs/JobCard";

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("location", location);
    navigate(`/jobs?${params.toString()}`);
  };

  const featuredJobs = MATCHAJOB_DATA.jobs.slice(0, 4);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section text-center position-relative overflow-hidden">
        <Container>
          <div data-aos="fade-down" className="mb-3">
            <span className="badge-matcha px-3 py-2 fs-6">
              <i className="bi bi-stars me-2"></i>Nền tảng tuyển dụng thông minh thế hệ mới
            </span>
          </div>

          <h1 className="display-4 fw-bold mb-3" data-aos="fade-up" data-aos-delay="100">
            Tìm công việc mơ ước, <br className="d-none d-md-block" />
            <span className="text-success">đúng năng lực và đam mê</span> của bạn
          </h1>

          <p className="lead text-muted mx-auto mb-4" style={{ maxWidth: "680px" }} data-aos="fade-up" data-aos-delay="200">
            MatchaJob kết nối hàng nghìn chuyên gia công nghệ, thiết kế và kinh doanh với những doanh nghiệp hàng đầu tại Việt Nam.
          </p>

          {/* Search Box */}
          <div className="mx-auto" style={{ maxWidth: "780px" }} data-aos="zoom-in" data-aos-delay="300">
            <Card className="matcha-card p-2 shadow-sm border-0">
              <Form onSubmit={handleSearch}>
                <Row className="g-2">
                  <Col md={6}>
                    <InputGroup>
                      <InputGroup.Text className="bg-transparent border-0 text-muted">
                        <i className="bi bi-search"></i>
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Vị trí tuyển dụng, kỹ năng, công ty..."
                        className="border-0 shadow-none"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                      />
                    </InputGroup>
                  </Col>
                  <Col md={4} className="border-start-md">
                    <InputGroup>
                      <InputGroup.Text className="bg-transparent border-0 text-muted">
                        <i className="bi bi-geo-alt"></i>
                      </InputGroup.Text>
                      <Form.Select 
                        className="border-0 shadow-none"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      >
                        <option value="">Tất cả địa điểm</option>
                        <option value="TP.HCM">TP. Hồ Chí Minh</option>
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                      </Form.Select>
                    </InputGroup>
                  </Col>
                  <Col md={2}>
                    <Button type="submit" variant="success" className="w-100 h-100 fw-medium">
                      Tìm việc
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card>

            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2 mt-3 small text-muted">
              <span>Gợi ý phổ biến:</span>
              <Link to="/jobs?q=Frontend" className="badge bg-secondary bg-opacity-10 text-decoration-none text-body">Frontend</Link>
              <Link to="/jobs?q=Product Designer" className="badge bg-secondary bg-opacity-10 text-decoration-none text-body">Product Designer</Link>
              <Link to="/jobs?q=Data Analyst" className="badge bg-secondary bg-opacity-10 text-decoration-none text-body">Data Analyst</Link>
              <Link to="/jobs?q=React" className="badge bg-secondary bg-opacity-10 text-decoration-none text-body">React</Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats Strip */}
      <section className="py-4 border-top border-bottom bg-surface-2">
        <Container>
          <Row className="text-center g-3">
            <Col sm={6} md={3} data-aos="fade-up" data-aos-delay="100">
              <div className="fw-bold fs-3 text-success">1,200+</div>
              <div className="text-muted small">Cơ hội việc làm đang tuyển</div>
            </Col>
            <Col sm={6} md={3} data-aos="fade-up" data-aos-delay="200">
              <div className="fw-bold fs-3 text-primary">320+</div>
              <div className="text-muted small">Doanh nghiệp hàng đầu</div>
            </Col>
            <Col sm={6} md={3} data-aos="fade-up" data-aos-delay="300">
              <div className="fw-bold fs-3 text-purple">18,000+</div>
              <div className="text-muted small">Ứng viên tài năng</div>
            </Col>
            <Col sm={6} md={3} data-aos="fade-up" data-aos-delay="400">
              <div className="fw-bold fs-3 text-orange">94%</div>
              <div className="text-muted small">Tỷ lệ phản hồi nhanh chóng</div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-5">
        <Container>
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h2 className="fw-bold mb-1" data-aos="fade-right">Cơ hội việc làm nổi bật</h2>
              <p className="text-muted mb-0" data-aos="fade-right" data-aos-delay="100">
                Các vị trí được săn đón nhất trong tuần với chế độ hấp dẫn
              </p>
            </div>
            <Button as={Link} to="/jobs" variant="outline-success" data-aos="fade-left">
              Xem tất cả ({MATCHAJOB_DATA.jobs.length}) <i className="bi bi-arrow-right ms-1"></i>
            </Button>
          </div>

          <Row className="g-4">
            {featuredJobs.map((job, index) => (
              <Col md={6} key={job.id}>
                <JobCard job={job} aosDelay={index * 100} />
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Call to Action for Employer & Candidate */}
      <section className="py-5 bg-surface-2">
        <Container>
          <Row className="g-4">
            <Col md={6} data-aos="fade-right">
              <Card className="matcha-card p-4 h-100 border-0 shadow-sm">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="p-3 rounded-circle bg-success bg-opacity-10 text-success fs-3">
                    <i className="bi bi-person-workspace"></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">Dành cho Ứng viên</h4>
                    <div className="text-muted small">Tối ưu hóa hồ sơ & kết nối cơ hội</div>
                  </div>
                </div>
                <p className="text-muted">
                  Trải nghiệm công cụ chấm điểm CV trực quan, quản lý đơn ứng tuyển thông minh và nhận gợi ý việc làm chuẩn xác.
                </p>
                <div className="mt-auto">
                  <Button as={Link} to="/candidate/profile" variant="success">
                    Quản lý hồ sơ ngay
                  </Button>
                </div>
              </Card>
            </Col>

            <Col md={6} data-aos="fade-left">
              <Card className="matcha-card p-4 h-100 border-0 shadow-sm">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary fs-3">
                    <i className="bi bi-buildings"></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">Dành cho Nhà tuyển dụng</h4>
                    <div className="text-muted small">Phân tích tuyển dụng chuyên sâu bằng Chart.js</div>
                  </div>
                </div>
                <p className="text-muted">
                  Bảng điều khiển HR trực quan, theo dõi phễu ứng viên, quản lý tin đăng và đo lường hiệu suất chuyển đổi tức thì.
                </p>
                <div className="mt-auto">
                  <Button as={Link} to="/employer" variant="outline-primary">
                    Vào không gian HR
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}
