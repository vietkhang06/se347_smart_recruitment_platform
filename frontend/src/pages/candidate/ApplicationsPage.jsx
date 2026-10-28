import { IS_API } from "../../services/dataMode";
import ApiApplications from "../../components/candidate/ApiApplications";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Card, Button, Modal, Form, Badge, Alert } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { applicationService, interviewTime, interviewClosed, safeMeetingLink } from "../../services/applicationService";
import { jobService } from "../../services/jobService";
import { downloadCV } from "../../services/profileService";
import { ownApplications, subscribeCandidate } from "../../services/applicationService";
import CandidateApplyForm from "../../components/candidate/CandidateApplyForm";

const groups = [["all", "Tất cả"], ["active", "Đang xử lý"], ["interview", "Phỏng vấn"], ["offer", "Đề nghị"], ["rejected", "Không phù hợp"], ["withdrawn", "Đã rút"]];
function group(a) {
  if (a.withdrawnAt || a.stage === "Đã rút") return "withdrawn";
  if (/từ chối|không phù hợp/i.test(a.stage || "")) return "rejected";
  return a.stage === "Đề nghị" ? "offer" : a.stage === "Phỏng vấn" ? "interview" : "active";
}
function timeOf(a) {
  if (a.createdAt) return Date.parse(a.createdAt) || 0;
  if (Number(a.id) > 1000000000000) return Number(a.id);
  const [d, m, y] = String(a.date || "").split("/");
  return Date.parse(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+07:00`) || 0;
}
export default function ApplicationsPage() {
  const { user } = useAuth();
  if (user?.role !== "candidate") return <Container className="py-5"><Alert variant="info">Đăng nhập bằng tài khoản ứng viên để xem đơn. <Link to="/login">Đăng nhập</Link></Alert></Container>;
  return IS_API ? <ApiApplications key={user.id || user.email} /> : <Workspace key={user.email} user={user} />;
}
function Workspace({ user }) {
  const [, refresh] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => subscribeCandidate(() => refresh(n => n + 1)), []);
  let apps = [], jobs = [], meetings = [], notifications = [], loadError = "";
  try {
    apps = ownApplications(); jobs = jobService.getJobsSnapshot(); meetings = applicationService.getInterviews();
    notifications = applicationService.getCandidateNotifications();
  } catch (err) { loadError = err.message; }
  const visible = apps.filter(a => (filter === "all" || group(a) === filter) && `${a.title} ${a.company} ${a.id}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "company" ? String(a.company).localeCompare(String(b.company), "vi") : timeOf(b) - timeOf(a));
  const pages = Math.max(1, Math.ceil(visible.length / 6)), current = Math.min(page, pages);
  const openJobs = jobs.filter(j => jobService.isAcceptingApplications(j) && !apps.some(a => String(a.jobId) === String(j.id)));
  function openAction(value) { setAction(value); setNote(""); setError(""); }
  function confirm(e) {
    e.preventDefault(); setError("");
    try {
      if (action.type === "withdraw") applicationService.withdrawApplication(action.id, note);
      else applicationService.respondInterview(action.id, action.type, note, action.version);
      setAction(null); setMessage("Đã lưu phản hồi của bạn.");
    } catch (err) { setError(err.message); }
  }
  if (loadError) return <Container className="py-5"><Alert variant="warning">{loadError}</Alert><Button onClick={() => window.location.reload()}>Tải lại trang</Button></Container>;
  return <Container className="py-5">
    <div className="d-flex flex-wrap justify-content-between gap-3 mb-4"><div><h1 className="fw-bold h2">Theo dõi tiến trình ứng tuyển</h1><p className="text-muted">Hồ sơ đã gửi, phản hồi HR và lịch phỏng vấn của bạn.</p></div><Button as={Link} to="/candidate/profile" variant="outline-success" className="align-self-start">Hồ sơ & CV</Button></div>
    {message && <Alert variant="success" dismissible onClose={() => setMessage("")}>{message}</Alert>}
    {error && !action && <Alert variant="danger">{error}</Alert>}
    <Card className="matcha-card p-3 border-0 shadow-sm mb-4"><details><summary className="fw-semibold">Thông báo tuyển dụng ({notifications.filter(n => !n.read).length} chưa đọc)</summary>
      <Button size="sm" variant="outline-success" className="my-3" disabled={!notifications.some(n => !n.read)} onClick={() => { try { applicationService.markCandidateNotificationsRead(); } catch (err) { setError(err.message); } }}>Đánh dấu tất cả đã đọc</Button>
      {!notifications.length && <p className="small text-muted">Chưa có thông báo.</p>}
      {notifications.slice(0, 30).map(n => <div className="border-top py-2 small" key={n.id}><span className={n.read ? "" : "fw-bold"}>{n.text}</span><div className="text-muted">{new Date(n.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</div></div>)}
    </details></Card>
    <div className="row g-2 mb-4">{groups.map(([key, label]) => <div className="col-6 col-md-4 col-lg-2" key={key}><button className={`matcha-card w-100 text-start p-3 border ${filter === key ? "border-success" : ""}`} style={{ background: "var(--surface)", color: "var(--text)" }} aria-pressed={filter === key} onClick={() => { setFilter(key); setPage(1); }}><small>{label}</small><strong className="d-block fs-3 text-success">{key === "all" ? apps.length : apps.filter(a => group(a) === key).length}</strong></button></div>)}</div>
    <Card className="matcha-card border-0 shadow-sm p-3 mb-4"><h2 className="h6">Gửi đơn ứng tuyển mới</h2><Form.Select aria-label="Chọn công việc để ứng tuyển" value="" onChange={e => setSelected(openJobs.find(j => String(j.id) === e.target.value) || null)}><option value="">{openJobs.length ? "Chọn vị trí để điền hồ sơ…" : "Chưa có vị trí mới để nộp đơn"}</option>{openJobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}</Form.Select><Link className="small mt-2" to="/jobs">Xem mô tả và yêu cầu tuyển dụng →</Link></Card>
    <div className="d-flex flex-wrap gap-2 mb-4"><Form.Control style={{ flex: "1 1 220px" }} aria-label="Tìm đơn" placeholder="Tìm công việc, công ty, mã đơn…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /><Form.Select style={{ width: "auto" }} aria-label="Sắp xếp đơn" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="new">Mới nhất</option><option value="company">Tên công ty</option></Form.Select></div>
    {!visible.length && <Card className="p-4 text-center mb-3"><h2 className="h5">{apps.length ? "Không có đơn phù hợp bộ lọc" : "Bạn chưa gửi đơn ứng tuyển"}</h2><Button variant="outline-success" onClick={() => { setQuery(""); setFilter("all"); }}>Xóa bộ lọc</Button></Card>}
    {visible.slice((current - 1) * 6, current * 6).map(a => {
      const kind = group(a), closed = ["withdrawn", "rejected"].includes(kind);
      const interviews = meetings.filter(i => String(i.candidateId) === String(a.candidateId) && String(i.jobId) === String(a.jobId));
      return <Card key={a.id} className="matcha-card border-0 shadow-sm p-3 p-md-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3"><div><h2 className="h5 fw-bold">{a.title}</h2><small className="text-muted">{a.company} · {a.date} · Mã {a.id}</small></div><Badge className="align-self-start p-2" bg={kind === "rejected" ? "danger" : kind === "offer" ? "success" : "secondary"}>{a.stage || "Đã gửi"}</Badge></div>
        {closed ? <Alert variant="secondary">{kind === "withdrawn" ? `Bạn đã rút đơn. ${a.withdrawReason || ""}` : `Hồ sơ chưa phù hợp. ${a.rejectReason || ""}`}</Alert> : <ol className="row list-unstyled g-2 mb-3" aria-label="Tiến trình ứng tuyển">{["Đã gửi", "Sàng lọc", "Phỏng vấn", "Kết quả"].map((label, index) => <li className="col-6 col-sm-3" key={label}><div className={`border-top border-3 pt-2 small ${Number(a.step || 1) >= index + 1 ? "border-success text-success fw-bold" : "text-muted"}`}>{index + 1}. {label}</div></li>)}</ol>}
        <details className="border rounded p-3"><summary className="fw-semibold">Hồ sơ đã gửi & lịch phỏng vấn ({interviews.length})</summary>
          <p className="small mt-3">{a.candidateName || user.name}<br />{a.candidateEmail || user.email} · {a.candidatePhone || "Chưa cập nhật điện thoại"}</p>
          <div className="small">CV: {a.cvName || "Đơn cũ chưa có tệp CV"}</div>{a.cvId && <Button className="mt-2" size="sm" variant="outline-success" onClick={() => downloadCV(a.cvId).catch(err => setError(err.message))}>Tải CV đã gửi</Button>}
          {a.coverLetter && <p className="small mt-3" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{a.coverLetter}</p>}
          <h3 className="h6 mt-4">Lịch phỏng vấn · Giờ Việt Nam</h3>{!interviews.length && <p className="small text-muted">Chưa có lịch gắn với đơn này.</p>}
          {interviews.map(i => {
            const enabled = !closed && !interviewClosed(i) && interviewTime(i) > Date.now();
            return <div className="border rounded p-3 mt-2" key={i.id}>
              <strong>{i.date} · {i.time} — {i.type}</strong><div className="small text-muted">{i.people} · {i.status}</div>
              <p className="small mt-2" style={{ whiteSpace: "pre-wrap" }}>{i.note}</p>
              {i.cancelReason && <p className="small text-danger">{i.cancelReason}</p>}
              {i.candidateResponse && <p className="small text-success">Phản hồi của bạn: {i.candidateResponse.type === "confirmed" ? "Đã xác nhận tham gia" : "Đề nghị đổi lịch"}. {i.candidateResponse.note}</p>}
              {!Number.isFinite(interviewTime(i)) && <p className="small text-warning">Lịch cũ thiếu ngày đầy đủ. HR cần cập nhật trước khi bạn phản hồi.</p>}
              <div className="d-flex flex-wrap gap-2">{enabled && <><Button size="sm" variant="success" disabled={i.candidateResponse?.type === "confirmed"} onClick={() => openAction({ type: "confirmed", id: i.id, version: i.scheduleVersion || 1 })}>Xác nhận tham gia</Button><Button size="sm" variant="outline-warning" onClick={() => openAction({ type: "reschedule", id: i.id, version: i.scheduleVersion || 1 })}>Đề nghị đổi lịch</Button></>}{!closed && !interviewClosed(i) && safeMeetingLink(i.meetingLink) && <a className="btn btn-sm btn-outline-success" href={safeMeetingLink(i.meetingLink)} target="_blank" rel="noreferrer">Mở phòng họp</a>}</div>
            </div>;
          })}
          {!!a.history?.length && <details className="small mt-3"><summary>Lịch sử xử lý đơn</summary>{a.history.map((h, i) => <p key={i}>{new Date(h.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {h.text}</p>)}</details>}
        </details>
        <div className="d-flex flex-wrap gap-2 mt-3"><Button as={Link} to={`/jobs/${a.jobId}`} size="sm" variant="outline-secondary">Xem tin tuyển dụng</Button>{applicationService.canWithdraw(a) && <Button size="sm" variant="outline-danger" onClick={() => openAction({ type: "withdraw", id: a.id })}>Rút đơn</Button>}</div>
      </Card>;
    })}
    <div className="d-flex justify-content-between align-items-center"><small>{visible.length} đơn · Trang {current}/{pages}</small><div className="d-flex gap-2"><Button size="sm" variant="outline-secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>Trước</Button><Button size="sm" variant="outline-secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Sau</Button></div></div>
    <p className="small text-muted mt-4">Dữ liệu demo lưu trong trình duyệt này; chưa đồng bộ giữa các thiết bị.</p>
    <Modal show={!!selected} onHide={() => setSelected(null)} centered backdrop="static"><Modal.Header closeButton><Modal.Title className="fs-5">Đơn ứng tuyển mới</Modal.Title></Modal.Header><Modal.Body>{selected && <CandidateApplyForm job={selected} onSuccess={() => { setSelected(null); setMessage("Đã gửi hồ sơ đến nhà tuyển dụng."); refresh(n => n + 1); }} />}</Modal.Body></Modal>
    <Modal show={!!action} onHide={() => setAction(null)} centered backdrop="static"><Modal.Header closeButton><Modal.Title className="fs-5">{action?.type === "withdraw" ? "Xác nhận rút đơn" : action?.type === "confirmed" ? "Xác nhận tham gia" : "Đề nghị đổi lịch"}</Modal.Title></Modal.Header><Form onSubmit={confirm}><Modal.Body>{error && <Alert variant="danger">{error}</Alert>}{action?.type === "withdraw" && <p>Đơn vẫn được lưu trong lịch sử. Các lịch chưa hoàn tất sẽ bị hủy. Bản demo chưa hỗ trợ nộp lại vị trí này.</p>}<Form.Label>{action?.type === "reschedule" ? "Lý do và thời gian đề xuất (bắt buộc)" : "Ghi chú (tùy chọn)"}</Form.Label><Form.Control as="textarea" rows={3} maxLength={1000} required={action?.type === "reschedule"} value={note} onChange={e => setNote(e.target.value)} /></Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setAction(null)}>Quay lại</Button><Button type="submit" variant={action?.type === "withdraw" ? "danger" : "success"}>Xác nhận</Button></Modal.Footer></Form></Modal>
  </Container>;
}