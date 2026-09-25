import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";

export default function CandidateDetailModal({ candidate, show, onHide, onInviteInterview }) {
  const { showToast } = useToast();

  if (!candidate) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
            style={{ width: "50px", height: "50px", backgroundColor: "var(--primary)", fontSize: "1.2rem" }}
          >
            {candidate.initials}
          </div>
          <div>
            <Modal.Title className="fw-bold fs-5 mb-0">{candidate.name}</Modal.Title>
            <span className="text-muted small">{candidate.role} · {candidate.experience} kinh nghiệm</span>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center p-3 rounded mb-3 bg-surface-2 border">
          <div>
            <div className="small text-muted mb-1">Mức độ tương thích AI:</div>
            <span className="fs-5 fw-bold text-success">
              <i className="bi bi-stars me-1"></i>{candidate.match}% Phù hợp với JD
            </span>
          </div>
          <Badge bg="success" className="p-2">
            Giai đoạn: {candidate.stage || "Đang xem xét"}
          </Badge>
        </div>

        <Row className="g-3 mb-4">
          <Col sm={6}>
            <div className="small text-muted">Địa điểm sinh sống:</div>
            <div className="fw-semibold"><i className="bi bi-geo-alt text-danger me-1"></i>{candidate.location}</div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Trình độ học vấn:</div>
            <div className="fw-semibold"><i className="bi bi-mortarboard text-primary me-1"></i>Cử nhân ĐH Bách Khoa TP.HCM</div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Email liên hệ:</div>
            <div className="fw-semibold"><i className="bi bi-envelope text-muted me-1"></i>{candidate.name.toLowerCase().replace(/\s+/g, '')}@gmail.com</div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Số điện thoại:</div>
            <div className="fw-semibold"><i className="bi bi-telephone text-muted me-1"></i>098 *** 4567</div>
          </Col>
        </Row>

        <h6 className="fw-bold text-success mb-2">Kỹ năng chuyên môn</h6>
        <div className="d-flex flex-wrap gap-2 mb-4">
          {candidate.skills?.map((s) => (
            <Badge key={s} bg="secondary" className="bg-opacity-10 text-body p-2 fs-6">
              {s}
            </Badge>
          ))}
          <Badge bg="secondary" className="bg-opacity-10 text-body p-2 fs-6">Giao tiếp tốt</Badge>
          <Badge bg="secondary" className="bg-opacity-10 text-body p-2 fs-6">Làm việc nhóm</Badge>
        </div>

        <h6 className="fw-bold text-success mb-2">Tóm tắt quá trình làm việc</h6>
        <div className="p-3 rounded border bg-surface small mb-3">
          <div className="fw-bold mb-1">2023 - Nay: Senior Role tại Tech Corp</div>
          <p className="text-muted mb-2">Chịu trách nhiệm thiết kế kiến trúc, tối ưu hóa giao diện và phối hợp cùng đội ngũ Product để phát hành tính năng định kỳ.</p>

          <div className="fw-bold mb-1">2021 - 2023: Chuyên viên tại Global Agency</div>
          <p className="text-muted mb-0">Tham gia hơn 10 dự án lớn nhỏ, làm việc trực tiếp với khách hàng quốc tế, đảm bảo tiến độ và chất lượng sản phẩm bàn giao.</p>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={() => showToast("Đã tải xuống CV ứng viên (.PDF)")}>
          <i className="bi bi-download me-1"></i>Tải CV (.PDF)
        </Button>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide}>Đóng</Button>
          <Button
            variant="success"
            onClick={() => {
              onHide();
              if (onInviteInterview) onInviteInterview(candidate);
              else showToast(`Đã gửi lời mời phỏng vấn tới ${candidate.name}`);
            }}
          >
            <i className="bi bi-calendar-plus me-1"></i>Mời phỏng vấn
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
