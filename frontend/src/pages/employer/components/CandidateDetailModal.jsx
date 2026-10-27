import { useEffect, useState } from "react";
import {
  Modal, Button, Row, Col, Form, Alert
} from "react-bootstrap";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";
import { applicationService } from "../../../services";
import { IS_API } from "../../../services/dataMode";
import MatchingResultPanel from "../../../components/matching/MatchingResultPanel";

export default function CandidateDetailModal({
  candidate: supplied,
  show,
  onHide,
  onInviteInterview,
  onStageChange,
  onRejectCandidate,
  onMatchingCompleted
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const suppliedApplicationId = supplied?.applicationId
    || (supplied?.candidateId && supplied?.id ? supplied.id : null);
  const suppliedCandidateId = supplied?.candidateId || supplied?.id;
  const candidate = supplied && {
    ...(!IS_API && mockStore.getCandidates().find(
      item => String(item.id) === String(suppliedCandidateId)
    ) || {}),
    ...supplied
  };
  const mockApplication = !IS_API && supplied && mockStore.getApplications().find(item => {
    if (suppliedApplicationId && String(item.applicationId || item.id) === String(suppliedApplicationId)) {
      return true;
    }
    const candidateId = supplied?.candidateId || supplied?.id;
    const jobId = supplied?.jobId || supplied?.appliedJobId;
    return candidateId && String(item.candidateId) === String(candidateId)
      && (!jobId || String(item.jobId) === String(jobId));
  });
  const matchingApplicationId = suppliedApplicationId
    || mockApplication?.applicationId
    || mockApplication?.id
    || candidate?.applicationId;
  useEffect(() => {
    setRejecting(false); setReason(""); setError(""); setHistory([]);
    if (!show || !matchingApplicationId) return;
    let active = true;
    applicationService.getApplicationHistory(matchingApplicationId)
      .then(items => { if (active) setHistory(items); })
      .catch(() => { if (active) setHistory([]); });
    return () => { active = false; };
  }, [show, matchingApplicationId]);

  if (!candidate) {
    return (
      <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
          Hồ sơ không còn khả dụng
        </Modal.Header>
        <Modal.Body>
          Kiểm tra lại tài khoản và danh sách hồ sơ.
        </Modal.Body>
      </Modal>
    );
  }

  const closed =
    Boolean(candidate.withdrawnAt) ||
    /đã rút|từ chối|không phù hợp/i.test(
      candidate.stage || ""
    );

  const app = suppliedApplicationId ? supplied : (mockApplication || (supplied?.cvId ? supplied : null));

  const displayName = candidate.name || candidate.candidateName || "Ứng viên";
  const displayRole = candidate.appliedJobTitle || candidate.role || candidate.candidateRole || "Chưa cập nhật";
  async function changeStage(value) {
    if (saving || closed) return;
    if (/từ chối|không phù hợp/i.test(value)) { setRejecting(true); return; }
    setSaving(true);
    setError("");
    try {
      if (!matchingApplicationId) throw new Error("Không xác định được Application ID cho hồ sơ này.");
      await onStageChange(matchingApplicationId, value, candidate.candidateId || candidate.id);
      // Reload history
      const updatedHistory = await applicationService.getApplicationHistory(matchingApplicationId);
      if (Array.isArray(updatedHistory)) setHistory(updatedHistory);
    } catch (err) {
      setError(err?.message || "Không thể chuyển giai đoạn.");
    } finally {
      setSaving(false);
    }
  }

  async function reject(event) {
    event.preventDefault();
    if (saving || closed) return;
    if (!reason.trim()) { setError("Nhập lý do từ chối."); return; }
    setSaving(true);
    setError("");
    try {
      if (!matchingApplicationId) throw new Error("Không xác định được Application ID cho hồ sơ này.");
      await onRejectCandidate(matchingApplicationId, reason.trim(), candidate.candidateId || candidate.id);
      setRejecting(false);
      const updatedHistory = await applicationService.getApplicationHistory(matchingApplicationId);
      if (Array.isArray(updatedHistory)) setHistory(updatedHistory);
    } catch (err) {
      setError(err?.message || "Không thể từ chối hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      show={show}
      onHide={saving || busy ? () => {} : onHide}
      size="lg"
      centered
      scrollable
    >
      <Modal.Header closeButton={!saving && !busy}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0 shadow-sm"
            style={{ width: 52, height: 52, backgroundColor: "var(--primary)" }}
          >
            {candidate.initials || candidate.candidateInitials || displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <Modal.Title className="fs-5">
              {displayName}
            </Modal.Title>
            <small className="text-muted">
              {displayRole} · {candidate.experience || candidate.candidateHeadline || "Chưa cập nhật kinh nghiệm"}
            </small>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {closed && (
          <Alert variant="secondary">
            {candidate.stage}. {candidate.withdrawReason || candidate.rejectReason}
          </Alert>
        )}

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 border rounded p-3 mb-3 bg-surface-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Giai đoạn:</span>
            <Form.Select
              style={{ width: "auto" }}
              aria-label="Giai đoạn hồ sơ"
              disabled={closed || saving || busy || !matchingApplicationId}
              value={candidate.stage || "Mới"}
              onChange={event => changeStage(event.target.value)}
            >
              {STAGES_PIPELINE.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
              <option value="Đã tuyển dụng">Đã tuyển dụng</option>
              <option value="Từ chối">Từ chối</option>
            </Form.Select>
          </div>
        </div>

        <MatchingResultPanel applicationId={matchingApplicationId} active={show} onCompleted={onMatchingCompleted} />

        <div className="alert alert-success small d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <strong>{candidate.appliedJobTitle || candidate.jobTitle}</strong>
            {" · "}Ngày nộp: {candidate.appliedDate || "Gần đây"}
          </div>
          {candidate.cvSnapshotUrl && (
            <a
              href={candidate.cvSnapshotUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline-success bg-white text-decoration-none"
            >
              <i className="bi bi-file-earmark-pdf me-1"></i>Xem CV nộp kèm
            </a>
          )}
        </div>

        {candidate.bio && (
          <p style={{ whiteSpace: "pre-wrap" }} className="mb-3">
            {candidate.bio}
          </p>
        )}

        <Row className="g-3 mb-4">
          {[
            ["Email", candidate.email || candidate.candidateEmail],
            ["Điện thoại", candidate.phone || candidate.candidatePhone],
            ["Địa điểm", candidate.location],
            ["Học vấn", candidate.education]
          ].map(([label, value]) => (
            <Col sm={6} key={label}>
              <small className="text-muted">{label}</small>
              <div style={{ overflowWrap: "anywhere" }}>
                {value || "Chưa cập nhật"}
              </div>
            </Col>
          ))}
        </Row>

        <h6>Kỹ năng chuyên môn</h6>
        <div className="d-flex flex-wrap gap-1 mb-4">
          {Array.isArray(candidate.skills) && candidate.skills.length ? (
            candidate.skills.map((skill, index) => (
              <span key={index} className="candidate-skill-badge">
                {skill}
              </span>
            ))
          ) : (
            <small className="text-muted">Chưa cập nhật</small>
          )}
        </div>

        {Array.isArray(candidate.workHistory) && candidate.workHistory.length > 0 && (
          <>
            <h6>Kinh nghiệm làm việc</h6>
            {candidate.workHistory.map((work, index) => (
              <div className="border rounded p-3 mb-2 bg-surface" key={index}>
                <strong>{work.period} · {work.role}</strong>
                <p className="small mb-0 text-muted">{work.desc}</p>
              </div>
            ))}
          </>
        )}

        {(candidate.coverLetter || app?.coverLetter) && (
          <div className="mb-4">
            <h6>Thư giới thiệu ứng viên (Cover Letter)</h6>
            <div
              className="small p-3 rounded border bg-surface-2"
              style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {candidate.coverLetter || app.coverLetter}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold mb-2 small text-uppercase text-muted">
              <i className="bi bi-clock-history me-1"></i>Lịch sử trạng thái ứng tuyển
            </h6>
            <div className="border rounded p-2 bg-surface small">
              {history.map((h, idx) => (
                <div key={h.id || idx} className="d-flex justify-content-between py-1 border-bottom last-border-0">
                  <span>
                    <strong className="text-secondary">{h.fromStage || "Mới"}</strong> &rarr; <strong className="text-success">{h.toStage}</strong>
                    {h.reason && <span className="text-muted ms-2">({h.reason})</span>}
                  </span>
                  <span className="text-muted">{h.createdAt ? new Date(h.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rejecting && (
          <Form
            onSubmit={reject}
            className="border border-danger rounded p-3 mt-3 bg-danger bg-opacity-10"
          >
            <Form.Label className="fw-bold text-danger">
              Lý do từ chối gửi cho ứng viên
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              maxLength={1000}
              disabled={saving}
              value={reason}
              placeholder="Nhập lý do từ chối phù hợp để gửi thông báo cho ứng viên..."
              onChange={event => setReason(event.target.value)}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={saving}
                onClick={() => setRejecting(false)}
              >
                Quay lại
              </Button>
              <Button
                size="sm"
                disabled={saving}
                type="submit"
                variant="danger"
              >
                Xác nhận từ chối
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-between gap-2">
        <Button
          variant="outline-success"
          disabled={busy || saving || Boolean(candidate.withdrawnAt) || (!candidate.cvSnapshotUrl && !app?.cvId)}
          onClick={async () => {
            if (candidate.cvSnapshotUrl) {
              window.open(candidate.cvSnapshotUrl, "_blank");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await mockStore.downloadSubmittedCV(candidate.candidateId || candidate.id);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Đang tải…"
            : candidate.cvSnapshotUrl
            ? "Xem tệp CV"
            : app?.cvName
            ? `Tải CV: ${app.cvName}`
            : "Đơn chưa có tệp CV"}
        </Button>

        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="outline-danger"
            disabled={closed || saving || busy}
            onClick={() => setRejecting(true)}
          >
            Từ chối
          </Button>

          <Button
            variant="success"
            disabled={closed || saving || busy}
            onClick={() => {
              onHide();
              onInviteInterview?.(candidate);
            }}
          >
            <i className="bi bi-calendar-event me-1"></i>Mời phỏng vấn
          </Button>

          <Button variant="secondary" disabled={saving || busy} onClick={onHide}>
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
