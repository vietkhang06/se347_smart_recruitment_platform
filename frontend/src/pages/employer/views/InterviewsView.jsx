import { useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import { useToast } from "../../../context/ToastContext";

export default function InterviewsView({ interviews, setInterviews, onOpenInterviewModal }) {
  const { showToast } = useToast();
  const [selectedDay, setSelectedDay] = useState(19);

  const cancelInterview = (idx) => {
    const item = interviews[idx];
    setInterviews(interviews.filter((_, i) => i !== idx));
    showToast(`Đã hủy lịch phỏng vấn với ${item.candidate}`);
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quản lý lịch phỏng vấn</h5>
          <p className="text-muted small mb-0">Điều phối phòng họp, link trực tuyến và hội đồng phỏng vấn</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => showToast("Đã đồng bộ thành công với Google Calendar")}
          >
            <i className="bi bi-calendar2-check me-1"></i>Đồng bộ Google Calendar
          </Button>
          <Button variant="success" size="sm" className="fw-bold" onClick={onOpenInterviewModal}>
            <i className="bi bi-plus-lg me-1"></i>Tạo lịch phỏng vấn
          </Button>
        </div>
      </div>

      <Row className="g-4">
        {/* Left: Mini Calendar Widget */}
        <Col lg={4}>
          <Card className="matcha-card p-3 border-0 shadow-sm mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <strong className="text-body fs-6">Tháng 09/2026</strong>
              <div className="btn-group btn-group-sm">
                <button type="button" className="btn btn-outline-secondary p-1" aria-label="Tháng trước">‹</button>
                <button type="button" className="btn btn-outline-secondary p-1" aria-label="Tháng sau">›</button>
              </div>
            </div>

            <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                <div key={day} className="text-muted small fw-bold py-1">
                  {day}
                </div>
              ))}

              {/* Offset days */}
              <div></div>
              {Array.from({ length: 30 }, (_, i) => {
                const day = i + 1;
                const isSelected = day === selectedDay;
                const hasInterview = day === 19 || day === 20 || day === 21;

                return (
                  <button
                    key={day}
                    type="button"
                    className={`btn btn-sm p-1 position-relative ${
                      isSelected ? "btn-success fw-bold" : "btn-light bg-surface"
                    }`}
                    style={{ fontSize: "12px", minHeight: "32px" }}
                    onClick={() => {
                      setSelectedDay(day);
                      showToast(`Đã lọc lịch hẹn cho ngày ${day}/09/2026`);
                    }}
                  >
                    {day}
                    {hasInterview && !isSelected && (
                      <span
                        className="position-absolute bottom-0 start-50 translate-middle-x rounded-circle bg-success"
                        style={{ width: "4px", height: "4px" }}
                      ></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-top pt-2 mt-3 small text-muted d-flex justify-content-between">
              <span><i className="bi bi-circle-fill text-success me-1" style={{ fontSize: "8px" }}></i>Có lịch hẹn</span>
              <span>Đang chọn: <strong>{selectedDay}/09/2026</strong></span>
            </div>
          </Card>
        </Col>

        {/* Right: Detailed Table of Interviews */}
        <Col lg={8}>
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-3">Lịch phỏng vấn sắp tới ({interviews.length})</h5>

            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Thời gian</th>
                    <th>Ứng viên</th>
                    <th>Vị trí ứng tuyển</th>
                    <th>Hình thức</th>
                    <th>Hội đồng</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        Chưa có lịch phỏng vấn nào. Bấm nút "Tạo lịch phỏng vấn" để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    interviews.map((iv, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong className="text-primary d-block">{iv.time}</strong>
                          <span className="small text-muted">{iv.date}</span>
                        </td>
                        <td className="fw-semibold">{iv.candidate}</td>
                        <td className="small">{iv.role}</td>
                        <td>
                          <span className="small badge bg-secondary bg-opacity-10 text-body">
                            {iv.type}
                          </span>
                        </td>
                        <td className="text-muted small">{iv.people}</td>
                        <td>
                          <Badge bg="success" className="bg-opacity-10 text-success border">
                            {iv.status}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="Hủy lịch"
                            onClick={() => cancelInterview(idx)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
