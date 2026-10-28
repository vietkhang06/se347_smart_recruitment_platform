import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button, Card, Container, Form, Modal } from "react-bootstrap";
import { candidateApi, STAGE_LABELS, stageLabel } from "../../services/candidateApi";
const when = value => value ? new Date(value).toLocaleString("vi-VN") : "Chưa cập nhật";

function ApplicationDetail({ id, onHide }) {
  const [data, setData] = useState(null), [history, setHistory] = useState([]);
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    Promise.all([candidateApi.detail(id, { signal: controller.signal }), candidateApi.history(id, { signal: controller.signal })])
      .then(([detail, events]) => { if (!controller.signal.aborted) { setData(detail); setHistory([...events].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  return <Modal show onHide={onHide} centered size="lg"><Modal.Header closeButton><Modal.Title className="fs-5">Chi tiết & lịch sử xử lý đơn</Modal.Title></Modal.Header><Modal.Body>
    {loading ? <p role="status">Đang tải chi tiết…</p> : error ? <><Alert variant="danger">{error}</Alert><Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button></> : data && <>
      <h2 className="h5">{data.jobTitle}</h2><p>{data.companyName}</p>
      <Badge bg={data.stage === "rejected" ? "danger" : "success"}>{stageLabel(data.stage)}</Badge>
      <p className="small mt-3">Ngày gửi: {when(data.appliedAt)} · Mã đơn: {data.applicationId}</p>
      {data.coverLetter && <><h3 className="h6">Thư giới thiệu đã gửi</h3><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{data.coverLetter}</p></>}
      {data.rejectReason && <Alert variant="secondary">{data.rejectReason}</Alert>}
      <h3 className="h6">Lịch sử xử lý từ hệ thống</h3>
      {!history.length ? <p className="text-muted">Chưa có sự kiện lịch sử.</p> : <ol className="ps-4">{history.map(h => <li className="mb-3" key={h.id}>
        <strong>{h.fromStage ? `${stageLabel(h.fromStage)} → ` : ""}{stageLabel(h.toStage)}</strong>
        <div className="small text-muted">{when(h.createdAt)}</div>
        {h.reason && <p className="small" style={{ whiteSpace: "pre-wrap" }}>{h.reason}</p>}
      </li>)}</ol>}
    </>}
  </Modal.Body><Modal.Footer><Button variant="secondary" onClick={onHide}>Đóng</Button></Modal.Footer></Modal>;
}

export default function ApiApplications() {
  const [stage, setStage] = useState(""), [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    candidateApi.applications({ page, stage }, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { if (page > 0 && page >= data.totalPages) setPage(Math.max(0, data.totalPages - 1)); else setResult(data); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, stage, retry]);
  return <Container className="py-5">
    <div className="d-flex flex-wrap justify-content-between gap-3 mb-4"><div><h1 className="fw-bold h2">Theo dõi tiến trình ứng tuyển</h1><p className="text-muted">Hồ sơ đã gửi và lịch sử xử lý từ nhà tuyển dụng.</p></div><Button as={Link} to="/candidate/profile" variant="outline-success" className="align-self-start">Hồ sơ & CV</Button></div>
    <Card className="matcha-card border-0 shadow-sm p-3 mb-4"><div className="d-flex flex-wrap gap-2 align-items-center">
      <Form.Select aria-label="Lọc trạng thái đơn" style={{ flex: "1 1 240px" }} value={stage} onChange={e => { setStage(e.target.value); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select>
      <Button variant="outline-success" disabled={loading} onClick={() => setRetry(v => v + 1)}>Làm mới</Button><Button as={Link} to="/jobs" variant="success">Tìm việc & ứng tuyển</Button>
    </div></Card>
    {loading ? <p role="status">Đang tải đơn ứng tuyển…</p> : error ? <Alert variant="danger">{error} <Button size="sm" onClick={() => setRetry(v => v + 1)}>Thử lại</Button></Alert> : <>
      {!result?.items?.length && <Card className="matcha-card p-4 text-center"><h2 className="h5">{stage ? "Không có đơn ở trạng thái đã chọn" : "Bạn chưa gửi đơn ứng tuyển"}</h2><Link to="/jobs">Khám phá việc làm</Link></Card>}
      {result?.items?.map(a => <Card className="matcha-card border-0 shadow-sm p-3 p-md-4 mb-4" key={a.applicationId}>
        <div className="d-flex flex-wrap justify-content-between gap-2"><div><h2 className="h5 fw-bold">{a.jobTitle}</h2><p className="text-muted">{a.companyName} · {when(a.appliedAt)}</p></div><Badge className="align-self-start p-2" bg={a.stage === "rejected" ? "danger" : "success"}>{stageLabel(a.stage)}</Badge></div>
        <div className="d-flex flex-wrap gap-2"><Button variant="outline-success" onClick={() => setSelected(a.applicationId)}>Chi tiết & lịch sử</Button><Button as={Link} to={`/jobs/${a.jobId}`} variant="outline-secondary">Xem tin tuyển dụng</Button></div>
      </Card>)}
      <div className="d-flex justify-content-between align-items-center mt-3"><small>{result?.totalItems || 0} đơn · Trang {page + 1}/{Math.max(1, result?.totalPages || 0)}</small><div className="d-flex gap-2"><Button variant="outline-secondary" disabled={page === 0} onClick={() => setPage(v => v - 1)}>Trước</Button><Button variant="outline-secondary" disabled={page + 1 >= (result?.totalPages || 0)} onClick={() => setPage(v => v + 1)}>Sau</Button></div></div>
    </>}
    {selected && <ApplicationDetail key={selected} id={selected} onHide={() => setSelected(null)} />}
  </Container>;
}