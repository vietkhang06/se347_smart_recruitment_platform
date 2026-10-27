import { candidateScore, candidateClosed } from "./CandidatesView";
import { useState, useEffect } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";

export default function PipelineView({
  candidates = [],
  jobs = [],
  selectedJobFilter: initialJobFilter = "all",
  onSelectJobFilter,
  setCandidates,
  onOpenCandidate,
  onInviteCandidate,
  onStageChange
}) {
  const { showToast } = useToast();
  const [selectedJobFilter, setSelectedJobFilter] = useState(initialJobFilter || "all");
  const [movingId, setMovingId] = useState(null);

  // State modal xác nhận thao tác chuyển giai đoạn
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    candidate: null,
    targetStage: "",
    direction: ""
  });

  useEffect(() => {
    if (initialJobFilter) {
      setSelectedJobFilter(initialJobFilter);
    }
  }, [initialJobFilter]);

  const handleJobFilterChange = (val) => {
    setSelectedJobFilter(val);
    if (onSelectJobFilter) onSelectJobFilter(val);
  };

  // Trích xuất danh sách tin tuyển dụng từ cả jobs và candidates
  const jobOptions = Array.from(
    new Map([
      ...jobs.map((j) => [String(j.id), { id: String(j.id), title: j.title }]),
      ...candidates.map((c) => {
        const jId = String(c.jobId || c.appliedJobId || c.appliedJobTitle || c.role || c.candidateRole || "");
        const jTitle = c.appliedJobTitle || c.role || c.candidateRole || "Tin tuyển dụng";
        return [jId, { id: jId, title: jTitle }];
      })
    ]).values()
  ).filter((j) => Boolean(j.title));

  // Kiểm tra tin tuyển dụng liên quan có bị đóng hay không
  const isCandidateJobClosed = (candidate) => {
    if (!candidate) return false;
    const jobId = String(candidate.jobId || candidate.appliedJobId || "");
    const jobTitle = String(candidate.appliedJobTitle || candidate.role || candidate.candidateRole || "").toLowerCase();
    const matchedJob = jobs.find(
      (j) => String(j.id) === jobId || String(j.title).toLowerCase() === jobTitle
    );
    if (matchedJob) {
      const st = String(matchedJob.status || matchedJob.statusCode || "").toLowerCase();
      return st === "closed" || st === "đã đóng";
    }
    return false;
  };

  const filteredCandidates = selectedJobFilter === "all"
    ? candidates
    : candidates.filter((c) => {
        const candidateJobId = String(c.jobId || c.appliedJobId || "");
        const candidateJobTitle = String(c.appliedJobTitle || c.role || c.candidateRole || "");
        return candidateJobId === String(selectedJobFilter) || candidateJobTitle === String(selectedJobFilter);
      });

  // Mở modal xác nhận trước khi thực hiện chuyển bước
  const requestMoveCandidate = (candidate, direction) => {
    if (movingId !== null) return;
    if (!candidate || candidateClosed(candidate)) {
      showToast("Hồ sơ không còn cho phép chuyển giai đoạn.", "danger");
      return;
    }
    if (isCandidateJobClosed(candidate)) {
      showToast("Tin tuyển dụng của hồ sơ này đã đóng. Không thể cập nhật giai đoạn.", "danger");
      return;
    }
    const currentStage = candidate.stage || "Mới";
    const currentIndex = STAGES_PIPELINE.indexOf(currentStage);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + (direction === "next" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= STAGES_PIPELINE.length) return;
    const nextStage = STAGES_PIPELINE[nextIndex];

    setConfirmModal({
      show: true,
      candidate,
      targetStage: nextStage,
      direction
    });
  };

  // Xác nhận và thực thi chuyển giai đoạn kèm rollback nếu lỗi
  const confirmStageTransition = async () => {
    const { candidate, targetStage } = confirmModal;
    if (!candidate || !targetStage) return;

    const candidateId = candidate.id || candidate.applicationId;
    const previousStage = candidate.stage || "Mới";

    setConfirmModal({ show: false, candidate: null, targetStage: "", direction: "" });
    setMovingId(candidateId);

    // Optimistic UI update
    if (setCandidates) {
      setCandidates((prev) =>
        prev.map((c) =>
          String(c.id) === String(candidateId) || String(c.applicationId) === String(candidateId)
            ? { ...c, stage: targetStage }
            : c
        )
      );
    }

    try {
      if (onStageChange) {
        await onStageChange(candidateId, targetStage);
      } else {
        mockStore.updateCandidateStage(candidateId, targetStage);
        if (setCandidates) setCandidates(mockStore.getCandidates());
      }
      showToast(`Đã chuyển ứng viên sang bước: ${targetStage}`);
    } catch (err) {
      // Rollback trạng thái khi gặp lỗi
      if (setCandidates) {
        setCandidates((prev) =>
          prev.map((c) =>
            String(c.id) === String(candidateId) || String(c.applicationId) === String(candidateId)
              ? { ...c, stage: previousStage }
              : c
          )
        );
      }
      showToast(err?.message || "Không thể chuyển giai đoạn ứng viên.", "danger");
    } finally {
      setMovingId(null);
    }
  };

  const activeJobObj = jobOptions.find((j) => j.id === String(selectedJobFilter) || j.title === String(selectedJobFilter));

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
            style={{ width: 240 }}
            aria-label="Lọc vị trí tuyển dụng trên Pipeline"
            value={selectedJobFilter}
            onChange={(e) => handleJobFilterChange(e.target.value)}
          >
            <option value="all">Tất cả vị trí tuyển dụng</option>
            {jobOptions.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </Form.Select>
        </div>
      </div>

      {/* Banner thông báo lọc theo tin cụ thể */}
      {selectedJobFilter !== "all" && activeJobObj && (
        <div className="alert alert-info py-2 px-3 small d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-funnel-fill text-primary"></i>
            <span>Đang hiển thị Pipeline cho tin: <strong>{activeJobObj.title}</strong></span>
          </div>
          <Button
            size="sm"
            variant="outline-secondary"
            className="py-0 px-2"
            onClick={() => handleJobFilterChange("all")}
          >
            Bỏ lọc theo tin
          </Button>
        </div>
      )}

      <Row className="g-3 flex-nowrap overflow-auto pb-4 kanban-board-row">
        {STAGES_PIPELINE.map((stage, sIdx) => {
          const stageCandidates = filteredCandidates.filter((c) => !candidateClosed(c) && (c.stage || "Mới") === stage);

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
                    stageCandidates.map((c) => {
                      const candidateId = c.id || c.applicationId;
                      const isSaving = movingId !== null && String(movingId) === String(candidateId);
                      const isJobClosed = isCandidateJobClosed(c);

                      return (
                        <div
                          key={candidateId}
                          className={`kanban-card position-relative ${isSaving ? "opacity-75" : ""}`}
                        >
                          {/* Trạng thái đang lưu */}
                          {isSaving && (
                            <div
                              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded"
                              style={{ backgroundColor: "rgba(255,255,255,0.7)", zIndex: 5 }}
                            >
                              <div className="d-flex align-items-center gap-1.5 text-success small fw-bold">
                                <Spinner animation="border" size="sm" />
                                <span>Đang lưu...</span>
                              </div>
                            </div>
                          )}

                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <strong className="small text-truncate me-1">{c.name || c.candidateName || "Ứng viên"}</strong>
                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                              {isJobClosed && (
                                <Badge bg="secondary" className="small" style={{ fontSize: "10px" }}>
                                  <i className="bi bi-lock-fill me-1" />Tin đóng
                                </Badge>
                              )}
                              {candidateScore(c) !== null && (
                                <span className="badge bg-success bg-opacity-10 text-success small">{candidateScore(c)}%</span>
                              )}
                            </div>
                          </div>
                          <div className="text-muted small mb-2 text-truncate">{c.appliedJobTitle || c.role || c.candidateRole}</div>

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
                              {onInviteCandidate && stage === "Phỏng vấn" && !isJobClosed && (
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
                                disabled={movingId !== null || sIdx === 0 || isJobClosed}
                                title={isJobClosed ? "Tin tuyển dụng đã đóng" : "Lùi về bước trước"}
                                onClick={() => requestMoveCandidate(c, "prev")}
                              >
                                <i className="bi bi-chevron-left" style={{ fontSize: "11px" }}></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm p-1"
                                disabled={movingId !== null || sIdx === STAGES_PIPELINE.length - 1 || isJobClosed}
                                title={isJobClosed ? "Tin tuyển dụng đã đóng" : "Chuyển sang bước tiếp theo"}
                                onClick={() => requestMoveCandidate(c, "next")}
                              >
                                <i className="bi bi-chevron-right" style={{ fontSize: "11px" }}></i>
                              </button>
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

      {/* Modal xác nhận chuyển giai đoạn */}
      <Modal
        show={confirmModal.show}
        onHide={() => setConfirmModal({ show: false, candidate: null, targetStage: "", direction: "" })}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Xác nhận chuyển giai đoạn</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="small mb-2">
            Bạn có chắc chắn muốn chuyển ứng viên <strong>{confirmModal.candidate?.name || confirmModal.candidate?.candidateName || "này"}</strong>?
          </p>
          <div className="d-flex align-items-center justify-content-center gap-2 p-2 rounded bg-surface-2 border my-2">
            <span className="badge bg-secondary">{confirmModal.candidate?.stage || "Mới"}</span>
            <i className="bi bi-arrow-right text-success"></i>
            <span className="badge bg-success">{confirmModal.targetStage}</span>
          </div>
          <small className="text-muted d-block text-center" style={{ fontSize: "11px" }}>
            Trạng thái mới sẽ được đồng bộ ngay vào CSDL tuyển dụng.
          </small>
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setConfirmModal({ show: false, candidate: null, targetStage: "", direction: "" })}
          >
            Hủy bỏ
          </Button>
          <Button
            size="sm"
            variant="success"
            className="fw-bold"
            onClick={confirmStageTransition}
          >
            Xác nhận chuyển
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}