import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Col, Row } from "react-bootstrap";
import { apiApplicationService } from "../../services/api/apiApplicationService";
import { IS_API } from "../../services/dataMode";
const labels = { NOT_STARTED: "Chưa chạy đối sánh", PENDING: "Đang chờ xử lý (queued)", PROCESSING: "Đang xử lý", COMPLETED: "Hoàn tất", FAILED: "Xử lý thất bại" };
const scoreText = value => value === null ? "—" : `${value}/100`;
export default function MatchingResultPanel({ applicationId, active = true, onCompleted }) {
  const [state, setState] = useState({ id: null, result: null, error: null, loading: false, refreshRequired: false });
  const [now, setNow] = useState(() => Date.now());
  const request = useRef({ sequence: 0, busy: false, controller: null });
  const completed = useRef(onCompleted);
  useEffect(() => { completed.current = onCompleted; }, [onCompleted]);
  const polls = useRef(0);
  const lastCompleted = useRef("");
  const load = useCallback(async (trigger = false) => {
    if (!active || !applicationId || !IS_API || request.current.busy) return;
    const sequence = ++request.current.sequence;
    const controller = new AbortController();
    request.current.controller = controller;
    request.current.busy = true;
    setState(previous => ({ ...previous, id: applicationId, loading: true, error: null }));
    try {
      const result = trigger
        ? await apiApplicationService.triggerMatchingEvaluation(applicationId, { signal: controller.signal })
        : await apiApplicationService.getMatchingResult(applicationId, { signal: controller.signal });
      if (sequence !== request.current.sequence || controller.signal.aborted) return;
      setState({ id: applicationId, result, error: null, loading: false, refreshRequired: false });
      const key = `${applicationId}:${result.evaluatedAt}`;
      if (result.status === "COMPLETED" && lastCompleted.current !== key) {
        lastCompleted.current = key;
        completed.current?.(result);
      }
    } catch (error) {
      if (sequence !== request.current.sequence || controller.signal.aborted) return;
      // After an uncertain POST, read the persisted status before allowing another POST.
      setState(previous => ({ ...previous, id: applicationId, error, loading: false, refreshRequired: trigger || previous.refreshRequired }));
    } finally {
      if (sequence === request.current.sequence) request.current.busy = false;
    }
  }, [applicationId, active]);
  useEffect(() => {
    request.current.controller?.abort();
    request.current.sequence += 1;
    request.current.busy = false;
    polls.current = 0;
    lastCompleted.current = "";
    setState({ id: applicationId, result: null, error: null, loading: false, refreshRequired: false });
    if (active && applicationId && IS_API) void load();
    return () => {
      request.current.controller?.abort();
      request.current.sequence += 1;
      request.current.busy = false;
    };
  }, [applicationId, active, load]);
  const current = state.id === applicationId ? state : { result: null, error: null, loading: true };
  const result = current.result;
  useEffect(() => {
    if (!active || result?.status !== "PROCESSING" || current.loading || current.error || polls.current >= 40) return;
    const timer = setTimeout(() => { polls.current += 1; void load(); }, 3000);
    return () => clearTimeout(timer);
  }, [active, result, current.loading, current.error, load]);
  const retryAt = result?.retryAfter ? Date.parse(result.retryAfter) : 0;
  useEffect(() => {
    setNow(Date.now());
    if (!active || !retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, retryAt]);
  if (!IS_API) return <Alert variant="secondary">Matching API chỉ hoạt động trong chế độ API. Đặt VITE_DATA_SOURCE=api và khởi động lại Frontend.</Alert>;
  if (!applicationId) return <Alert variant="danger">Không xác định được Application ID từ Backend.</Alert>;
  const wait = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const canRun = result?.retryable && ["PENDING", "NOT_STARTED"].includes(result.status) && !current.refreshRequired && !current.error;
  return <section className="border rounded p-3 mb-4" aria-label="Kết quả đối sánh CV–JD">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h6 className="fw-bold mb-0">Chi tiết đối sánh CV–JD</h6>
      <Badge bg={result?.status === "COMPLETED" ? "success" : result?.status === "FAILED" ? "danger" : "secondary"}>{result ? labels[result.status] : current.error ? "Không tải được kết quả" : "Đang tải kết quả"}</Badge>
    </div>
    {current.error && <Alert variant="danger" role="alert">{current.error.message}{current.error.code && <div>Mã lỗi: {current.error.code}</div>}{current.refreshRequired && <div>Hãy tải lại trạng thái trước khi chạy đối sánh tiếp.</div>}</Alert>}
    {current.loading && <div role="status" className="small text-muted mb-2">Đang liên hệ API matching…</div>}
    {result?.status === "COMPLETED" ? <>
      <Row className="g-2 mb-3">{[["Điểm tổng", result.overallScore], ["Kỹ năng", result.skillsScore], ["Kinh nghiệm", result.experienceScore]].map(([label, value]) => <Col sm={4} key={label}><div className="p-3 rounded bg-surface-2"><small>{label}</small><strong className="d-block fs-5">{scoreText(value)}</strong></div></Col>)}</Row>
      <strong className="small">Điểm theo tiêu chí</strong>
      {Object.entries(result.criteriaScores).map(([criterion, value]) => <div key={criterion} className="my-2"><div className="small">{({ skills: "Kỹ năng", experience: "Kinh nghiệm" })[criterion] || criterion}: {scoreText(value)}</div><div className="progress" role="progressbar" aria-label={criterion} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} style={{ height: 7 }}><div className="progress-bar bg-success" style={{ width: `${value}%` }} /></div></div>)}
      {[["Kỹ năng khớp", result.matchedSkills, "success"], ["Kỹ năng còn thiếu", result.missingSkills, "warning"]].map(([label, skills, color]) => <div key={label} className="my-3"><strong className="small d-block mb-2">{label} ({skills.length})</strong>{skills.length ? skills.map((skill, index) => <Badge key={`${index}:${skill}`} bg={color} text={color === "warning" ? "dark" : "light"} className="me-1">{skill}</Badge>) : <span className="small text-muted">Không có mục được báo cáo.</span>}</div>)}
      <details className="mb-3"><summary>Chi tiết breakdown</summary><pre className="small mt-2" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(result.breakdown, null, 2)}</pre></details>
      <strong className="small">Giải thích kết quả</strong><p className="small" style={{ whiteSpace: "pre-wrap" }}>{result.explanation || "Worker chưa cung cấp giải thích."}</p>
      <small className="text-muted">Đánh giá lúc: {new Date(result.evaluatedAt).toLocaleString("vi-VN")}</small>
    </> : result && <><p className="small">{result.message}</p><p className="small text-muted">Điểm tổng: — · Kỹ năng: — · Kinh nghiệm: —</p></>}
    {result?.status === "PENDING" && <p className="small text-muted">Nhấn Chạy đối sánh để xử lý. Tải lại chỉ đọc trạng thái đã lưu.</p>}
    {result?.status === "PROCESSING" && <p className="small text-muted">Một yêu cầu đang xử lý. Tự tải trạng thái mỗi 3 giây, tối đa 40 lần; sau đó bạn có thể tải lại thủ công.</p>}
    {result?.status === "FAILED" && <Alert variant="warning">Xử lý đã dừng hoặc hết số lần thử. Cần kiểm tra dịch vụ trước khi xử lý lại.</Alert>}
    {result?.attemptCount !== null && result?.attemptCount !== undefined && <div className="small text-muted mb-2">Số lần thử: {result.attemptCount}/{result.maxAttempts}</div>}
    <div className="d-flex gap-2 mt-3">
      {canRun && <Button size="sm" disabled={current.loading || wait > 0} onClick={() => load(true)}>{wait > 0 ? `Thử lại sau ${wait}s` : "Chạy đối sánh"}</Button>}
      <Button size="sm" variant="outline-secondary" disabled={current.loading} onClick={() => { polls.current = 0; void load(); }}>Tải lại trạng thái</Button>
    </div>
  </section>;
}
