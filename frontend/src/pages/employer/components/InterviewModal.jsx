import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function InterviewModal({ show, onHide, candidates = [], onScheduleCreated, defaultCandidate = null, existingInterview = null }) {
  const { showToast } = useToast();

  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [role, setRole] = useState("Senior Product Designer");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("Phỏng vấn chuyên môn (Google Meet)");
  const [interviewers, setInterviewers] = useState("Nguyễn Lan Anh (Lead HR) + Tech Lead");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/mj-interview-demo");
  const [note, setNote] = useState("Phỏng vấn vòng chuyên môn kỹ thuật và trao đổi định hướng.");

  useEffect(() => {
    if (defaultCandidate) {
      setSelectedCandidate(String(defaultCandidate.id));
      setRole(defaultCandidate.appliedJobTitle || defaultCandidate.role || "Senior Product Designer");
    } else if (candidates.length > 0) {
      setSelectedCandidate(String(candidates[0].id));
      setRole(candidates[0].appliedJobTitle || candidates[0].role || "Senior Product Designer");
    }
  }, [defaultCandidate, show, candidates]);

  useEffect(() => {
    if (!show) return;
    setDate(existingInterview?.date && /^\d{4}-\d{2}-\d{2}$/.test(existingInterview.date) ? existingInterview.date : "");
    setTime(existingInterview?.time || "");
    if (existingInterview) {setType(existingInterview.type);setInterviewers(existingInterview.people || "");setMeetingLink(existingInterview.meetingLink || "");setNote(existingInterview.note || "");}
  }, [show, existingInterview]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const candidateObj = candidates.find((c) => String(c.id) === selectedCandidate) || defaultCandidate;

    if (!candidateObj || ["Đã rút", "Đã từ chối"].includes(candidateObj.stage)) { showToast("Chọn hồ sơ đang tham gia tuyển dụng."); return; }
    if (new Date(`${date}T${time}`) <= new Date()) { showToast("Chọn thời gian phỏng vấn trong tương lai."); return; }
    const payload = {
      candidateId: candidateObj?.id,
      candidate: candidateObj?.name,
      jobId: candidateObj?.appliedJobId || "JOB-2048",
      role,
      date,
      time,
      type,
      people: interviewers,
      meetingLink: type.includes("Meet") || type.includes("Teams") ? meetingLink : "",
      status: "Chờ xác nhận",
      note,
      candidateResponse: "",
      candidateNote: ""
    };
    let newInterview;
    if(existingInterview) {
      mockStore.updateInterview(existingInterview.id, payload);
      newInterview = {...existingInterview, ...payload};
    } else newInterview = mockStore.createInterview(payload);

    if (onScheduleCreated) onScheduleCreated(newInterview);
    showToast(`Đã lên lịch phỏng vấn thành công với ${candidateObj?.name} vào lúc ${time} ngày ${date}`);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-calendar-plus text-success me-2"></i>{existingInterview ? "Đổi lịch phỏng vấn" : "Tạo lịch phỏng vấn mới"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Ứng viên tham gia</Form.Label>
            <Form.Select
              disabled={Boolean(existingInterview)}
              value={selectedCandidate}
              onChange={(e) => {
                const cName = e.target.value;
                setSelectedCandidate(cName);
                const found = candidates.find((c) => String(c.id) === cName);
                if (found) setRole(found.appliedJobTitle || found.role);
              }}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.appliedJobTitle || c.role} ({c.match}% match)
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Vị trí ứng tuyển</Form.Label>
            <Form.Control
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </Form.Group>

          <Row className="g-2 mb-3">
            <Col sm={6}>
              <Form.Label className="small fw-semibold">Ngày phỏng vấn</Form.Label>
              <Form.Control
                type="date"
                min={new Date().toLocaleDateString("sv-SE")}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <Form.Label className="small fw-semibold">Giờ bắt đầu</Form.Label>
              <Form.Control
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Hình thức phỏng vấn</Form.Label>
            <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Phỏng vấn chuyên môn (Google Meet)">Google Meet (Trực tuyến)</option>
              <option value="Trực tiếp tại văn phòng FPT Tân Thuận">Trực tiếp tại văn phòng FPT Tân Thuận</option>
              <option value="Phỏng vấn Microsoft Teams">Microsoft Teams</option>
              <option value="Phỏng vấn qua điện thoại">Phỏng vấn qua điện thoại</option>
            </Form.Select>
          </Form.Group>

          {type.includes("Meet") || type.includes("Teams") ? (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Link phòng họp trực tuyến</Form.Label>
              <Form.Control
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </Form.Group>
          ) : null}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Hội đồng phỏng vấn (Người tham gia)</Form.Label>
            <Form.Control
              type="text"
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold">Ghi chú cho ứng viên & hội đồng</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Hủy
          </Button>
          <Button variant="success" type="submit" className="fw-bold">
            Xác nhận tạo lịch
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
