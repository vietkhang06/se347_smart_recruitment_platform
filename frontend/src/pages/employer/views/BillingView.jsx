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
import { mockStore } from "../../../services/mockStore";

export default function BillingView({ plans: initialPlans, activeJobsCount = 8 }) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState(() => initialPlans || mockStore.getPlans());
  const [selectedPlan, setSelectedPlan] = useState(null);

  const currentPlan = plans.find((p) => p.current) || plans[1] || plans[0];
  const quota = currentPlan.quota || 15;
  const usagePercent = Math.min(100, Math.round((activeJobsCount / quota) * 100));

  const invoices = [
    { id: "#MJ-2026-0901", date: "18/09/2026", plan: currentPlan.name, amount: currentPlan.price, status: "Đã thanh toán" },
    { id: "#MJ-2026-0801", date: "18/08/2026", plan: "Growth", amount: "1.490.000đ", status: "Đã thanh toán" },
    { id: "#MJ-2026-0701", date: "18/07/2026", plan: "Starter", amount: "0đ", status: "Đã thanh toán" }
  ];

  const handlePlanActivated = () => {
    setPlans(mockStore.getPlans());
  };

  const renderPlanBadge = (planName) => {
    const p = (planName || "").toLowerCase();
    if (p.includes("growth")) {
      return (
        <span className="plan-pill plan-pill-growth" title="Gói Growth - Tuyển dụng mở rộng">
          <i className="bi bi-stars"></i>
          <span>Growth</span>
        </span>
      );
    }
    if (p.includes("enterprise") || p.includes("doanh nghiệp")) {
      return (
        <span className="plan-pill plan-pill-enterprise" title="Gói Enterprise - Doanh nghiệp quy mô lớn">
          <i className="bi bi-gem"></i>
          <span>Enterprise</span>
        </span>
      );
    }
    if (p.includes("pro")) {
      return (
        <span className="plan-pill plan-pill-pro" title="Gói Professional - Chuyên nghiệp">
          <i className="bi bi-award"></i>
          <span>Professional</span>
        </span>
      );
    }
    return (
      <span className="plan-pill plan-pill-starter" title="Gói Starter - Miễn phí cơ bản">
        <i className="bi bi-lightning-charge"></i>
        <span>Starter</span>
      </span>
    );
  };

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
            <h3 className="fw-bold text-success mb-1">{currentPlan.name}</h3>
            <p className="text-muted small mb-0">Hạn gia hạn tiếp theo: <strong>18/10/2026</strong> · Tự động trừ định kỳ</p>
          </Col>

          <Col md={7}>
            <div className="d-flex flex-column gap-3 p-3 rounded bg-surface-2 border">
              <div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Tin đang hoạt động: <strong>{activeJobsCount} / {quota} tin</strong></span>
                  <span className="text-success fw-bold">{usagePercent}%</span>
                </div>
                <ProgressBar variant="success" now={usagePercent} style={{ height: "8px" }} />
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
          <Col md={4} key={p.id || p.name}>
            <Card
              className={`matcha-card p-4 h-100 border shadow-sm text-center position-relative ${p.current ? "border-2 border-success" : ""
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
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div>
            <h5 className="fw-bold mb-0">Lịch sử hóa đơn thanh toán</h5>
            <p className="text-muted small mb-0">Theo dõi các giao dịch gia hạn và tải hóa đơn điện tử VAT phục vụ quyết toán thuế</p>
          </div>
          <span className="badge bg-secondary bg-opacity-10 text-body border px-2.5 py-1.5 small">
            <i className="bi bi-clock-history me-1 text-muted"></i>{invoices.length} hóa đơn gần nhất
          </span>
        </div>

        <div className="table-responsive">
          <Table hover className="matcha-table align-middle mb-0">
            <thead>
              <tr>
                <th className="text-start" style={{ width: "22%", minWidth: "160px" }}>
                  Mã hóa đơn
                </th>
                <th className="text-start" style={{ width: "18%", minWidth: "140px" }}>
                  Ngày giao dịch
                </th>
                <th className="text-center" style={{ width: "16%", minWidth: "130px" }}>
                  Gói dịch vụ
                </th>
                <th className="text-end" style={{ width: "16%", minWidth: "120px" }}>
                  Số tiền
                </th>
                <th className="text-center" style={{ width: "14%", minWidth: "120px" }}>
                  Trạng thái
                </th>
                <th className="text-center" style={{ width: "14%", minWidth: "140px" }}>
                  Hóa đơn điện tử
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  {/* Mã hóa đơn*/}
                  <td className="text-start">
                    <button
                      type="button"
                      className="btn p-0 border-0 bg-transparent text-start"
                      title="Nhấp để sao chép mã hóa đơn"
                      onClick={() => {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(inv.id);
                        }
                        showToast(`Đã sao chép mã hóa đơn: ${inv.id}`);
                      }}
                    >
                      <span className="invoice-code-badge">
                        <i className="bi bi-receipt text-success"></i>
                        <span>{inv.id}</span>
                      </span>
                    </button>
                  </td>

                  {/* Ngày giao dịch*/}
                  <td className="text-start">
                    <div className="d-flex align-items-center gap-2 text-muted small">
                      <i className="bi bi-calendar3 text-secondary opacity-75"></i>
                      <span className="fw-medium text-body">{inv.date}</span>
                    </div>
                  </td>

                  {/* Gói dịch vụ*/}
                  <td className="text-center">
                    {renderPlanBadge(inv.plan)}
                  </td>

                  {/* Số tiền*/}
                  <td className="text-end">
                    <span
                      className={`font-monospace ${"text-body fw-semibold"}`}
                      style={{ fontSize: "13.5px" }}
                    >
                      {inv.amount}
                    </span>
                  </td>

                  {/* Trạng thái*/}
                  <td className="text-center">
                    <span className="status-badge status-badge-success">
                      <i className="bi bi-check2-circle" style={{ fontSize: "11px" }}></i>
                      {inv.status}
                    </span>
                  </td>

                  {/* Hóa đơn điện tử*/}
                  <td className="text-center">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="invoice-download-btn d-inline-flex align-items-center gap-1.5"
                      onClick={() => showToast(`Đang tải hóa đơn VAT điện tử ${inv.id} (.PDF)`)}
                    >
                      <i className="bi bi-file-earmark-pdf-fill"></i>
                      <span>Tải VAT (.PDF)</span>
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
        onPlanActivated={handlePlanActivated}
      />
    </div>
  );
}
