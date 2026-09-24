import { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { storage } from "../../services/storage";

export default function ApplicationsPage() {
  const [applications] = useState(() => storage.getApplications());

  const steps = ["Đã nộp hồ sơ", "Sàng lọc hồ sơ", "Phỏng vấn chuyên môn", "Nhận kết quả Offer"];

  return (
    <Container className="py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-1">Theo dõi tiến trình ứng tuyển</h1>
        <p className="text-muted">Cập nhật trạng thái xử lý hồ sơ của bạn từ phía các nhà tuyển dụng</p>
      </div>

      <Row className="g-4">
        {applications.map((app, idx) => (
          <Col xs={12} key={app.id || idx}>
            <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up" data-aos-delay={idx * 100}>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <h4 className="fw-bold mb-1 fs-5">{app.title}</h4>
                  <div className="text-muted small">
                    <i className="bi bi-buildings me-1"></i>{app.company} · <span>Nộp ngày: {app.date}</span>
                  </div>
                </div>

                <span className={`status-chip ${app.statusBadge || "is-success"}`}>
                  <i className="bi bi-dot"></i>{app.stage}
                </span>
              </div>

              {/* Progress 4-step timeline */}
              <div className="pt-3 border-top mt-2">
                <div className="d-flex justify-content-between position-relative mb-2">
                  <div 
                    className="position-absolute top-50 start-0 translate-middle-y bg-secondary bg-opacity-25 w-100"
                    style={{ height: "3px", zIndex: 0 }}
                  ></div>
                  <div 
                    className="position-absolute top-50 start-0 translate-middle-y bg-success"
                    style={{ height: "3px", width: `${((app.step || 1) - 1) * 33.33}%`, zIndex: 0, transition: "width 0.5s ease" }}
                  ></div>

                  {steps.map((s, stepIdx) => {
                    const isDone = (app.step || 1) >= (stepIdx + 1);
                    return (
                      <div key={s} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1 }}>
                        <div 
                          className={`rounded-circle d-flex align-items-center justify-content-center text-white small fw-bold shadow-sm ${
                            isDone ? "bg-success" : "bg-secondary bg-opacity-50"
                          }`}
                          style={{ width: "28px", height: "28px" }}
                        >
                          {isDone ? <i className="bi bi-check"></i> : stepIdx + 1}
                        </div>
                        <span className={`small mt-1 text-center d-none d-sm-block ${isDone ? "fw-bold text-success" : "text-muted"}`} style={{ fontSize: "11px" }}>
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
