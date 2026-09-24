import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function Footer() {
  return (
    <footer className="border-top py-5 mt-auto" style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
      <Container>
        <Row className="g-4">
          <Col lg={4} md={6}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <img src="/assets/logo.svg" alt="MatchaJob Logo" width="30" height="30" />
              <span className="fw-bold fs-5 text-success">MatchaJob</span>
            </div>
            <p className="text-muted small">
              Nền tảng tuyển dụng thông minh hàng đầu dành cho nhân lực số tại Việt Nam. Kết nối ứng viên tài năng với các doanh nghiệp công nghệ tiêu biểu.
            </p>
            <div className="d-flex gap-3 text-muted">
              <a href="#" className="text-decoration-none text-muted"><i className="bi bi-facebook fs-5"></i></a>
              <a href="#" className="text-decoration-none text-muted"><i className="bi bi-linkedin fs-5"></i></a>
              <a href="#" className="text-decoration-none text-muted"><i className="bi bi-github fs-5"></i></a>
            </div>
          </Col>

          <Col lg={2} sm={6} xs={6}>
            <h6 className="fw-bold mb-3">Ứng viên</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-muted">
              <li><Link to="/jobs" className="text-decoration-none text-muted">Tìm việc làm</Link></li>
              <li><Link to="/companies" className="text-decoration-none text-muted">Danh bạ công ty</Link></li>
              <li><Link to="/guides" className="text-decoration-none text-muted">Cẩm nang nghề nghiệp</Link></li>
              <li><Link to="/candidate/profile" className="text-decoration-none text-muted">Đánh giá CV</Link></li>
            </ul>
          </Col>

          <Col lg={2} sm={6} xs={6}>
            <h6 className="fw-bold mb-3">Doanh nghiệp</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-muted">
              <li><Link to="/employer" className="text-decoration-none text-muted">Cổng Nhà tuyển dụng</Link></li>
              <li><Link to="/employer" className="text-decoration-none text-muted">Đăng tin tuyển dụng</Link></li>
              <li><Link to="/employer" className="text-decoration-none text-muted">Báo cáo & Phân tích HR</Link></li>
              <li><Link to="/employer" className="text-decoration-none text-muted">Gói dịch vụ</Link></li>
            </ul>
          </Col>

          <Col lg={4} md={6}>
            <h6 className="fw-bold mb-3">Đăng ký nhận tin tuyển dụng</h6>
            <p className="text-muted small">Nhận thông báo việc làm mới nhất phù hợp với kỹ năng của bạn mỗi tuần.</p>
            <div className="input-group mb-3">
              <input type="email" className="form-control" placeholder="Nhập email của bạn..." />
              <button className="btn btn-success" type="button">Đăng ký</button>
            </div>
            <div className="small text-muted">© 2026 MatchaJob Inc. Bảo lưu mọi quyền.</div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}
