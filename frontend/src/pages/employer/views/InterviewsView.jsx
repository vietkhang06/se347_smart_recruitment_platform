import { useState } from "react";
import {
  Card, Table, Button, Badge, Modal, Form, Alert
} from "react-bootstrap";
import {
  mockStore,
  interviewTime,
  interviewClosed,
  safeMeetingLink
} from "../../../services/mockStore";

export default function InterviewsView({
  interviews = [],
  setInterviews,
  onOpenInterviewModal
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const list = interviews.filter(item =>
    (!status || item.status === status) &&
    (!date || item.date === date) &&
    `${item.candidate} ${item.role}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  const pages = Math.max(1, Math.ceil(list.length / 10));
  const current = Math.min(page, pages);

  function run(action) {
    setError("");
    setMessage("");

    try {
      action();
      setInterviews(mockStore.getInterviews());
      setMessage("Đã lưu thay đổi.");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  function save(event) {
    event.preventDefault();

    const saved = run(() =>
      mockStore.updateInterview(
        editing.id,
        {
          date: editing.date,
          time: editing.time,
          people: editing.people,
          meetingLink: editing.meetingLink,
          note: editing.note
        },
        editing.scheduleVersion || 1
      )
    );

    if (saved) setEditing(null);
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <div>
          <h5 className="fw-bold">
            Quản lý lịch phỏng vấn ({interviews.length})
          </h5>
          <p className="small text-muted mb-0">
            Phản hồi ứng viên và lịch sử được giữ cùng
            buổi phỏng vấn. Giờ Việt Nam.
          </p>
        </div>

        <Button
          variant="success"
          onClick={onOpenInterviewModal}
        >
          Tạo lịch phỏng vấn
        </Button>
      </div>

      {error && !editing && !cancel && (
        <Alert variant="danger">{error}</Alert>
      )}

      {message && (
        <Alert variant="success">{message}</Alert>
      )}

      <Card className="matcha-card p-3 p-md-4 border-0 shadow-sm">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <Form.Control
            style={{ flex: "1 1 220px" }}
            aria-label="Tìm lịch"
            placeholder="Tìm ứng viên, vị trí…"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />

          <Form.Select
            style={{ width: "auto" }}
            aria-label="Trạng thái lịch"
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {[
              "Sắp diễn ra",
              "Chờ xác nhận",
              "Đã xác nhận",
              "Đề nghị đổi lịch",
              "Hoàn tất",
              "Đã hủy"
            ].map(value => (
              <option key={value}>{value}</option>
            ))}
          </Form.Select>

          <Form.Control
            style={{ width: "auto" }}
            type="date"
            aria-label="Lọc ngày"
            value={date}
            onChange={event => {
              setDate(event.target.value);
              setPage(1);
            }}
          />

          <Button
            variant="outline-secondary"
            onClick={() => {
              setQuery("");
              setStatus("");
              setDate("");
              setPage(1);
            }}
          >
            Xóa lọc
          </Button>
        </div>

        <div className="table-responsive">
          <Table hover className="matcha-table align-middle">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Ứng viên / vị trí</th>
                <th>Hình thức / hội đồng</th>
                <th>Trạng thái & phản hồi</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {!list.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-4 text-muted"
                  >
                    Không có lịch phù hợp.
                  </td>
                </tr>
              )}

              {list
                .slice((current - 1) * 10, current * 10)
                .map(item => (
                  <tr key={item.id}>
                    <td className="text-nowrap">
                      <strong>{item.time}</strong>
                      <div>{item.date}</div>

                      {!Number.isFinite(
                        interviewTime(item)
                      ) && (
                        <small className="text-warning">
                          Cần cập nhật ngày đầy đủ
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>{item.candidate}</strong>
                      <div className="small text-muted">
                        {item.role}
                      </div>
                    </td>

                    <td>
                      <div>{item.type}</div>
                      <small>{item.people}</small>

                      {safeMeetingLink(item.meetingLink) &&
                        !interviewClosed(item) && (
                          <a
                            className="d-block"
                            href={safeMeetingLink(
                              item.meetingLink
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Mở phòng họp
                          </a>
                        )}
                    </td>

                    <td style={{ minWidth: 220 }}>
                      <Badge
                        bg={
                          item.status === "Đề nghị đổi lịch"
                            ? "warning"
                            : item.status === "Đã xác nhận"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>

                      <div
                        className="small mt-2"
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere"
                        }}
                      >
                        {item.candidateResponse
                          ? `${
                              item.candidateResponse.type ===
                              "confirmed"
                                ? "Ứng viên xác nhận"
                                : "Ứng viên đề nghị đổi lịch"
                            }: ${
                              item.candidateResponse.note ||
                              "Không có ghi chú"
                            }`
                          : "Chưa có phản hồi ứng viên"}
                      </div>

                      {item.cancelReason && (
                        <div className="small text-danger">
                          {item.cancelReason}
                        </div>
                      )}

                      {!!item.responseHistory?.length && (
                        <details className="small mt-2">
                          <summary>Lịch sử phản hồi</summary>
                          {item.responseHistory.map(
                            (response, index) => (
                              <p key={index}>
                                Lịch v{response.version}
                                {" · "}
                                {response.type === "confirmed"
                                  ? "Xác nhận"
                                  : "Đề nghị đổi lịch"}
                                <br />
                                {response.note}
                              </p>
                            )
                          )}
                        </details>
                      )}
                    </td>

                    <td>
                      <div
                        className="d-flex flex-column gap-2"
                        style={{ minWidth: 115 }}
                      >
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={interviewClosed(item)}
                          onClick={() => {
                            setEditing({
                              ...item,
                              date:
                                /^\d{4}-\d{2}-\d{2}$/.test(
                                  item.date
                                )
                                  ? item.date
                                  : "",
                              meetingLink:
                                item.meetingLink || "",
                              note: item.note || ""
                            });
                            setError("");
                          }}
                        >
                          Điều chỉnh
                        </Button>

                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={
                            interviewClosed(item) ||
                            !Number.isFinite(
                              interviewTime(item)
                            ) ||
                            interviewTime(item) > Date.now()
                          }
                          onClick={() =>
                            run(() =>
                              mockStore.updateInterview(
                                item.id,
                                { status: "Hoàn tất" },
                                item.scheduleVersion || 1
                              )
                            )
                          }
                        >
                          Hoàn tất
                        </Button>

                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={interviewClosed(item)}
                          onClick={() => {
                            setCancel(item);
                            setReason("");
                            setError("");
                          }}
                        >
                          Hủy lịch
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <small>
            {list.length} lịch · Trang {current}/{pages}
          </small>

          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        show={Boolean(editing)}
        onHide={() => setEditing(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            Điều chỉnh lịch
          </Modal.Title>
        </Modal.Header>

        {editing && (
          <Form onSubmit={save}>
            <Modal.Body>
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              <p>
                {editing.candidate} · {editing.role}
              </p>
              <p className="small text-muted">
                Đổi nội dung lịch sẽ yêu cầu ứng viên
                xác nhận lại.
              </p>

              {[
                ["date", "Ngày", "date"],
                ["time", "Giờ Việt Nam", "time"],
                ["meetingLink", "Link phòng họp", "url"],
                ["people", "Hội đồng", "text"]
              ].map(([key, label, type]) => (
                <Form.Group className="mb-3" key={key}>
                  <Form.Label>{label}</Form.Label>
                  <Form.Control
                    type={type}
                    required={
                      key === "date" || key === "time"
                    }
                    value={editing[key] || ""}
                    onChange={event =>
                      setEditing({
                        ...editing,
                        [key]: event.target.value
                      })
                    }
                  />
                </Form.Group>
              ))}

              <Form.Label>
                Ghi chú / địa chỉ gặp mặt
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={1000}
                value={editing.note}
                onChange={event =>
                  setEditing({
                    ...editing,
                    note: event.target.value
                  })
                }
              />
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setEditing(null)}
              >
                Đóng
              </Button>
              <Button type="submit" variant="success">
                Lưu lịch
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      <Modal
        show={Boolean(cancel)}
        onHide={() => setCancel(null)}
        centered
      >
        <Form
          onSubmit={event => {
            event.preventDefault();

            if (
              run(() =>
                mockStore.cancelInterview(
                  cancel.id,
                  reason
                )
              )
            ) {
              setCancel(null);
            }
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title className="fs-5">
              Xác nhận hủy lịch
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {error && (
              <Alert variant="danger">{error}</Alert>
            )}

            <p>
              {cancel?.candidate} ·{" "}
              {cancel?.date} {cancel?.time}
            </p>

            <Form.Label>
              Lý do gửi cho ứng viên
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
            <small>Lịch vẫn được giữ trong lịch sử.</small>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setCancel(null)}
            >
              Quay lại
            </Button>
            <Button type="submit" variant="danger">
              Hủy lịch
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}