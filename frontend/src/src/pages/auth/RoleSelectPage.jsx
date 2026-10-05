import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

export default function RoleSelectPage() {
  const roles = [
    {
      key: "candidate",
      title: "Ứng viên tìm việc",
      desc: "Tìm kiếm công việc lý tưởng, nộp hồ sơ trực tuyến, kiểm tra chất lượng CV và theo dõi tiến trình tuyển dụng.",
      icon: "bi-person-badge",
      color: "var(--primary)",
      target: "/login?role=candidate"
    },
    {
      key: "employer",
      title: "Nhà tuyển dụng (HR)",
      desc: "Đăng tin tuyển dụng, tiếp cận hàng nghìn hồ sơ tài năng, phân tích hiệu suất và quản lý phỏng vấn.",
      icon: "bi-buildings",
      color: "#2563eb",
      target: "/login?role=employer"
    },
    {
      key: "admin",
      title: "Quản trị viên hệ thống",
      desc: "Giám sát vận hành toàn hệ thống, kiểm duyệt nội dung tin đăng, quản lý người dùng và xử lý báo cáo.",
      icon: "bi-shield-check",
      color: "#7c3aed",
      target: "/login?role=admin"
    }
  ];

  return (
    <Container className="py-5 my-auto">
      <div className="text-center mb-5" data-aos="fade-down">
        <span className="badge-matcha px-3 py-1 mb-2">Đăng ký & Tham gia MatchaJob</span>
        <h1 className="fw-bold">Bạn tham gia hệ thống với vai trò nào?</h1>
        <p className="text-muted">Chọn vai trò phù hợp để chúng tôi cá nhân hóa trải nghiệm tốt nhất cho bạn</p>
      </div>

      <Row className="g-4 justify-content-center">
        {roles.map((r, idx) => (
          <Col lg={4} md={6} key={r.key}>
            <Card 
              className="matcha-card p-4 h-100 border-0 shadow-sm text-center d-flex flex-column align-items-center"
              data-aos="fade-up"
              data-aos-delay={idx * 120}
            >
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center mb-3 text-white shadow-sm"
                style={{ width: "70px", height: "70px", backgroundColor: r.color, fontSize: "2rem" }}
              >
                <i className={`bi ${r.icon}`}></i>
              </div>

              <h4 className="fw-bold mb-2">{r.title}</h4>
              <p className="text-muted small mb-4 flex-grow-1">
                {r.desc}
              </p>

              <Button 
                as={Link} 
                to={r.target} 
                variant="outline-success" 
                className="w-100 fw-bold"
              >
                Bắt đầu ngay <i className="bi bi-arrow-right ms-1"></i>
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
