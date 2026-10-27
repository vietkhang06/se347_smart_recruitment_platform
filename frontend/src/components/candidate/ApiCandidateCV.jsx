import { useEffect, useRef, useState } from "react";
import { apiCvService } from "../../services/api/apiCvService";
import { TOKEN_KEY } from "../../services/dataMode";
import { useCvProcessing } from "../../hooks/useCvProcessing";

const labels = { idle: "Chưa có CV", queued: "Đang chờ phân tích", processing: "AI đang phân tích",
  completed: "Phân tích hoàn tất", failed: "Phân tích thất bại", reconnecting: "Đang kết nối lại",
  timeout: "Đã dừng theo dõi tự động", error: "Không đọc được trạng thái" };
const patch = cv => ({ cvId: cv.id, cvName: cv.fileName, cvSize: cv.size });

export default function ApiCandidateCV({ candidateId, value = {}, onChange = () => {}, onBusy = () => {} }) {
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [sessionChanged, setSessionChanged] = useState(false);
  const [preview, setPreview] = useState(null);
  const [token] = useState(() => localStorage.getItem(TOKEN_KEY));
  const callbacks = useRef({ onChange, onBusy });
  callbacks.current = { onChange, onBusy };
  const actions = useRef(null);
  const alive = useRef(false);
  const urls = useRef(new Set());
  const downloads = useRef(new Set());

  useEffect(() => {
    alive.current = true;
    const ownedUrls = urls.current;
    const ownedTimers = downloads.current;
    const changed = () => {
      if (localStorage.getItem(TOKEN_KEY) === token) return;
      actions.current?.abort();
      setSessionChanged(true); setVersions([]); setSelectedId(null); setPreview(null);
      ownedUrls.forEach(url => URL.revokeObjectURL(url)); ownedUrls.clear();
      setError("Phiên đăng nhập đã thay đổi. Hãy mở lại trang hồ sơ.");
    };
    window.addEventListener("storage", changed);
    window.addEventListener("matchajob:auth-changed", changed);
    return () => {
      alive.current = false; actions.current?.abort();
      window.removeEventListener("storage", changed);
      window.removeEventListener("matchajob:auth-changed", changed);
      ownedUrls.forEach(url => URL.revokeObjectURL(url)); ownedUrls.clear();
      ownedTimers.forEach(timer => clearTimeout(timer)); ownedTimers.clear();
    };
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    actions.current?.abort();
    setPreview(null);
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    setVersions([]); setSelectedId(null); setLoading(true);
    setError(sessionChanged ? "Phiên đăng nhập đã thay đổi. Hãy mở lại trang hồ sơ." : "");
    const current = () => !controller.signal.aborted && token === localStorage.getItem(TOKEN_KEY);
    if (!candidateId || !token || sessionChanged) { setLoading(false); return; }
    apiCvService.list(candidateId, { signal: controller.signal })
      .then(items => {
        if (!current()) return;
        setVersions(items);
        const active = items.find(cv => cv.active);
        setSelectedId(items.find(cv => cv.id === value.cvId)?.id || active?.id || items[0]?.id || null);
        if (active) callbacks.current.onChange(patch(active));
      })
      .catch(err => { if (current()) setError(err.message); })
      .finally(() => { if (current()) setLoading(false); });
    return () => controller.abort();
    // Caller value is an output of CV selection, not a trigger for repeated HTTP loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, token, reload, sessionChanged]);

  const selected = versions.find(cv => cv.id === selectedId);
  const nativePdfViewer = typeof navigator !== "undefined" && navigator.pdfViewerEnabled === true;
  const progress = useCvProcessing({ candidateId, version: selected, enabled: !sessionChanged && !loading,
    // Polling owns processing fields, not the user's active-version selection.
    onUpdate: cv => setVersions(items => items.map(item => item.id === cv.id
      ? { ...item, status: cv.status, jobId: cv.jobId } : item)) });

  async function run(label, task) {
    if (actions.current || sessionChanged || !candidateId || !token) return;
    const controller = new AbortController();
    actions.current = controller;
    setBusy(label); setError(""); setNotice(""); callbacks.current.onBusy(true);
    const current = () => alive.current && !controller.signal.aborted && token === localStorage.getItem(TOKEN_KEY);
    try { await task(controller.signal, current); }
    catch (err) { if (current()) setError(err.message); }
    finally {
      if (actions.current === controller) actions.current = null;
      if (alive.current) { setBusy(""); callbacks.current.onBusy(false); }
    }
  }

  function chooseFile(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    run("Đang tải CV lên…", async (signal, current) => {
      const cv = await apiCvService.upload(candidateId, file, { signal });
      if (!current()) return;
      setVersions(items => [cv, ...items.map(item => ({ ...item, active: false }))]);
      setSelectedId(cv.id); callbacks.current.onChange(patch(cv));
      setNotice("Đã lưu CV trên hệ thống. Phiên bản mới được chọn làm CV đang dùng.");
    });
  }

  function download(cv, inline) {
    run(inline ? "Đang mở bản xem trước…" : "Đang tải CV…", async (signal, current) => {
      const blob = await apiCvService.download(candidateId, cv.id, inline, { signal });
      if (!current()) return;
      const url = URL.createObjectURL(blob); urls.current.add(url);
      if (inline) {
        if (preview) { URL.revokeObjectURL(preview.url); urls.current.delete(preview.url); }
        setPreview({ url, name: cv.fileName });
      } else {
        const link = document.createElement("a"); link.href = url; link.download = cv.fileName;
        document.body.appendChild(link); link.click(); link.remove();
        const timer = setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); downloads.current.delete(timer); }, 60000);
        downloads.current.add(timer);
      }
    });
  }

  return <section aria-label="Quản lý CV trên hệ thống" className="border rounded-3 p-3 bg-surface-2">
    <p className="small text-muted">Dữ liệu API thật · PDF/DOCX · tối đa 10 MiB. Mỗi lần tải tạo một phiên bản mới; đơn đã nộp giữ nguyên CV.</p>
    <label className="d-block fw-semibold small">Chọn CV để tải lên hệ thống
      <input className="form-control mt-2" type="file" accept=".pdf,.docx" disabled={!!busy || loading || sessionChanged || !candidateId}
        onChange={chooseFile} />
    </label>
    {busy && <p role="status" className="small mt-2">{busy}</p>}
    {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
    {notice && <div className="alert alert-success mt-3" role="status">{notice}</div>}
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 my-3">
      <strong className="small">Các phiên bản CV</strong>
      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!!busy || loading || sessionChanged}
        onClick={() => setReload(value => value + 1)}>Tải lại danh sách CV</button>
    </div>
    {loading ? <p role="status">Đang tải danh sách CV…</p> : !versions.length && !error ? <p>Chưa có CV trên hệ thống.</p> : null}
    {!!versions.length && <p className="small text-muted">Chọn một bản để xem tiến độ. Nút “Dùng phiên bản này” mới thay đổi CV đang dùng.</p>}
    <ul className="list-unstyled mb-0">{versions.map(cv => <li key={cv.id} className="border rounded p-2 mb-2">
      <label className="d-flex gap-2 align-items-start text-break">
        <input type="radio" className="form-check-input flex-shrink-0" name={`cv-${candidateId}`} checked={selectedId === cv.id}
          disabled={!!busy || sessionChanged} onChange={() => setSelectedId(cv.id)} />
        <span><strong>{cv.fileName}</strong> {cv.active && <span className="badge text-bg-success">Đang dùng</span>}
          <span className="small text-muted d-block">{(cv.size / 1024).toFixed(1)} KiB · {cv.createdAt ? new Date(cv.createdAt).toLocaleString("vi-VN") : "Vừa tải lên"}</span>
        </span>
      </label>
      <div className="d-flex flex-wrap gap-2 mt-2">
        <button type="button" className="btn btn-sm btn-outline-success text-break text-start" style={{ maxWidth: "100%" }} disabled={!!busy || sessionChanged} onClick={() => download(cv, false)}>Tải {cv.fileName}</button>
        {cv.mimeType === "application/pdf" && <button type="button" className="btn btn-sm btn-outline-secondary text-break text-start" style={{ maxWidth: "100%" }} disabled={!!busy || sessionChanged}
          onClick={() => download(cv, true)}>Xem trước {cv.fileName}</button>}
        {!cv.active && <button type="button" className="btn btn-sm btn-success" disabled={!!busy || sessionChanged}
          onClick={() => run("Đang chọn CV…", async (signal, current) => {
            const updated = await apiCvService.activate(candidateId, cv.id, { signal });
            if (!current()) return;
            setVersions(items => items.map(item => item.id === updated.id ? updated : { ...item, active: false }));
            setSelectedId(updated.id); callbacks.current.onChange(patch(updated)); setNotice("Đã chọn CV đang dùng; CV của đơn đã nộp không thay đổi.");
          })}>Dùng phiên bản này</button>}
      </div>
    </li>)}</ul>
    {selected && <div className="border-top pt-3 mt-3">
      <p role="status" aria-live="polite" className="mb-1"><strong>{labels[progress.phase]}</strong> — {selected.fileName}</p>
      {progress.attempt > 0 && <p className="small text-muted mb-1">Lần xử lý {progress.attempt}/{progress.maxAttempts}{progress.phase === "queued" ? " · Chờ lượt xử lý/thử lại tự động" : ""}</p>}
      {progress.message && <p className="small mb-2">{progress.message}</p>}
      {progress.phase === "failed" && <p className="small text-danger">Tệp vẫn được lưu và có thể tải. Kiểm tra lại chỉ đọc trạng thái; muốn phân tích bản sửa, hãy tải CV mới.</p>}
      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!!busy || sessionChanged} onClick={progress.refresh}>Kiểm tra lại trạng thái</button>
    </div>}
    {preview && <div className="mt-3">
      <div className="d-flex justify-content-between gap-2"><strong className="small text-break">{preview.name}</strong>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
          URL.revokeObjectURL(preview.url); urls.current.delete(preview.url); setPreview(null);
        }}>Đóng xem trước</button></div>
      {nativePdfViewer ? <object className="w-100 border rounded mt-2" style={{ height: 420 }} title="Bản xem trước CV"
        data={preview.url} type="application/pdf">
        <p className="p-3">Trình duyệt không hỗ trợ xem PDF trực tiếp. Hãy dùng nút tải CV ở danh sách phía trên.</p>
      </object> : <p title="Bản xem trước CV" className="alert alert-info mt-2">Trình duyệt không hỗ trợ xem PDF trực tiếp. Hãy dùng nút tải CV ở danh sách phía trên.</p>}
      <p className="small text-muted">Nếu trình duyệt không hiển thị PDF, dùng nút tải tệp. DOCX chỉ hỗ trợ tải xuống.</p>
    </div>}
  </section>;
}
