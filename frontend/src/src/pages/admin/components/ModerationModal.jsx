import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";

export default function ModerationModal({ show, onHide, review, action, onConfirm }) {
  const [note, setNote] = useState("");

  if (!review) return null;

  const isApprove = action === "approve";

  const handleConfirm = () => {
    onConfirm(review.id, isApprove ? "Đã duyệt" : "Đã từ chối", note);
    setNote("");
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          {isApprove ? (
            <span className="text-success"><i className="bi bi-check-circle me-2"></i>Phê duyệt nội dung</span>
          ) : (
            <span className="text-danger"><i className="bi bi-x-circle me-2"></i>Từ chối nội dung</span>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="p-3 rounded mb-3 bg-surface-2 border">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <code>{review.id}</code>
            <Badge bg={review.risk === "Cao" ? "danger" : "success"}>
              Rủi ro: {review.risk}
            </Badge>
          </div>
          <h6 className="fw-bold mb-1">{review.title}</h6>
          <div className="small text-muted">Đơn vị gửi: {review.company}</div>
        </div>

        <p className="small text-muted mb-3">
          {isApprove
            ? "Nội dung sau khi phê duyệt sẽ được xuất bản công khai lên hệ thống MatchaJob ngay lập tức."
            : "Nội dung sẽ bị gỡ bỏ hoặc chuyển về bản nháp. Vui lòng nêu rõ lý do để nhà tuyển dụng chỉnh sửa."}
        </p>

        <Form.Group>
          <Form.Label className="small fw-semibold">
            Ghi chú gửi đơn vị tuyển dụng {isApprove ? "(Tùy chọn)" : "(Bắt buộc)"}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={
              isApprove
                ? "VD: Nội dung đầy đủ và minh bạch, đã đối soát pháp lý doanh nghiệp."
                : "VD: Cần bổ sung rõ ràng khoảng lương và mô tả cụ thể quyền lợi bảo hiểm."
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Hủy</Button>
        <Button
          variant={isApprove ? "success" : "danger"}
          className="fw-bold"
          onClick={handleConfirm}
        >
          {isApprove ? "Xác nhận phê duyệt" : "Xác nhận từ chối"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
