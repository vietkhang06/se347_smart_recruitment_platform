import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";

export default function PipelineView({ candidates, setCandidates, onOpenCandidate, onInviteCandidate }) {
  const { showToast } = useToast();
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");

  // Extract unique job positions for filtering
  const jobOptions = Array.from(new Set(candidates.map((c) => c.appliedJobTitle || c.role))).filter(Boolean);

  const filteredCandidates = selectedJobFilter === "all"
    ? candidates
    : candidates.filter((c) => (c.appliedJobTitle || c.role) === selectedJobFilter);

  const moveCandidate = (id, direction) => {
    const target = candidates.find((c) => c.id === id);
    if (!target) return;

    const currentIndex = STAGES_PIPELINE.indexOf(target.stage || "Mới");
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < STAGES_PIPELINE.length) {
      const nextStage = STAGES_PIPELINE[nextIndex];
      mockStore.updateCandidateStage(id, nextStage);
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage: nextStage } : c))
      );
      showToast(`Đã chuyển ứng viên ${target.name} sang bước: ${nextStage}`);
    }
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quy trình tuyển dụng thông minh (Kanban Pipeline)</h5>
          <p className="text-muted small mb-0">Theo dõi và chuyển đổi ứng viên qua 5 giai đoạn đánh giá chuẩn hóa</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Form.Select
            size="sm"
            style={{ width: 220 }}
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
          >
            <option value="all">Tất cả vị trí tuyển dụng</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>{job}</option>
            ))}
          </Form.Select>
        </div>
      </div>

      <Row className="g-3 flex-nowrap overflow-auto pb-4">
        {STAGES_PIPELINE.map((stage, sIdx) => {
          const stageCandidates = filteredCandidates.filter((c) => (c.stage || "Mới") === stage);

          return (
            <Col style={{ minWidth: "280px", maxWidth: "320px" }} key={stage}>
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
                        <div className="text-muted small mb-2 text-truncate">{c.appliedJobTitle || c.role}</div>

                        <div className="d-flex flex-wrap gap-1 mb-3">
                          {c.skills?.slice(0, 3).map((s) => (
                            <span key={s} className="badge bg-secondary bg-opacity-10 text-body" style={{ fontSize: "10px" }}>
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          <div className="d-flex gap-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-success text-decoration-none fw-semibold"
                              style={{ fontSize: "12px" }}
                              onClick={() => onOpenCandidate(c)}
                            >
                              Hồ sơ →
                            </Button>
                            {onInviteCandidate && stage === "Phỏng vấn" && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-primary text-decoration-none fw-semibold"
                                style={{ fontSize: "12px" }}
                                onClick={() => onInviteCandidate(c)}
                              >
                                <i className="bi bi-calendar-event me-1"></i>Lịch hẹn
                              </Button>
                            )}
                          </div>

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
                              disabled={sIdx === STAGES_PIPELINE.length - 1}
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
