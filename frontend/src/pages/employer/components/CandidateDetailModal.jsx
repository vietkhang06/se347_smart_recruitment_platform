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

  const hasScore =
    candidate.match != null &&
    candidate.match !== "" &&
    Number.isFinite(Number(candidate.match));

  function changeStage(value) {
    if (value === "Đã từ chối") {
      setRejecting(true);
      return;
    }

    try {
      onStageChange(candidate.id, value);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  function reject(event) {
    event.preventDefault();

    try {
      if (!reason.trim()) {
        throw new Error("Nhập lý do từ chối.");
      }

      onRejectCandidate(candidate.id, reason.trim());
      setRejecting(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      scrollable
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title className="fs-5">
            {candidate.name}
          </Modal.Title>
          <small className="text-muted">
            {candidate.role} · {candidate.experience}
          </small>
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
                ? `${candidate.match}% (điểm demo)`
                : "Chưa có điểm đối chiếu"}
            </div>
          </div>

          <Form.Select
            style={{ width: "auto" }}
            aria-label="Giai đoạn hồ sơ"
            disabled={closed}
            value={candidate.stage || "Mới"}
            onChange={event =>
              changeStage(event.target.value)
            }
          >
            {STAGES_PIPELINE.map(stage => (
              <option key={stage}>{stage}</option>
            ))}
            <option>Đã từ chối</option>
            {candidate.stage === "Đã rút" && (
              <option>Đã rút</option>
            )}
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
            ["Email", candidate.email],
            ["Điện thoại", candidate.phone],
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
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
            />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRejecting(false)}
              >
                Quay lại
              </Button>

              <Button
                size="sm"
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
            busy ||
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
            disabled={closed}
            onClick={() => setRejecting(true)}
          >
            Từ chối
          </Button>

          <Button
            variant="success"
            disabled={closed}
            onClick={() => {
              onHide();
              onInviteInterview?.(candidate);
            }}
          >
            Mời phỏng vấn
          </Button>

          <Button variant="secondary" onClick={onHide}>
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}