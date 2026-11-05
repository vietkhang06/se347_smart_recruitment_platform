import { candidateScore, candidateClosed } from "./CandidatesView";
import { useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";
import { interviewService } from "../../../services";
import { formatNumber } from "../../../utils/formatUtils";

export default function PipelineView({
  candidates = [],
  interviews = [],
  setCandidates,
  onOpenCandidate,
  onInviteCandidate,
  onStageChange,
  onRefreshData
}) {
  const { showToast } = useToast();
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [movingId, setMovingId] = useState(null);

  // Modal xác nhận chuyển giai đoạn (Tiến hoặc Lùi)
  const [confirmModalData, setConfirmModalData] = useState(null);

  // Modal gợi ý tạo lịch phỏng vấn ngay khi ứng viên vừa vào cột "Phỏng vấn"
  const [interviewPromptCandidate, setInterviewPromptCandidate] = useState(null);

  // Lưu thao tác chuyển bước gần nhất để hỗ trợ Rollback 1-click
  const [lastAction, setLastAction] = useState(null);

  // Trích xuất danh sách vị trí tuyển dụng duy nhất
  const jobOptions = Array.from(
    new Set(candidates.map((c) => c.appliedJobTitle || c.role || c.candidateRole))
  ).filter(Boolean);

  const filteredCandidates = selectedJobFilter === "all"
    ? candidates
    : candidates.filter((c) => (c.appliedJobTitle || c.role || c.candidateRole) === selectedJobFilter);

  // Tìm lịch phỏng vấn đang hoạt động (chưa hoàn thành / chưa hủy) của ứng viên
  const findActiveInterview = (candidate) => {
    if (!candidate || !Array.isArray(interviews)) return null;
    return interviews.find((i) => {
      const matchApp = i.applicationId && String(i.applicationId) === String(candidate.applicationId || candidate.id);
      const matchCand = i.candidateId && String(i.candidateId) === String(candidate.candidateId || candidate.id);
      const matchName = i.candidate && (i.candidate === candidate.name || i.candidate === candidate.candidateName);
      const isPending = !/hoàn tất|hủy|completed|cancelled/i.test(i.status || "");
      return (matchApp || matchCand || matchName) && isPending;
    });
  };

  // Tìm lịch phỏng vấn đã hoàn tất của ứng viên
  const findCompletedInterview = (candidate) => {
    if (!candidate || !Array.isArray(interviews)) return null;
    return interviews.find((i) => {
      const matchApp = i.applicationId && String(i.applicationId) === String(candidate.applicationId || candidate.id);
      const matchCand = i.candidateId && String(i.candidateId) === String(candidate.candidateId || candidate.id);
      const matchName = i.candidate && (i.candidate === candidate.name || i.candidate === candidate.candidateName);
      const isDone = /hoàn tất|completed/i.test(i.status || "");
      return (matchApp || matchCand || matchName) && isDone;
    });
  };

  // Bước 1: Khi bấm nút [ < ] hoặc [ > ], kiểm tra và mở modal xác nhận
  const handleRequestMove = (candidate, direction) => {
    if (movingId !== null) return;
    if (!candidate || candidateClosed(candidate)) {
      showToast("Hồ sơ không còn cho phép chuyển giai đoạn.", "danger");
      return;
    }

    const currentStage = candidate.stage || "Mới";
    const currentIndex = STAGES_PIPELINE.indexOf(currentStage);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + (direction === "next" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= STAGES_PIPELINE.length) return;

    const targetStage = STAGES_PIPELINE[nextIndex];
    const activeInterview = findActiveInterview(candidate);

    setConfirmModalData({
      candidate,
      fromStage: currentStage,
      toStage: targetStage,
      direction,
      activeInterview
    });
  };

  // Bước 2: Thực thi chuyển giai đoạn sau khi người dùng xác nhận
  const executeStageChange = async (candidate, targetStage, direction, activeInterview) => {
    const candidateId = candidate.id || candidate.applicationId;
    setMovingId(candidateId);
    setConfirmModalData(null);

    const fromStage = candidate.stage || "Mới";

    try {
      // 1. Xử lý đồng bộ lịch phỏng vấn (Trường hợp 2)
      if (activeInterview) {
        if (direction === "next") {
          // Chuyển TIẾN (qua vòng phỏng vấn): Đánh dấu lịch phỏng vấn đã hoàn tất sớm
          try {
            await interviewService.updateInterviewStatus(
              activeInterview.id,
              "completed",
              `Ứng viên đã hoàn tất phỏng vấn và được chuyển lên bước: ${targetStage}`
            );
          } catch (e) {
            console.warn("Không thể cập nhật trạng thái phỏng vấn completed:", e.message);
          }
        } else if (direction === "prev") {
          // Chuyển LÙI: Hủy lịch phỏng vấn đang chờ
          try {
            await interviewService.updateInterviewStatus(
              activeInterview.id,
              "cancelled",
              `Lùi ứng viên về giai đoạn: ${targetStage}`
            );
          } catch (e) {
            console.warn("Không thể hủy lịch phỏng vấn khi lùi bước:", e.message);
          }
        }
        // Làm mới dữ liệu lịch hẹn
        if (onRefreshData) onRefreshData();
      }

      // 2. Chuyển trạng thái ứng viên
      if (onStageChange) {
        await onStageChange(candidateId, targetStage);
      } else {
        mockStore.updateCandidateStage(candidateId, targetStage);
        if (setCandidates) setCandidates(mockStore.getCandidates());
        showToast(`Đã chuyển ứng viên sang giai đoạn: ${targetStage}`);
      }

      // 3. Ghi nhận thao tác gần nhất để hỗ trợ Rollback 1-click
      setLastAction({
        candidateId,
        candidateName: candidate.name || candidate.candidateName || "Ứng viên",
        fromStage,
        toStage: targetStage,
        timestamp: Date.now()
      });

      // 4. Nếu vừa chuyển VÀO giai đoạn "Phỏng vấn", hiển thị Popup hỏi lên lịch hẹn
      if (targetStage === "Phỏng vấn") {
        setInterviewPromptCandidate({
          ...candidate,
          stage: "Phỏng vấn"
        });
      }
    } catch (err) {
      showToast(err?.message || "Không thể chuyển giai đoạn. Đã giữ nguyên trạng thái cũ.", "danger");
    } finally {
      setMovingId(null);
    }
  };

  // Xử lý nút Rollback (Hoàn tác 1-click)
  const handleRollback = async () => {
    if (!lastAction || movingId !== null) return;
    const { candidateId, candidateName, fromStage, toStage } = lastAction;

    // Kiểm tra xem ứng viên hiện tại có còn ở toStage không
    const currentCandidate = candidates.find(
      (c) => String(c.id) === String(candidateId) || String(c.applicationId) === String(candidateId)
    );

    if (currentCandidate && currentCandidate.stage !== toStage) {
      showToast(
        `Ứng viên ${candidateName} đã thay đổi trạng thái sang "${currentCandidate.stage}". Không thể hoàn tác.`,
        "warning"
      );
      setLastAction(null);
      return;
    }

    setMovingId(candidateId);
    try {
      if (onStageChange) {
        await onStageChange(candidateId, fromStage);
      } else {
        mockStore.updateCandidateStage(candidateId, fromStage);
        if (setCandidates) setCandidates(mockStore.getCandidates());
        showToast(`Đã hoàn tác: Đưa ${candidateName} về lại bước "${fromStage}"`);
      }
      setLastAction(null);
      if (onRefreshData) onRefreshData();
    } catch {
      // Lỗi đã được xử lý ở tầng trên
    } finally {
      setMovingId(null);
    }
  };

  // Xử lý khi người dùng tạm hoãn tạo lịch phỏng vấn (Trường hợp 1 & 3)
  const handleDismissInterviewPrompt = () => {
    if (!interviewPromptCandidate) return;
    const cand = interviewPromptCandidate;
    setInterviewPromptCandidate(null);

    // Bắn Toast thông báo nhắc nhở kèm Action Button
    showToast(
      `Ứng viên ${cand.name || cand.candidateName} chưa được đăng ký lịch phỏng vấn.`,
      "warning",
      {
        actionLabel: "Hẹn ngay",
        onAction: () => handleScheduleFromReminder(cand.id || cand.applicationId)
      }
    );
  };

  // Xử lý khi người dùng click vào thông báo / reminder hẹn lịch
  const handleScheduleFromReminder = (candidateId) => {
    const current = candidates.find(
      (c) => String(c.id) === String(candidateId) || String(c.applicationId) === String(candidateId)
    );

    if (!current) {
      showToast("Không tìm thấy thông tin ứng viên.", "danger");
      return;
    }

    // Nghiệp vụ trường hợp 1: Nếu ứng viên không còn ở bước Phỏng vấn
    if (current.stage !== "Phỏng vấn") {
      showToast(
        `Ứng viên ${current.name || current.candidateName} hiện không còn ở giai đoạn Phỏng vấn (đang ở: "${current.stage || "Mới"}"). Không thể đăng ký lịch phỏng vấn.`,
        "info"
      );
      return;
    }

    // Nghiệp vụ trường hợp 3: Ứng viên vẫn ở bước Phỏng vấn ➜ Mở modal tạo lịch bình thường
    if (onInviteCandidate) {
      onInviteCandidate(current);
    }
  };

  return (
    <div data-aos="fade-up">
      {/* Header & Thanh công cụ */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold mb-0">Quy trình tuyển dụng thông minh (Kanban Pipeline)</h5>
            <Badge bg="secondary" className="bg-opacity-25 text-body">
              {formatNumber(filteredCandidates.filter((c) => !candidateClosed(c)).length)} ứng viên đang xử lý
            </Badge>
          </div>
          <p className="text-muted small mb-0">Theo dõi và chuyển đổi ứng viên qua 5 giai đoạn đánh giá chuẩn hóa</p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Nút Rollback (Hoàn tác nhanh) */}
          {lastAction && (
            <Button
              variant="outline-warning"
              size="sm"
              className="d-flex align-items-center gap-1.5 rounded-3 shadow-xs px-2.5 py-1 text-nowrap border-warning-subtle"
              style={{ fontSize: "13px" }}
              title={`Hoàn tác: Đưa ${lastAction.candidateName} về lại bước ${lastAction.fromStage}`}
              onClick={handleRollback}
              disabled={movingId !== null}
            >
              <i className="bi bi-arrow-counterclockwise fw-bold" />
              <span>Hoàn tác: <strong>{lastAction.candidateName}</strong> ➜ {lastAction.fromStage}</span>
            </Button>
          )}

          {/* Custom Combobox lọc vị trí tuyển dụng chuẩn MatchaJob theme */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              id="job-filter-dropdown"
              className="d-flex align-items-center justify-content-between px-3 py-1.5 rounded-3 bg-surface text-body border text-truncate shadow-xs"
              style={{ minWidth: 220, maxWidth: 280, borderColor: "var(--border)" }}
            >
              <div className="d-flex align-items-center gap-2 text-truncate me-2">
                <i className="bi bi-briefcase text-success flex-shrink-0" />
                <span className="text-truncate small fw-semibold">
                  {selectedJobFilter === "all" ? "Tất cả vị trí tuyển dụng" : selectedJobFilter}
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu
              className="shadow-lg border rounded-3 py-1 bg-surface"
              style={{ maxHeight: 320, overflowY: "auto", minWidth: 260 }}
            >
              <div className="px-3 py-1.5 text-muted small fw-semibold border-bottom mb-1">
                Lọc theo vị trí tuyển dụng
              </div>
              <Dropdown.Item
                active={selectedJobFilter === "all"}
                onClick={() => setSelectedJobFilter("all")}
                className="d-flex align-items-center justify-content-between small py-2 px-3"
              >
                <span>Tất cả vị trí tuyển dụng</span>
                {selectedJobFilter === "all" && <i className="bi bi-check2 text-success fw-bold" />}
              </Dropdown.Item>

              {jobOptions.length > 0 && <Dropdown.Divider className="my-1" />}

              {jobOptions.map((job) => (
                <Dropdown.Item
                  key={job}
                  active={selectedJobFilter === job}
                  onClick={() => setSelectedJobFilter(job)}
                  className="d-flex align-items-center justify-content-between small py-2 px-3"
                >
                  <span className="text-truncate me-2">{job}</span>
                  {selectedJobFilter === job && <i className="bi bi-check2 text-success fw-bold" />}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Chỉ báo cuộn ngang trên mobile */}
      <div className="d-md-none py-2 px-3 mb-3 border small text-muted d-flex align-items-center gap-2 rounded-3" style={{ backgroundColor: "var(--surface-2)" }}>
        <i className="bi bi-arrows-expand fs-6 text-success" />
        <span>Vuốt ngang bảng để xem toàn bộ 5 giai đoạn từ <strong>Mới</strong> đến <strong>Đề nghị</strong>.</span>
      </div>

      {/* Bảng Kanban 5 cột */}
      <Row className="g-3 flex-nowrap overflow-auto pb-4 kanban-board-row">
        {STAGES_PIPELINE.map((stage, sIdx) => {
          const stageCandidates = filteredCandidates.filter(
            (c) => !candidateClosed(c) && (c.stage || "Mới") === stage
          );

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
                      const candidateId = c.id || c.applicationId;
                      const isMoving = String(movingId) === String(candidateId);
                      const activeInterview = stage === "Phỏng vấn" ? findActiveInterview(c) : null;
                      const completedInterview = stage === "Phỏng vấn" ? findCompletedInterview(c) : null;

                      return (
                        <div
                          key={candidateId}
                          className="kanban-card p-3 rounded border bg-surface shadow-xs transition-all hover-shadow"
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <strong className="small text-truncate me-1 text-body">
                              {c.name || c.candidateName || "Ứng viên"}
                            </strong>
                            {candidateScore(c) !== null && (
                              <span className="badge bg-success bg-opacity-10 text-success small flex-shrink-0">
                                {candidateScore(c)}%
                              </span>
                            )}
                          </div>

                          <div className="text-muted small mb-2 text-truncate" style={{ fontSize: "12px" }}>
                            {c.appliedJobTitle || c.role || c.candidateRole}
                          </div>

                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {(Array.isArray(c.skills) ? c.skills : []).slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="badge bg-secondary bg-opacity-10 text-body"
                                style={{ fontSize: "10px" }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>

                          {/* Badge trạng thái lịch phỏng vấn trong cột "Phỏng vấn" */}
                          {stage === "Phỏng vấn" && (
                            <div className="mb-2">
                              {activeInterview ? (
                                <Badge
                                  bg="success"
                                  className="bg-opacity-15 text-success border border-success-subtle fw-normal d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "11px" }}
                                  title={`Thời gian: ${activeInterview.time || ""} ${activeInterview.date || ""}`}
                                >
                                  <i className="bi bi-calendar-check" /> Đã có lịch hẹn
                                </Badge>
                              ) : completedInterview ? (
                                <Badge
                                  bg="info"
                                  className="bg-opacity-15 text-info border border-info-subtle fw-normal d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "11px" }}
                                >
                                  <i className="bi bi-check2-circle" /> Đã phỏng vấn V1
                                </Badge>
                              ) : (
                                <span
                                  className="d-inline-flex align-items-center gap-1 fw-normal rounded px-1"
                                  style={{
                                    fontSize: "11px",
                                    backgroundColor: "rgba(217,119,6,0.15)",
                                    color: "var(--warning)",
                                    border: "1px solid rgba(217,119,6,0.3)",
                                    padding: "2px 6px"
                                  }}
                                >
                                  <i className="bi bi-exclamation-circle" /> Chưa có lịch phỏng vấn
                                </span>
                              )}
                            </div>
                          )}

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            <div className="d-flex gap-2 align-items-center">
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
                                  variant={activeInterview ? "link" : "outline-primary"}
                                  size="sm"
                                  className={activeInterview ? "p-0 text-primary text-decoration-none fw-semibold" : "px-2 py-0 fw-semibold rounded-pill"}
                                  style={{ fontSize: "12px" }}
                                  onClick={() => onInviteCandidate(c)}
                                  title={activeInterview ? "Xem / Chỉnh sửa lịch" : "Lên lịch phỏng vấn ngay"}
                                >
                                  <i className="bi bi-calendar-event me-1" />
                                  {activeInterview ? "Lịch hẹn" : "Đặt lịch"}
                                </Button>
                              )}
                            </div>

                            <div className="btn-group btn-group-sm">
                              {isMoving ? (
                                <span className="p-1">
                                  <Spinner animation="border" size="sm" variant="success" />
                                </span>
                              ) : (
                                <>
                                  {/* Nút lùi về bước trước: có popup xác nhận */}
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-2 py-1"
                                    disabled={movingId !== null || sIdx === 0}
                                    title="Lùi về bước trước"
                                    aria-label="Lùi về bước trước"
                                    onClick={() => handleRequestMove(c, "prev")}
                                  >
                                    <i className="bi bi-chevron-left" style={{ fontSize: "12px" }} />
                                  </button>

                                  {/* Nút chuyển sang bước tiếp theo: có popup xác nhận */}
                                  <button
                                    type="button"
                                    className="btn btn-outline-success btn-sm px-2 py-1"
                                    disabled={movingId !== null || sIdx === STAGES_PIPELINE.length - 1}
                                    title="Chuyển sang bước tiếp theo"
                                    aria-label="Chuyển sang bước tiếp theo"
                                    onClick={() => handleRequestMove(c, "next")}
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

      {/* MODAL 1: XÁC NHẬN CHUYỂN GIAI ĐOẠN (TIẾN HOẶC LÙI) */}
      <Modal
        show={Boolean(confirmModalData)}
        onHide={() => setConfirmModalData(null)}
        centered
        backdrop="static"
      >
        {confirmModalData && (
          <>
            <Modal.Header closeButton className="border-0 pb-0">
              <Modal.Title className="h6 fw-bold d-flex align-items-center gap-2">
                {confirmModalData.direction === "prev" ? (
                  <span className="text-warning d-flex align-items-center gap-1.5">
                    <i className="bi bi-arrow-left-circle-fill fs-5" />
                    Xác nhận lùi giai đoạn ứng viên
                  </span>
                ) : (
                  <span className="text-success d-flex align-items-center gap-1.5">
                    <i className="bi bi-arrow-right-circle-fill fs-5" />
                    Xác nhận chuyển giai đoạn ứng viên
                  </span>
                )}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body className="py-3">
              <div className="p-3 rounded-3 bg-surface-2 mb-3 border">
                <div className="fw-bold text-body mb-1">
                  {confirmModalData.candidate.name || confirmModalData.candidate.candidateName}
                </div>
                <div className="small text-muted mb-2">
                  {confirmModalData.candidate.appliedJobTitle || confirmModalData.candidate.role}
                </div>
                <div className="d-flex align-items-center gap-2 small">
                  <Badge bg="secondary" className="bg-opacity-25 text-body px-2.5 py-1.5">
                    {confirmModalData.fromStage}
                  </Badge>
                  <i className={`bi ${confirmModalData.direction === "prev" ? "bi-arrow-left text-warning" : "bi-arrow-right text-success"} fw-bold`} />
                  <Badge bg={confirmModalData.direction === "prev" ? "warning" : "success"} className="px-2.5 py-1.5">
                    {confirmModalData.toStage}
                  </Badge>
                </div>
              </div>

              {/* Cảnh báo đặc biệt nếu ứng viên đang có lịch phỏng vấn */}
              {confirmModalData.activeInterview ? (
                confirmModalData.direction === "prev" ? (
                  <Alert variant="danger" className="small mb-0 border-0 shadow-xs">
                    <div className="d-flex gap-2">
                      <i className="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0" />
                      <div>
                        <strong>Cảnh báo hủy lịch phỏng vấn:</strong>
                        <p className="mb-0 mt-1">
                          Ứng viên đang có một lịch phỏng vấn vào lúc{" "}
                          <strong>{confirmModalData.activeInterview.time || ""} {confirmModalData.activeInterview.date || ""}</strong>.
                          Lùi ứng viên về bước <strong>"{confirmModalData.toStage}"</strong> đồng nghĩa với việc{" "}
                          <span className="text-decoration-underline fw-bold">HỦY lịch phỏng vấn này</span>.
                        </p>
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert variant="info" className="small mb-0 border-0 shadow-xs">
                    <div className="d-flex gap-2">
                      <i className="bi bi-info-circle-fill fs-5 flex-shrink-0" />
                      <div>
                        <strong>Xác nhận hoàn tất phỏng vấn:</strong>
                        <p className="mb-0 mt-1">
                          Ứng viên đang có một lịch phỏng vấn. Việc chuyển lên bước{" "}
                          <strong>"{confirmModalData.toStage}"</strong> đồng nghĩa ứng viên đã hoàn tất phỏng vấn thành công. Trạng thái lịch hẹn sẽ tự động chuyển sang <strong>"Đã hoàn tất"</strong>.
                        </p>
                      </div>
                    </div>
                  </Alert>
                )
              ) : (
                <p className="small text-muted mb-0">
                  {confirmModalData.direction === "prev"
                    ? `Bạn có chắc chắn muốn đưa ứng viên này quay trở lại bước "${confirmModalData.toStage}" không? Hành động này sẽ được ghi nhận vào nhật ký tuyển dụng.`
                    : `Bạn có chắc chắn muốn chuyển ứng viên sang bước "${confirmModalData.toStage}" không?`}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setConfirmModalData(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant={confirmModalData.direction === "prev" ? "warning" : "success"}
                size="sm"
                className="fw-semibold px-3"
                onClick={() =>
                  executeStageChange(
                    confirmModalData.candidate,
                    confirmModalData.toStage,
                    confirmModalData.direction,
                    confirmModalData.activeInterview
                  )
                }
              >
                {confirmModalData.direction === "prev" ? "Xác nhận lùi" : "Xác nhận chuyển"}
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* MODAL 2: GỢI Ý TẠO LỊCH PHỎNG VẤN KHI VỪA VÀO VÒNG PHỎNG VẤN */}
      <Modal
        show={Boolean(interviewPromptCandidate)}
        onHide={handleDismissInterviewPrompt}
        centered
        backdrop="static"
      >
        {interviewPromptCandidate && (
          <>
            <Modal.Header closeButton className="border-0 pb-0">
              <Modal.Title className="h6 fw-bold text-success d-flex align-items-center gap-2">
                <i className="bi bi-calendar-plus-fill fs-5" />
                Lên lịch phỏng vấn cho ứng viên
              </Modal.Title>
            </Modal.Header>

            <Modal.Body className="py-3">
              <p className="small mb-3">
                Ứng viên <strong>{interviewPromptCandidate.name || interviewPromptCandidate.candidateName}</strong> vừa được chuyển vào giai đoạn <strong>Phỏng vấn</strong>.
              </p>
              <div className="border small text-muted d-flex align-items-center gap-2 mb-0 rounded-3 p-2" style={{ backgroundColor: "var(--surface-2)" }}>
                <i className="bi bi-clock-history text-primary fs-5" />
                <span>
                  Bạn có muốn thiết lập thời gian và link phỏng vấn ngay bây giờ để gửi thông báo tới ứng viên không?
                </span>
              </div>
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleDismissInterviewPrompt}
              >
                Để sau (Tạm hoãn)
              </Button>
              <Button
                variant="success"
                size="sm"
                className="fw-semibold px-3"
                onClick={() => {
                  const target = interviewPromptCandidate;
                  setInterviewPromptCandidate(null);
                  if (onInviteCandidate) {
                    onInviteCandidate(target);
                  }
                }}
              >
                <i className="bi bi-calendar-event me-1.5" />
                Lên lịch ngay
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
}
