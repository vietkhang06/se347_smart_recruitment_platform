import { candidateScore, candidateClosed } from "./CandidatesView";
import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";
import { formatNumber } from "../../../utils/formatUtils";

export default function PipelineView({ candidates = [], setCandidates, onOpenCandidate, onInviteCandidate, onStageChange }) {
  const { showToast } = useToast();
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [movingId, setMovingId] = useState(null);

  // Extract unique job positions for filtering
  const jobOptions = Array.from(
    new Set(candidates.map((c) => c.appliedJobTitle || c.role || c.candidateRole))
  ).filter(Boolean);

  const filteredCandidates = selectedJobFilter === "all"
    ? candidates
    : candidates.filter((c) => (c.appliedJobTitle || c.role || c.candidateRole) === selectedJobFilter);

  const moveCandidate = async (id, direction) => {
    if (movingId !== null) return;
    const target = candidates.find(c => String(c.id) === String(id) || String(c.applicationId) === String(id))
      || mockStore.getCandidateById(id);
    if (!target || candidateClosed(target)) {
      showToast("Hồ sơ không còn cho phép chuyển giai đoạn.", "danger");
      return;
    }
    const currentIndex = STAGES_PIPELINE.indexOf(target.stage || "Mới");
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + (direction === "next" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= STAGES_PIPELINE.length) return;

    setMovingId(id);
    const nextStage = STAGES_PIPELINE[nextIndex];
    try {
      if (onStageChange) {
        await onStageChange(id, nextStage);
      } else {
        mockStore.updateCandidateStage(id, nextStage);
        if (setCandidates) setCandidates(mockStore.getCandidates());
        showToast(`Đã chuyển ứng viên sang bước: ${nextStage}`);
      }
    } catch (err) {
      showToast(err?.message || "Không thể chuyển giai đoạn. Đã giữ nguyên trạng thái cũ.", "danger");
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold mb-0">Quy trình tuyển dụng thông minh (Kanban Pipeline)</h5>
            <Badge bg="secondary" className="bg-opacity-25 text-body">
              {formatNumber(filteredCandidates.filter(c => !candidateClosed(c)).length)} ứng viên đang xử lý
            </Badge>
          </div>
          <p className="text-muted small mb-0">Theo dõi và chuyển đổi ứng viên qua 5 giai đoạn đánh giá chuẩn hóa</p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select
            size="sm"
            style={{ minWidth: 200, maxWidth: 260 }}
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

      {/* Chỉ báo cuộn ngang trên màn hình di động/tablet */}
      <div className="d-md-none alert alert-light py-2 px-3 mb-3 border small text-muted d-flex align-items-center gap-2">
        <i className="bi bi-arrows-expand fs-6 text-success" />
        <span>Vuốt ngang bảng để xem toàn bộ 5 giai đoạn từ <strong>Mới</strong> đến <strong>Đề nghị</strong>.</span>
      </div>

      <Row className="g-3 flex-nowrap overflow-auto pb-4 kanban-board-row">
        {STAGES_PIPELINE.map((stage, sIdx) => {
          const stageCandidates = filteredCandidates.filter((c) => !candidateClosed(c) && (c.stage || "Mới") === stage);

          return (
            <Col style={{ minWidth: "290px", maxWidth: "330px" }} key={stage}>
              <div className="kanban-col p-3 h-100 shadow-sm border bg-surface rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary bg-opacity-25 text-body fw-bold">{sIdx + 1}</span>
                    <strong className="text-body">{stage}</strong>
                  </div>
                  <Badge bg="success" pill className="bg-opacity-10 text-success border">
                    {formatNumber(stageCandidates.length)}
                  </Badge>
                </div>

                <div className="d-flex flex-column gap-2 flex-grow-1" style={{ minHeight: "350px" }}>
                  {stageCandidates.length === 0 ? (
                    <div className="text-center py-5 text-muted border border-dashed rounded bg-surface-2 small">
                      <i className="bi bi-inbox fs-4 d-block mb-1 text-secondary opacity-50" />
                      Chưa có ứng viên ở giai đoạn này
                    </div>
                  ) : (
                    stageCandidates.map((c) => {
                      const isMoving = String(movingId) === String(c.id) || String(movingId) === String(c.applicationId);
                      return (
                        <div key={c.id || c.applicationId} className="kanban-card p-3 rounded border bg-surface shadow-xs transition-all hover-shadow">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <strong className="small text-truncate me-1 text-body">{c.name || c.candidateName || "Ứng viên"}</strong>
                            {candidateScore(c) !== null && (
                              <span className="badge bg-success bg-opacity-10 text-success small flex-shrink-0">
                                {candidateScore(c)}%
                              </span>
                            )}
                          </div>
                          <div className="text-muted small mb-2 text-truncate" style={{ fontSize: "12px" }}>
                            {c.appliedJobTitle || c.role || c.candidateRole}
                          </div>

                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {(Array.isArray(c.skills) ? c.skills : []).slice(0, 3).map((s) => (
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
                                  <i className="bi bi-calendar-event me-1" />Hẹn
                                </Button>
                              )}
                            </div>

                            <div className="btn-group btn-group-sm">
                              {isMoving ? (
                                <span className="p-1"><Spinner animation="border" size="sm" variant="success" /></span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-2 py-1"
                                    disabled={movingId !== null || sIdx === 0}
                                    title="Lùi về bước trước"
                                    aria-label="Lùi về bước trước"
                                    onClick={() => moveCandidate(c.id || c.applicationId, "prev")}
                                  >
                                    <i className="bi bi-chevron-left" style={{ fontSize: "12px" }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-success btn-sm px-2 py-1"
                                    disabled={movingId !== null || sIdx === STAGES_PIPELINE.length - 1}
                                    title="Chuyển sang bước tiếp theo"
                                    aria-label="Chuyển sang bước tiếp theo"
                                    onClick={() => moveCandidate(c.id || c.applicationId, "next")}
                                  >
                                    <i className="bi bi-chevron-right" style={{ fontSize: "12px" }} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
