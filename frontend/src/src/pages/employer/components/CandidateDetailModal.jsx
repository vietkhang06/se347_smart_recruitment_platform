import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useState } from "react";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";

export default function CandidateDetailModal({
  candidate,
  show,
  onHide,
  onInviteInterview,
  onStageChange,
  onRejectCandidate
}) {
  const { showToast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("Hồ sơ chưa phù hợp với yêu cầu kinh nghiệm hiện tại của dự án.");

  if (!candidate) return null;

  const handleStageSelect = (e) => {
    const nextStage = e.target.value;
    if (onStageChange) {
      onStageChange(candidate.id, nextStage);
      showToast(`Đã chuyển ứng viên ${candidate.name} sang bước: ${nextStage}`);
    }
  };

  const handleConfirmReject = () => {
    if (onRejectCandidate) {
      onRejectCandidate(candidate.id, rejectReason);
      showToast(`Đã từ chối ứng viên ${candidate.name}`);
      setRejecting(false);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
            style={{ width: "52px", height: "52px", backgroundColor: "var(--primary)", fontSize: "1.2rem" }}
          >
            {candidate.initials}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <Modal.Title className="fw-bold fs-5 mb-0">{candidate.name}</Modal.Title>
              {candidate.userId && <code className="small">{candidate.userId}</code>}
            </div>
            <span className="text-muted small">
              {candidate.role} · {candidate.experience} kinh nghiệm
            </span>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Top Status & AI Match Strip */}
        <div className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded mb-3 bg-surface-2 border gap-2">
          <div>
            <div className="small text-muted mb-1">Mức độ tương thích AI (Job Matching):</div>
            <span className="fs-5 fw-bold text-success">
              <i className="bi bi-stars me-1"></i>{candidate.match || 90}% Phù hợp với JD
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-semibold">Giai đoạn:</span>
            <Form.Select
              size="sm"
              style={{ width: 140 }}
              value={candidate.stage || "Mới"}
              onChange={handleStageSelect}
            >
              {STAGES_PIPELINE.map((stg) => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
              <option value="Đã từ chối">Đã từ chối</option>
            </Form.Select>
          </div>
        </div>

        {/* Applied Position Info */}
        {candidate.appliedJobTitle && (
          <div className="p-2 px-3 rounded bg-success bg-opacity-10 text-success border border-success border-opacity-25 small mb-3 d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-briefcase me-1"></i>Vị trí ứng tuyển: <strong>{candidate.appliedJobTitle}</strong>
            </span>
            <span className="text-muted">Ngày nộp: {candidate.appliedDate || "14/09/2026"}</span>
          </div>
        )}

        {/* Bio summary */}
        {candidate.bio && (
          <div className="p-3 rounded bg-surface border mb-3 small">
            <strong className="text-body d-block mb-1">Giới thiệu bản thân:</strong>
            <p className="text-muted mb-0">{candidate.bio}</p>
          </div>
        )}

        {/* 4 Info Blocks */}
        <Row className="g-3 mb-4">
          <Col sm={6}>
            <div className="small text-muted">Địa điểm sinh sống:</div>
            <div className="fw-semibold">
              <i className="bi bi-geo-alt text-danger me-1"></i>{candidate.location || "TP. Hồ Chí Minh"}
            </div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Trình độ học vấn:</div>
            <div className="fw-semibold">
              <i className="bi bi-mortarboard text-primary me-1"></i>
              {candidate.education || "Cử nhân ĐH Bách Khoa TP.HCM"}
            </div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Email liên hệ:</div>
            <div className="fw-semibold">
              <i className="bi bi-envelope text-muted me-1"></i>
              {candidate.email || `${candidate.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`}
            </div>
          </Col>
          <Col sm={6}>
            <div className="small text-muted">Số điện thoại:</div>
            <div className="fw-semibold">
              <i className="bi bi-telephone text-muted me-1"></i>
              {candidate.phone || "0909 123 456"}
            </div>
          </Col>
        </Row>

        {/* Skills */}
        <h6 className="fw-bold text-success mb-2">Kỹ năng chuyên môn</h6>
        <div className="d-flex flex-wrap gap-2 mb-4">
          {candidate.skills?.map((s) => (
            <Badge key={s} bg="secondary" className="bg-opacity-10 text-body p-2 fs-6">
              {s}
            </Badge>
          ))}
        </div>

        {/* Work Experience */}
        <h6 className="fw-bold text-success mb-2">Lịch sử làm việc & Dự án thực chiến</h6>
        <div className="d-flex flex-column gap-2 mb-3">
          {candidate.workHistory && candidate.workHistory.length > 0 ? (
            candidate.workHistory.map((w, idx) => (
              <div className="p-3 rounded border bg-surface small" key={idx}>
                <div className="fw-bold mb-1 text-primary">{w.period}: {w.role}</div>
                <p className="text-muted mb-0">{w.desc}</p>
              </div>
            ))
          ) : (
            <div className="p-3 rounded border bg-surface small">
              <div className="fw-bold mb-1">2023 - Nay: Senior Role tại Tech Corp</div>
              <p className="text-muted mb-0">Chịu trách nhiệm thiết kế kiến trúc, tối ưu hóa giao diện và phát hành tính năng định kỳ.</p>
            </div>
          )}
        </div>

        {/* Reject Confirmation Box */}
        {rejecting && (
          <div className="p-3 rounded border border-danger bg-danger bg-opacity-10 mt-3 animate-fade-in">
            <h6 className="fw-bold text-danger mb-2">Xác nhận từ chối hồ sơ ứng viên</h6>
            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Lý do từ chối (gửi thông báo lịch sự tới ứng viên):</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="secondary" size="sm" onClick={() => setRejecting(false)}>
                Hủy bỏ
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmReject}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => showToast("Đã tải xuống CV ứng viên (.PDF)")}
        >
          <i className="bi bi-download me-1"></i>Tải CV (.PDF)
        </Button>

        <div className="d-flex gap-2">
          {!rejecting && candidate.stage !== "Đã từ chối" && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setRejecting(true)}
            >
              <i className="bi bi-x-circle me-1"></i>Từ chối
            </Button>
          )}

          <Button
            variant="success"
            size="sm"
            onClick={() => {
              onHide();
              if (onInviteInterview) onInviteInterview(candidate);
              else showToast(`Đã mở lịch phỏng vấn cho ${candidate.name}`);
            }}
          >
            <i className="bi bi-calendar-plus me-1"></i>Mời phỏng vấn
          </Button>

          <Button variant="secondary" size="sm" onClick={onHide}>
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
