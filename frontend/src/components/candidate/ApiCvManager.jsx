import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { candidateApi } from "../../services/candidateApi";

export default function ApiCvManager({ candidateId, selectedId, onSelect, onBusy }) {
  const [cvs, setCvs] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    candidateApi.cvs(candidateId, { signal: controller.signal }).then(rows => {
      if (controller.signal.aborted) return;
      setCvs(rows);
      const chosen = rows.find(cv => cv.id === selectedRef.current) || rows.find(cv => cv.is_active) || rows[0];
      selectRef.current?.(chosen?.id || "");
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [candidateId, revision]);
  async function run(action, message, reload = true) {
    if (locked.current) return;
    locked.current = true; setBusy(true); onBusy?.(true); setError(""); setNotice("");
    try { await action(); setNotice(message); if (reload) setRevision(v => v + 1); }
    catch (err) { setError(err.message || "Không thực hiện được thao tác CV."); }
    finally { locked.current = false; setBusy(false); onBusy?.(false); }
  }
  return <section aria-label="Quản lý CV">
    {error && <Alert variant="danger">{error}</Alert>}
    {notice && <Alert variant="success" role="status">{notice}</Alert>}
    <Form.Group controlId="api-cv-upload" className="mb-3">
      <Form.Label>Tải CV mới (PDF, DOCX; tối đa 10 MB)</Form.Label>
      <Form.Control type="file" accept=".pdf,.docx" disabled={busy || loading} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (file) run(async () => { const result = await candidateApi.upload(candidateId, file); selectedRef.current = result.cv_version_id; selectRef.current?.(result.cv_version_id); }, "Đã tải CV. Bạn có thể dùng CV này để ứng tuyển; kết quả phân tích AI được xử lý riêng.");
      }} />
    </Form.Group>
    {loading ? <p role="status">Đang tải danh sách CV…</p> : !cvs.length && <p className="text-muted">Chưa có CV trên hệ thống.</p>}
    {!loading && cvs.map(cv => <div className="border rounded p-3 mb-2" key={cv.id}>
      {onSelect ? <Form.Check type="radio" name="api-cv-choice" id={`cv-${cv.id}`} label={cv.file_name} checked={selectedId === cv.id} disabled={busy} onChange={() => onSelect(cv.id)} /> : <strong style={{ overflowWrap: "anywhere" }}>{cv.file_name}</strong>}
      <div className="small text-muted">{cv.is_active ? "CV mặc định · " : ""}{cv.status} · {new Date(cv.created_at).toLocaleString("vi-VN")}</div>
      <div className="d-flex flex-wrap gap-2 mt-2">
        <Button size="sm" variant="outline-success" disabled={busy} onClick={() => run(() => candidateApi.download(candidateId, cv), "Đã tải tệp CV.", false)}>Tải xuống</Button>
        {!cv.is_active && <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => run(() => candidateApi.activate(candidateId, cv.id), "Đã đổi CV mặc định.")}>Đặt làm mặc định</Button>}
      </div>
    </div>)}
    <Button size="sm" variant="link" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}>Làm mới danh sách CV</Button>
  </section>;
}