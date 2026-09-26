import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function InterviewModal({ show, onHide, candidates = [], onScheduleCreated, defaultCandidate = null }) {
  const { showToast } = useToast();

  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [role, setRole] = useState("Senior Product Designer");
  const [date, setDate] = useState("22/09");
  const [time, setTime] = useState("14:00");
  const [type, setType] = useState("Google Meet (Trực tuyến)");
  const [interviewers, setInterviewers] = useState("Nguyễn Lan Anh (Lead HR) + Tech Lead");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/mj-interview-demo");
  const [note, setNote] = useState("Phỏng vấn vòng chuyên môn kỹ thuật và trao đổi định hướng.");

  useEffect(() => {
    if (defaultCandidate) {
      setSelectedCandidate(defaultCandidate.name);
      setRole(defaultCandidate.appliedJobTitle || defaultCandidate.role || "Senior Product Designer");
    } else if (candidates.length > 0) {
      setSelectedCandidate(candidates[0].name);
      setRole(candidates[0].appliedJobTitle || candidates[0].role || "Senior Product Designer");
    }
  }, [defaultCandidate, show, candidates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const candidateObj = candidates.find((c) => c.name === selectedCandidate) || defaultCandidate;

    const newInterview = mockStore.createInterview({
      candidateId: candidateObj?.id,
      candidate: selectedCandidate,
      jobId: candidateObj?.appliedJobId || "JOB-2048",
      role,
      date,
      time,
      type,
      people: interviewers,
      meetingLink: type.includes("Meet") || type.includes("Teams") ? meetingLink : "",
      status: "Đã xác nhận",
      note
    });

    if (onScheduleCreated) onScheduleCreated(newInterview);
    showToast(`Đã lên lịch phỏng vấn thành công với ${selectedCandidate} vào lúc ${time} ngày ${date}`);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-calendar-plus text-success me-2"></i>Tạo lịch phỏng vấn mới
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Ứng viên tham gia</Form.Label>
            <Form.Select
              value={selectedCandidate}
              onChange={(e) => {
                const cName = e.target.value;
                setSelectedCandidate(cName);
                const found = candidates.find((c) => c.name === cName);
                if (found) setRole(found.appliedJobTitle || found.role);
              }}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.name}>
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
                type="text"
                placeholder="DD/MM (ví dụ 22/09)"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <Form.Label className="small fw-semibold">Giờ bắt đầu</Form.Label>
              <Form.Control
                type="text"
                placeholder="HH:mm (ví dụ 14:00)"
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
