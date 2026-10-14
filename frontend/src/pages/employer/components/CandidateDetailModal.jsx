import { useEffect, useState } from "react";
import {
  Modal, Button, Badge, Row, Col, Form, Alert
} from "react-bootstrap";
import { STAGES_PIPELINE } from "../../../mock";
import { mockStore } from "../../../services/mockStore";

export default function CandidateDetailModal({
  candidate: supplied,
  show,
  onHide,
  onInviteInterview,
  onStageChange,
  onRejectCandidate
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRejecting(false);
    setReason("");
    setError("");
  }, [show, supplied?.id]);

  const candidate = supplied &&
    mockStore.getCandidates().find(
      item => String(item.id) === String(supplied.id)
    );

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

  const app = mockStore.getApplications().find(item =>
    String(item.candidateId) === String(candidate.id) &&
    String(item.jobId) === String(candidate.appliedJobId)
  );

  const displayName = candidate.name || candidate.candidateName || "Ứng viên";
  const displayRole = candidate.appliedJobTitle || candidate.role || candidate.candidateRole || "Chưa cập nhật";
  const score = candidate.matchScore ?? candidate.match;
  const hasScore = score != null && String(score).trim() !== "" && Number.isFinite(Number(score));

  async function changeStage(value) {
    if (saving || closed) return;
    if (/từ chối|không phù hợp/i.test(value)) { setRejecting(true); return; }
    setSaving(true);
    setError("");
    try { await onStageChange(candidate.id, value); }
    catch (err) { setError(err?.message || "Không thể chuyển giai đoạn."); }
    finally { setSaving(false); }
  }

  async function reject(event) {
    event.preventDefault();
    if (saving || closed) return;
    if (!reason.trim()) { setError("Nhập lý do từ chối."); return; }
    setSaving(true);
    setError("");
    try {
      await onRejectCandidate(candidate.id, reason.trim());
      setRejecting(false);
    } catch (err) { setError(err?.message || "Không thể từ chối hồ sơ."); }
    finally { setSaving(false); }
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
          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0" style={{width: 52, height: 52, backgroundColor: "var(--primary)"}}>{candidate.initials || candidate.candidateInitials || displayName.slice(0, 2).toUpperCase()}</div>
          <div>
          <Modal.Title className="fs-5">
            {displayName}
          </Modal.Title>
          <small className="text-muted">
            {displayRole} · {candidate.experience || "Chưa cập nhật kinh nghiệm"}
          </small>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {closed && (
          <Alert variant="secondary">
            {candidate.stage}.{" "}
            {candidate.withdrawReason || candidate.rejectReason}
          </Alert>
        )}

        <div className="d-flex flex-wrap justify-content-between gap-3 border rounded p-3 mb-3">
          <div>
            <small className="text-muted">
              Mức độ phù hợp
            </small>
            <div>
              {hasScore
                ? `${score}% (điểm demo)`
                : "Chưa có điểm đối chiếu"}
            </div>
          </div>

          <Form.Select
            style={{ width: "auto" }}
            aria-label="Giai đoạn hồ sơ"
            disabled={closed || saving || busy}
            value={candidate.stage || "Mới"}
            onChange={event =>
              changeStage(event.target.value)
            }
          >
            {STAGES_PIPELINE.map(stage => (
              <option key={stage}>{stage}</option>
            ))}
            {!STAGES_PIPELINE.includes("Đã từ chối") && <option>Đã từ chối</option>}
            {candidate.stage && ![...STAGES_PIPELINE, "Đã từ chối"].includes(candidate.stage) && <option>{candidate.stage}</option>}
          </Form.Select>
        </div>

        <div className="alert alert-success small">
          <strong>{candidate.appliedJobTitle}</strong>
          {" · "}Ngày nộp: {candidate.appliedDate}
        </div>

        {candidate.bio && (
          <p style={{ whiteSpace: "pre-wrap" }}>
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

        <h6>Kỹ năng</h6>
        <div className="d-flex flex-wrap gap-2 mb-4">
          {Array.isArray(candidate.skills) &&
          candidate.skills.length ? (
            candidate.skills.map((skill, index) => (
              <Badge key={index} bg="secondary">
                {skill}
              </Badge>
            ))
          ) : (
            <small className="text-muted">
              Chưa cập nhật
            </small>
          )}
        </div>

        <h6>Kinh nghiệm & dự án</h6>

        {Array.isArray(candidate.workHistory) &&
        candidate.workHistory.length ? (
          candidate.workHistory.map((work, index) => (
            <div
              className="border rounded p-3 mb-2"
              key={index}
            >
              <strong>
                {work.period} · {work.role}
              </strong>
              <p className="small mb-0">{work.desc}</p>
            </div>
          ))
        ) : (
          <p className="small text-muted">Chưa cập nhật</p>
        )}

        {app?.coverLetter && (
          <>
            <h6>Thư giới thiệu đã gửi</h6>
            <p
              className="small"
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere"
              }}
            >
              {app.coverLetter}
            </p>
          </>
        )}

        {rejecting && (
          <Form
            onSubmit={reject}
            className="border border-danger rounded p-3 mt-3"
          >
            <Form.Label>
              Lý do từ chối gửi cho ứng viên
            </Form.Label>

            <Form.Control
              as="textarea"
              required
              maxLength={1000}
              disabled={saving}
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
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
          disabled={
            busy || saving ||
            Boolean(candidate.withdrawnAt) ||
            !app?.cvId
          }
          onClick={async () => {
            setBusy(true);
            setError("");

            try {
              await mockStore.downloadSubmittedCV(
                candidate.id
              );
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Đang tải…"
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
            Mời phỏng vấn
          </Button>

          <Button variant="secondary" disabled={saving || busy} onClick={onHide}>
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}