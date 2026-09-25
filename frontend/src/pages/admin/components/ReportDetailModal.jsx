import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";

export default function ReportDetailModal({ show, onHide, report, onResolve }) {
  const [actionType, setActionType] = useState("warn");
  const [resolutionNote, setResolutionNote] = useState("");

  if (!report) return null;

  const handleResolve = () => {
    let actionDesc = "Đã gửi cảnh cáo";
    if (actionType === "suspend") actionDesc = "Tạm khóa 7 ngày";
    if (actionType === "dismiss") actionDesc = "Đã bác bỏ báo cáo";

    onResolve(report.id, actionDesc, resolutionNote);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-exclamation-octagon text-danger me-2"></i>Xử lý báo cáo vi phạm
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="p-3 rounded mb-3 bg-surface-2 border">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <code>{report.id}</code>
            <Badge bg={report.severity === "Nghiêm trọng" ? "danger" : "warning"}>
              {report.severity}
            </Badge>
          </div>
          <h6 className="fw-bold text-danger mb-1">{report.subject}</h6>
          <div className="small text-muted">
            Đối tượng bị phản ánh: <strong>{report.target}</strong>
          </div>
          <div className="small text-muted">
            Người gửi báo cáo: {report.reporter} · Cách đây {report.age}
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">Biện pháp chế tài áp dụng</Form.Label>
          <Form.Select value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="warn">Gửi thông báo cảnh cáo chính thức & Yêu cầu giải trình</option>
            <option value="suspend">Tạm đình chỉ tài khoản / Ẩn tin tuyển dụng 7 ngày</option>
            <option value="ban">Khóa vĩnh viễn tài khoản doanh nghiệp vi phạm</option>
            <option value="dismiss">Bác bỏ báo cáo (Không đủ chứng cứ vi phạm)</option>
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label className="small fw-semibold">Ghi chú kết quả xử lý của Quản trị viên</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Ghi nhận nội dung đối soát hoặc phản hồi gửi đến các bên liên quan..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Đóng</Button>
        <Button variant="danger" className="fw-bold" onClick={handleResolve}>
          Thực thi chế tài
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
