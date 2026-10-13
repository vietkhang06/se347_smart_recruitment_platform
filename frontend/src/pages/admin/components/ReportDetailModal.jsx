import { useState, useEffect } from "react";
import { Modal, Button, Badge, Form, Alert } from "react-bootstrap";

export default function ReportDetailModal({
  show,
  onHide,
  report,
  onResolve
}) {
  const [action, setAction] = useState("record");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAction("record");
    setNote("");
    setError("");
    setBusy(false);
  }, [show, report?.id]);

  if (!report) return null;

  const resolved = report.status === "Đã xử lý";

  const submit = async (event) => {
    event.preventDefault();

    if (busy || resolved) return;

    if (!note.trim()) {
      return setError("Vui lòng ghi rõ kết quả đối soát.");
    }

    setError("");
    setBusy(true);

    try {
      await onResolve(report.id, action, note.trim());
      onHide();
    } catch (err) {
      setError(err.message || "Không thể xử lý báo cáo.");
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
          <Modal.Title className="fw-bold fs-5">
            {resolved
              ? "Kết quả xử lý báo cáo"
              : "Xử lý báo cáo vi phạm"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <div className="p-3 rounded mb-3 bg-surface-2 border">
            <div className="d-flex justify-content-between mb-2">
              <code>{report.id}</code>

              <Badge
                bg={
                  report.severity === "Nghiêm trọng"
                    ? "danger"
                    : "warning"
                }
              >
                {report.severity}
              </Badge>
            </div>

            <h6 className="fw-bold">{report.subject}</h6>
            <div className="small">Đối tượng: {report.target}</div>

            <div className="small text-muted">
              Người báo cáo: {report.reporter} · {report.age}
            </div>

            <p
              className="mt-2 mb-0"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {report.description || "Chưa có mô tả bổ sung."}
            </p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          {resolved ? (
            <div>
              <Badge bg="success" className="mb-2">
                Đã xử lý
              </Badge>

              <p>
                <strong>Quyết định:</strong>{" "}
                {report.resolution || "Đã ghi nhận"}
              </p>

              <p style={{ whiteSpace: "pre-wrap" }}>
                {report.note || "Không có ghi chú."}
              </p>

              <small className="text-muted">
                {report.resolvedAt}
              </small>
            </div>
          ) : (
            <>
              <Form.Group
                className="mb-3"
                controlId="report-action"
              >
                <Form.Label>Hướng xử lý</Form.Label>

                <Form.Select
                  value={action}
                  disabled={busy}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="record">
                    Ghi nhận kết quả đối soát
                  </option>

                  <option
                    value="close_job"
                    disabled={!report.jobId}
                  >
                    Đóng tin tuyển dụng liên quan
                  </option>

                  <option value="dismiss">
                    Bác bỏ báo cáo vì không đủ căn cứ
                  </option>
                </Form.Select>

                {!report.jobId && (
                  <Form.Text>
                    Báo cáo chưa liên kết mã tin nên chưa thể đóng tin.
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group controlId="report-note">
                <Form.Label>
                  Ghi chú kết quả xử lý (bắt buộc)
                </Form.Label>

                <Form.Control
                  as="textarea"
                  rows={4}
                  required
                  maxLength={2000}
                  value={note}
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={onHide}
          >
            Đóng
          </Button>

          {!resolved && (
            <Button
              type="submit"
              variant="danger"
              disabled={busy}
            >
              {busy ? "Đang lưu…" : "Xác nhận xử lý"}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
}