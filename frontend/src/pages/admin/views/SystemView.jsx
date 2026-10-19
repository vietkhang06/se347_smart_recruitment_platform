import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function SystemView() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState(() => mockStore.getSystemSettings());
  const services = mockStore.getSystemServices();

  const handleToggle = (id) => {
    const updated = mockStore.toggleSystemSetting(id);
    setSettings(updated);
    const item = updated.find((s) => s.id === id);
    showToast(`Đã ${item.checked ? "kích hoạt" : "tắt"}: ${item.label}`);
  };

  const handleSave = () => {
    showToast("Đã lưu toàn bộ cấu hình quy tắc vận hành hệ thống vào CSDL!");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Cấu hình hệ thống & An ninh vận hành</h5>
          <p className="text-muted small mb-0">Thiết lập quy tắc tự động hóa, kiểm soát bảo mật và giám sát tình trạng hạ tầng</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSave}>
          <i className="bi bi-check2 me-1"></i>Lưu cấu hình
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: 5 Switch Settings */}
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <h5 className="fw-bold mb-3">Quy tắc tự động & Chính sách nền tảng</h5>
            <div className="d-flex flex-column gap-3">
              {settings.map((s) => (
                <div
                  key={s.id}
                  className="d-flex justify-content-between align-items-center p-3 rounded bg-surface-2 border"
                >
                  <div className="me-3">
                    <strong className="d-block text-body mb-1">{s.label}</strong>
                    <div className="text-muted small">{s.desc}</div>
                  </div>
                  <Form.Check
                    type="switch"
                    id={s.id}
                    checked={s.checked}
                    onChange={() => handleToggle(s.id)}
                    className="fs-5"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Right: Service Health Monitor */}
        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Tình trạng cụm dịch vụ Core</h5>
              <span className="badge bg-success bg-opacity-10 text-success border">
                <i className="bi bi-circle-fill me-1" style={{ fontSize: "8px" }}></i>Hoạt động 100%
              </span>
            </div>

            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Dịch vụ</th>
                    <th>Độ trễ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((srv, idx) => (
                    <tr key={idx}>
                      <td className="small fw-semibold">{srv.name}</td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-body small">
                          {srv.latency}
                        </span>
                      </td>
                      <td>
                        <span className="text-success small fw-bold">
                          <i className="bi bi-check-circle-fill me-1"></i>{srv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="matcha-card p-3 border-0 shadow-sm bg-surface-2">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-shield-lock-fill fs-2 text-primary"></i>
              <div>
                <strong className="d-block small">Chứng chỉ bảo mật SSL / TLS 1.3</strong>
                <span className="text-muted small">Mã hóa đầu cuối bảo vệ dữ liệu hồ sơ cá nhân của người dùng</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
