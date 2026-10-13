import { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, Alert } from "react-bootstrap";
import { mockStore } from "../../../services/mockStore";

export default function ModerationModal({
  show,
  onHide,
  review,
  action,
  onConfirm
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote("");
    setError("");
    setBusy(false);
  }, [show, review?.id, action]);

  if (!review) return null;

  const approve = action === "approve";

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setError("");

    if (!approve && !note.trim()) {
      return setError("Vui lòng nhập lý do từ chối.");
    }

    const current = mockStore
      .getReviews()
      .find((item) => item.id === review.id);

    if (
      !current ||
      ["Đã duyệt", "Đã từ chối"].includes(current.status)
    ) {
      return setError(
        "Hồ sơ đã được xử lý hoặc không còn tồn tại. Hãy đóng và kiểm tra lại."
      );
    }

    setBusy(true);

    try {
      await onConfirm(
        review.id,
        approve ? "Đã duyệt" : "Đã từ chối",
        note.trim()
      );
    } catch (err) {
      setError(err.message || "Không thể lưu kết quả.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={busy ? () => {} : onHide}
      centered
      backdrop="static"
    >
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title
            className={`fw-bold fs-5 text-${
              approve ? "success" : "danger"
            }`}
          >
            {approve ? "Phê duyệt nội dung" : "Từ chối nội dung"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <div className="p-3 rounded mb-3 bg-surface-2 border">
            <div className="d-flex justify-content-between mb-2">
              <code>{review.id}</code>
              <Badge
                bg={review.risk === "Cao" ? "danger" : "secondary"}
              >
                {review.risk}
              </Badge>
            </div>

            <h6 className="fw-bold">{review.title}</h6>
            <div className="small text-muted">
              Đơn vị gửi: {review.company}
            </div>
            <p className="small mb-0 mt-2">{review.details}</p>
          </div>

          <p className="small text-muted">
            {approve
              ? "Tin tuyển dụng được chuyển sang đang tuyển; hồ sơ doanh nghiệp được đánh dấu đã xác minh."
              : "Tin tuyển dụng bị từ chối sẽ được đóng. Ghi rõ nội dung cần chỉnh sửa."}
          </p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group controlId="moderation-note">
            <Form.Label>
              Ghi chú {approve ? "(tùy chọn)" : "(bắt buộc)"}
            </Form.Label>

            <Form.Control
              as="textarea"
              rows={4}
              maxLength={2000}
              required={!approve}
              value={note}
              disabled={busy}
              onChange={(e) => setNote(e.target.value)}
            />

            <Form.Text>{note.length}/2000 ký tự</Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={onHide}
          >
            Hủy
          </Button>

          <Button
            type="submit"
            disabled={busy}
            variant={approve ? "success" : "danger"}
          >
            {busy
              ? "Đang lưu…"
              : approve
              ? "Xác nhận phê duyệt"
              : "Xác nhận từ chối"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}