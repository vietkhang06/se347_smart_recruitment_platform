import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import PlanModal from "../components/PlanModal";
import { useToast } from "../../../context/ToastContext";

export default function BillingView({ plans }) {
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const invoices = [
    { id: "#MJ-2026-0901", date: "18/09/2026", plan: "Growth", amount: "1.490.000đ", status: "Đã thanh toán" },
    { id: "#MJ-2026-0801", date: "18/08/2026", plan: "Growth", amount: "1.490.000đ", status: "Đã thanh toán" },
    { id: "#MJ-2026-0701", date: "18/07/2026", plan: "Growth", amount: "1.490.000đ", status: "Đã thanh toán" }
  ];

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Dịch vụ & Gói cước tuyển dụng</h5>
          <p className="text-muted small mb-0">Quản lý hạn mức tin đăng, số lượt mở hồ sơ ứng viên và lịch sử giao dịch</p>
        </div>
        <Button variant="outline-success" size="sm" onClick={() => showToast("Đã tải xuống lịch sử giao dịch (.PDF)")}>
          <i className="bi bi-file-earmark-arrow-down me-1"></i>Tải lịch sử hóa đơn
        </Button>
      </div>

      {/* Current Plan Overview with Usage */}
      <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
        <Row className="align-items-center g-3">
          <Col md={5}>
            <span className="badge bg-success bg-opacity-10 text-success fw-bold mb-1">GÓI HIỆN TẠI</span>
            <h3 className="fw-bold text-success mb-1">Growth (Doanh nghiệp tăng trưởng)</h3>
            <p className="text-muted small mb-0">Hạn gia hạn tiếp theo: <strong>18/10/2026</strong> · Tự động trừ định kỳ</p>
          </Col>

          <Col md={7}>
            <div className="d-flex flex-column gap-3 p-3 rounded bg-surface-2 border">
              <div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Tin đang hoạt động: <strong>8 / 15 tin</strong></span>
                  <span className="text-success fw-bold">53%</span>
                </div>
                <ProgressBar variant="success" now={53} style={{ height: "8px" }} />
              </div>

              <div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Hồ sơ đã xem tháng này: <strong>286 / 500 hồ sơ</strong></span>
                  <span className="text-primary fw-bold">57%</span>
                </div>
                <ProgressBar variant="primary" now={57} style={{ height: "8px" }} />
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Pricing Comparison Grid */}
      <h5 className="fw-bold mb-3">Các gói dịch vụ tiêu chuẩn</h5>
      <Row className="g-4 mb-4">
        {plans.map((p) => (
          <Col md={4} key={p.name}>
            <Card
              className={`matcha-card p-4 h-100 border shadow-sm text-center position-relative ${
                p.current ? "border-2 border-success" : ""
              }`}
            >
              {p.current && (
                <span className="badge bg-success position-absolute top-0 start-50 translate-middle px-3 py-1">
                  Đang sử dụng
                </span>
              )}

              <h4 className="fw-bold mt-2 mb-1">{p.name}</h4>
              <div className="fs-3 fw-bold text-success my-2">
                {p.price} <small className="fs-6 text-muted">{p.period}</small>
              </div>

              <ul className="list-unstyled my-3 text-muted small d-flex flex-column gap-2 text-start">
                {p.features.map((f) => (
                  <li key={f}>
                    <i className="bi bi-check2 text-success me-2 fw-bold"></i>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-3">
                <Button
                  variant={p.current ? "outline-secondary" : "success"}
                  className="w-100 fw-bold"
                  disabled={p.current}
                  onClick={() => setSelectedPlan(p)}
                >
                  {p.current ? "Gói đang hoạt động" : "Nâng cấp gói này"}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Invoices Table */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        <h5 className="fw-bold mb-3">Lịch sử hóa đơn thanh toán</h5>
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Mã hóa đơn</th>
                <th>Ngày giao dịch</th>
                <th>Gói dịch vụ</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Hóa đơn điện tử</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><code>{inv.id}</code></td>
                  <td>{inv.date}</td>
                  <td><Badge bg="secondary" className="bg-opacity-10 text-body">{inv.plan}</Badge></td>
                  <td className="fw-bold text-success">{inv.amount}</td>
                  <td><Badge bg="success">{inv.status}</Badge></td>
                  <td>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-success text-decoration-none fw-semibold"
                      onClick={() => showToast(`Đang tải hóa đơn VAT điện tử ${inv.id}`)}
                    >
                      <i className="bi bi-filetype-pdf me-1"></i>Tải VAT (.PDF)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Plan Modal */}
      <PlanModal
        show={selectedPlan !== null}
        onHide={() => setSelectedPlan(null)}
        plan={selectedPlan}
      />
    </div>
  );
}
