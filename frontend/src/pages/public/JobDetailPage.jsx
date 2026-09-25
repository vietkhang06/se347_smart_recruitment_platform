import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { MATCHAJOB_DATA } from "../../services/data";
import { useFavorites } from "../../context/FavoritesContext";
import { useToast } from "../../context/ToastContext";
import { storage } from "../../services/storage";

export default function JobDetailPage() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const job = MATCHAJOB_DATA.jobs.find(j => j.id === parseInt(id)) || MATCHAJOB_DATA.jobs[0];
  const fav = isFavorite(job.id);

  // Apply Modal state
  const [showModal, setShowModal] = useState(false);
  const [candidateName, setCandidateName] = useState("Nguyễn An Khang");
  const [candidateEmail, setCandidateEmail] = useState("ankhang@example.com");
  const [candidatePhone, setCandidatePhone] = useState("0909 123 456");
  const [coverLetter, setCoverLetter] = useState("");

  const handleApply = (e) => {
    e.preventDefault();
    storage.addApplication({
      title: job.title,
      company: job.company,
      applicantName: candidateName,
      applicantEmail: candidateEmail
    });
    setShowModal(false);
    showToast(`Đã nộp hồ sơ ứng tuyển vị trí ${job.title} thành công!`);
  };

  return (
    <Container className="py-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item"><Link to="/" className="text-decoration-none">Trang chủ</Link></li>
          <li className="breadcrumb-item"><Link to="/jobs" className="text-decoration-none">Việc làm</Link></li>
          <li className="breadcrumb-item active text-truncate" style={{ maxWidth: "300px" }}>{job.title}</li>
        </ol>
      </nav>

      <Row className="g-4">
        {/* Main Content */}
        <Col lg={8}>
          <Card className="matcha-card p-4 mb-4 border-0 shadow-sm" data-aos="fade-up">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white fs-3 shadow-sm"
                style={{ width: "64px", height: "64px", backgroundColor: "var(--primary)" }}
              >
                {job.logo}
              </div>
              <div>
                <h1 className="h3 fw-bold mb-1">{job.title}</h1>
                <div className="text-muted fs-6">
                  <Link to={`/companies`} className="text-decoration-none text-muted fw-semibold">
                    {job.company}
                  </Link> · <span>{job.location}</span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 my-3 pb-3 border-bottom">
              <span className="badge-matcha fs-6">{job.salary}</span>
              <Badge bg="secondary" className="bg-opacity-10 text-body border p-2">{job.type}</Badge>
              <Badge bg="secondary" className="bg-opacity-10 text-body border p-2">{job.category}</Badge>
              <Badge bg="secondary" className="bg-opacity-10 text-body border p-2">Kinh nghiệm: {job.exp}</Badge>
              <Badge bg="success" className="bg-opacity-10 text-success border p-2">
                <i className="bi bi-stars me-1"></i>{job.match}% Phù hợp
              </Badge>
            </div>

            <div className="content-detail py-2">
              <h5 className="fw-bold mb-3">Mô tả công việc</h5>
              <p className="text-muted leading-relaxed">
                {job.desc} Chúng tôi đang tìm kiếm những chuyên gia có niềm đam mê mạnh mẽ với việc xây dựng sản phẩm xuất sắc, giải quyết bài toán phức tạp và mang lại giá trị cao nhất cho hàng triệu người sử dụng.
              </p>

              <h5 className="fw-bold mt-4 mb-3">Trách nhiệm chính</h5>
              <ul className="text-muted d-flex flex-column gap-2">
                <li>Tham gia định hướng giải pháp kỹ thuật và tối ưu trải nghiệm tương tác.</li>
                <li>Hợp tác chặt chẽ cùng Product Manager, Designer và đội ngũ phát triển sản phẩm.</li>
                <li>Đảm bảo chất lượng sản phẩm theo các tiêu chuẩn cao nhất về hiệu năng, bảo mật và khả năng mở rộng.</li>
                <li>Nghiên cứu và ứng dụng các công nghệ, công cụ mới nhằm nâng cao hiệu suất làm việc của nhóm.</li>
              </ul>

              <h5 className="fw-bold mt-4 mb-3">Yêu cầu chuyên môn</h5>
              <ul className="text-muted d-flex flex-column gap-2">
                <li>Kinh nghiệm làm việc từ {job.exp} trong lĩnh vực tương đương.</li>
                <li>Kỹ năng giao tiếp và làm việc nhóm tốt, tư duy phản biện và giải quyết vấn đề hiệu quả.</li>
                <li>Có tinh thần tự chủ, trách nhiệm cao trong công việc và tinh thần học hỏi công nghệ liên tục.</li>
              </ul>

              <h5 className="fw-bold mt-4 mb-3">Quyền lợi đãi ngộ</h5>
              <ul className="text-muted d-flex flex-column gap-2">
                <li>Mức thu nhập cạnh tranh từ <strong>{job.salary}</strong> + Thưởng hiệu suất cuối năm.</li>
                <li>Gói bảo hiểm sức khỏe cao cấp cho nhân viên và người thân.</li>
                <li>Môi trường làm việc mở, trang bị thiết bị hiện đại (MacBook Pro, màn hình 4K).</li>
                <li>Chế độ làm việc linh hoạt (Flexible hours, Hybrid working).</li>
              </ul>
            </div>
          </Card>
        </Col>

        {/* Aside Sidebar */}
        <Col lg={4}>
          <Card className="matcha-card p-4 border-0 shadow-sm sticky-top" style={{ top: "80px" }} data-aos="fade-left">
            <h5 className="fw-bold mb-3">Sẵn sàng gia nhập?</h5>
            <p className="text-muted small">
              Nhà tuyển dụng sẽ phản hồi hồ sơ của bạn trong vòng 24–48 giờ làm việc.
            </p>

            <div className="d-grid gap-2 mb-3">
              <Button variant="success" size="lg" className="fw-bold" onClick={() => setShowModal(true)}>
                <i className="bi bi-send-fill me-2"></i>Ứng tuyển ngay
              </Button>
              <Button 
                variant={fav ? "outline-danger" : "outline-secondary"} 
                onClick={() => toggleFavorite(job.id)}
                className="fw-medium"
              >
                <i className={`bi ${fav ? "bi-heart-fill text-danger" : "bi-heart"} me-2`}></i>
                {fav ? "Đã lưu việc làm" : "Lưu việc làm"}
              </Button>
            </div>

            <hr />

            <div className="d-flex flex-column gap-3 small">
              <div>
                <span className="text-muted d-block">Công ty tuyển dụng</span>
                <strong className="fs-6">{job.company}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Địa điểm làm việc</span>
                <strong>{job.location}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Hình thức</span>
                <strong>{job.type}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Ngày đăng tin</span>
                <strong>{job.posted}</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal nộp hồ sơ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">Ứng tuyển: {job.title}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleApply}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Họ và tên của bạn</Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={candidateName} 
                onChange={(e) => setCandidateName(e.target.value)} 
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <Form.Label className="small fw-semibold">Địa chỉ Email</Form.Label>
                <Form.Control 
                  type="email" 
                  required 
                  value={candidateEmail} 
                  onChange={(e) => setCandidateEmail(e.target.value)} 
                />
              </Col>
              <Col sm={6}>
                <Form.Label className="small fw-semibold">Số điện thoại</Form.Label>
                <Form.Control 
                  type="tel" 
                  required 
                  value={candidatePhone} 
                  onChange={(e) => setCandidatePhone(e.target.value)} 
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">CV đính kèm</Form.Label>
              <div className="border rounded p-3 text-center bg-surface-2">
                <i className="bi bi-file-earmark-pdf fs-2 text-danger"></i>
                <div className="small fw-bold mt-1">CV_NguyenAnKhang_2026.pdf</div>
                <div className="text-muted small">Đã tải từ hồ sơ cá nhân MatchaJob</div>
              </div>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Thư giới thiệu (Không bắt buộc)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Nêu ngắn gọn lý do bạn phù hợp với vị trí này..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button variant="success" type="submit">
              Xác nhận gửi hồ sơ
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
