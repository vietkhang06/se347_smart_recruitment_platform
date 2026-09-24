import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { useToast } from "../../../context/ToastContext";

export default function PlanModal({ show, onHide, plan }) {
  const { showToast } = useToast();
  const [method, setMethod] = useState("qr");

  if (!plan) return null;

  const handleConfirm = () => {
    showToast(`Đã ghi nhận yêu cầu nâng cấp gói ${plan.name}. Bộ phận CSKH sẽ kích hoạt trong 5 phút!`);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-gem text-success me-2"></i>Nâng cấp gói dịch vụ
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="p-3 rounded mb-3 bg-surface-2 border text-center">
          <span className="text-muted small">Bạn đang chọn gói:</span>
          <h4 className="fw-bold text-success my-1">{plan.name}</h4>
          <div className="fs-5 fw-bold text-body">{plan.price} {plan.period}</div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">Phương thức thanh toán</Form.Label>
          <div className="d-flex flex-column gap-2">
            <Card
              className={`p-3 border cursor-pointer ${method === "qr" ? "border-success bg-success bg-opacity-10" : ""}`}
              onClick={() => setMethod("qr")}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-qr-code-scan fs-4 text-success"></i>
                  <div>
                    <strong className="d-block small">Quét mã VietQR Chuyển khoản</strong>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Xác nhận tức thì qua Napas 247</span>
                  </div>
                </div>
                <Form.Check type="radio" checked={method === "qr"} onChange={() => setMethod("qr")} />
              </div>
            </Card>

            <Card
              className={`p-3 border cursor-pointer ${method === "card" ? "border-success bg-success bg-opacity-10" : ""}`}
              onClick={() => setMethod("card")}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-credit-card-2-front fs-4 text-primary"></i>
                  <div>
                    <strong className="d-block small">Thẻ Quốc Tế (Visa / Mastercard)</strong>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Thanh toán bảo mật cổng OnePay</span>
                  </div>
                </div>
                <Form.Check type="radio" checked={method === "card"} onChange={() => setMethod("card")} />
              </div>
            </Card>

            <Card
              className={`p-3 border cursor-pointer ${method === "invoice" ? "border-success bg-success bg-opacity-10" : ""}`}
              onClick={() => setMethod("invoice")}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-receipt fs-4 text-warning"></i>
                  <div>
                    <strong className="d-block small">Hợp đồng & Xuất hóa đơn VAT</strong>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Dành cho doanh nghiệp thanh toán sau</span>
                  </div>
                </div>
                <Form.Check type="radio" checked={method === "invoice"} onChange={() => setMethod("invoice")} />
              </div>
            </Card>
          </div>
        </Form.Group>

        <div className="small text-muted p-2 rounded bg-surface border">
          <i className="bi bi-shield-check text-success me-1"></i>
          Cam kết hoàn tiền trong 7 ngày nếu không hài lòng với dịch vụ tuyển dụng.
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Hủy</Button>
        <Button variant="success" className="fw-bold" onClick={handleConfirm}>
          Xác nhận thanh toán
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
