import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { useToast } from "../../../context/ToastContext";

const STAGES = ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"];

export default function PipelineView({ candidates, setCandidates, onOpenCandidate }) {
  const { showToast } = useToast();

  const moveCandidate = (id, direction) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const currentIndex = STAGES.indexOf(c.stage || "Mới");
          const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
          if (nextIndex >= 0 && nextIndex < STAGES.length) {
            const nextStage = STAGES[nextIndex];
            showToast(`Đã chuyển ứng viên ${c.name} sang bước: ${nextStage}`);
            return { ...c, stage: nextStage };
          }
        }
        return c;
      })
    );
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quy trình tuyển dụng thông minh (Kanban Pipeline)</h5>
          <p className="text-muted small mb-0">Theo dõi và chuyển đổi ứng viên qua 5 giai đoạn đánh giá chuẩn hóa</p>
        </div>
        <div className="d-flex align-items-center gap-2 small text-muted">
          <span><i className="bi bi-info-circle me-1"></i>Sử dụng nút mũi tên trên thẻ để chuyển giai đoạn</span>
        </div>
      </div>

      <Row className="g-3 flex-nowrap overflow-auto pb-4">
        {STAGES.map((stage, sIdx) => {
          const stageCandidates = candidates.filter((c) => (c.stage || "Mới") === stage);

          return (
            <Col style={{ minWidth: "270px", maxWidth: "310px" }} key={stage}>
              <div className="kanban-col p-3 h-100 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary bg-opacity-25 text-body fw-bold">{sIdx + 1}</span>
                    <strong className="text-body">{stage}</strong>
                  </div>
                  <Badge bg="success" pill className="bg-opacity-10 text-success border">
                    {stageCandidates.length}
                  </Badge>
                </div>

                <div className="d-flex flex-column gap-2 flex-grow-1">
                  {stageCandidates.length === 0 ? (
                    <div className="text-center py-4 text-muted border border-dashed rounded bg-surface-2 small">
                      Chưa có ứng viên ở giai đoạn này
                    </div>
                  ) : (
                    stageCandidates.map((c) => (
                      <div key={c.id} className="kanban-card">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <strong className="small text-truncate me-1">{c.name}</strong>
                          <span className="badge bg-success bg-opacity-10 text-success small">{c.match}%</span>
                        </div>
                        <div className="text-muted small mb-2">{c.role}</div>

                        <div className="d-flex flex-wrap gap-1 mb-3">
                          {c.skills?.map((s) => (
                            <span key={s} className="badge bg-secondary bg-opacity-10 text-body" style={{ fontSize: "10px" }}>
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-success text-decoration-none fw-semibold"
                            style={{ fontSize: "12px" }}
                            onClick={() => onOpenCandidate(c)}
                          >
                            Hồ sơ →
                          </Button>

                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm p-1"
                              disabled={sIdx === 0}
                              title="Lùi về bước trước"
                              onClick={() => moveCandidate(c.id, "prev")}
                            >
                              <i className="bi bi-chevron-left" style={{ fontSize: "11px" }}></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm p-1"
                              disabled={sIdx === STAGES.length - 1}
                              title="Chuyển sang bước tiếp theo"
                              onClick={() => moveCandidate(c.id, "next")}
                            >
                              <i className="bi bi-chevron-right" style={{ fontSize: "11px" }}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
