import { useEffect, useState } from "react";
import {
  Modal, Button, Form, Row, Col, Alert
} from "react-bootstrap";
import { mockStore } from "../../../services/mockStore";

export default function InterviewModal({
  show,
  onHide,
  candidates = [],
  onScheduleCreated,
  defaultCandidate
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setForm({
        candidateId: String(defaultCandidate?.id || ""),
        date: "",
        time: "09:00",
        type: "Google Meet (Trực tuyến)",
        meetingLink: "",
        people: "",
        note: ""
      });
      setError("");
    }
  }, [show, defaultCandidate?.id]);

  const eligible = candidates.filter(candidate =>
    !candidate.withdrawnAt &&
    !/đã rút|từ chối|không phù hợp/i.test(
      candidate.stage || ""
    )
  );

  const selected = eligible.find(
    candidate => String(candidate.id) === form.candidateId
  );

  const online = /Meet|Teams|trực tuyến/i.test(
    form.type || ""
  );

  const change = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      if (!selected) {
        throw new Error("Chọn hồ sơ ứng tuyển hợp lệ.");
      }

      const item = mockStore.createInterview({
        ...form,
        candidateId: selected.id,
        meetingLink: online ? form.meetingLink.trim() : ""
      });

      onScheduleCreated?.(item);
      onHide();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          Tạo lịch phỏng vấn
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={submit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Hồ sơ ứng viên</Form.Label>
            <Form.Select
              required
              value={form.candidateId || ""}
              onChange={event =>
                change("candidateId", event.target.value)
              }
            >
              <option value="">Chọn hồ sơ</option>

              {eligible.map(candidate => (
                <option
                  key={candidate.id}
                  value={candidate.id}
                >
                  {candidate.name} —{" "}
                  {candidate.appliedJobTitle || candidate.role}
                  {" — #"}{candidate.id}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="small text-muted mb-3">
            {selected?.appliedJobTitle ||
              "Mỗi lịch gắn với một hồ sơ ứng tuyển cụ thể."}
          </div>

          <Row className="g-3 mb-3">
            {[
              ["date", "Ngày", "date"],
              ["time", "Giờ Việt Nam", "time"]
            ].map(([key, label, type]) => (
              <Col sm={6} key={key}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  required
                  type={type}
                  value={form[key] || ""}
                  onChange={event =>
                    change(key, event.target.value)
                  }
                />
              </Col>
            ))}
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Hình thức</Form.Label>
            <Form.Select
              value={form.type || "Google Meet (Trực tuyến)"}
              onChange={event =>
                change("type", event.target.value)
              }
            >
              {[
                "Google Meet (Trực tuyến)",
                "Microsoft Teams",
                "Trực tiếp tại văn phòng",
                "Qua điện thoại"
              ].map(type => (
                <option key={type}>{type}</option>
              ))}
            </Form.Select>
          </Form.Group>

          {online && (
            <Form.Group className="mb-3">
              <Form.Label>Link phòng họp</Form.Label>
              <Form.Control
                required
                type="url"
                value={form.meetingLink || ""}
                onChange={event =>
                  change("meetingLink", event.target.value)
                }
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Hội đồng phỏng vấn</Form.Label>
            <Form.Control
              maxLength={200}
              value={form.people || ""}
              onChange={event =>
                change("people", event.target.value)
              }
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>
              Ghi chú / địa chỉ gặp mặt / hướng dẫn gọi điện
            </Form.Label>
            <Form.Control
              as="textarea"
              required={!online}
              maxLength={1000}
              rows={3}
              value={form.note || ""}
              onChange={event =>
                change("note", event.target.value)
              }
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Hủy
          </Button>
          <Button type="submit" variant="success">
            Gửi lịch chờ xác nhận
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}