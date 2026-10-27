import { useEffect, useRef, useState } from "react";
import { apiCvService, CvContractError } from "../services/api/apiCvService";
import { HttpError } from "../services/httpClient";
import { TOKEN_KEY } from "../services/dataMode";

const cvPhase = status => status === "extracted" ? "completed" : status === "failed" ? "failed" : "queued";
const jobPhase = { PENDING: "queued", PROCESSING: "processing", COMPLETED: "completed", FAILED: "failed" };

export function useCvProcessing({ candidateId, version, enabled = true, onUpdate,
  intervalMs = 2000, timeoutMs = 180000 }) {
  const [state, setState] = useState({ phase: "idle" });
  const [revision, setRevision] = useState(0);
  const update = useRef(onUpdate);
  update.current = onUpdate;
  const cvId = version?.id;
  const jobId = version?.jobId;
  const token = localStorage.getItem(TOKEN_KEY);

  useEffect(() => {
    if (!enabled || !cvId || !candidateId || !token) { setState({ phase: "idle" }); return; }
    if (!revision && version.status !== "uploaded") { setState({ phase: cvPhase(version.status) }); return; }
    const controller = new AbortController();
    let timer;
    let errors = 0;
    let disposed = false;
    const current = () => !disposed && !controller.signal.aborted && localStorage.getItem(TOKEN_KEY) === token;
    setState({ phase: cvPhase(version.status) });
    const budget = setTimeout(() => {
      if (!current()) return;
      clearTimeout(timer);
      controller.abort();
      setState({ phase: "timeout", message: "Đã dừng theo dõi tự động sau 3 phút. Job có thể vẫn chạy; hãy kiểm tra lại trạng thái." });
    }, timeoutMs);

    async function poll() {
      try {
        const job = jobId ? await apiCvService.job(jobId, cvId, { signal: controller.signal }) : null;
        if (!current()) return;
        let phase = job ? jobPhase[job.status] : "queued";
        if (!job || ["completed", "failed"].includes(phase)) {
          const cv = await apiCvService.get(candidateId, cvId, { signal: controller.signal });
          if (!current()) return;
          if (job && cvPhase(cv.status) !== phase) throw new CvContractError();
          phase = cvPhase(cv.status);
          update.current?.(cv);
        }
        errors = 0;
        setState({ phase, attempt: job?.attemptCount, maxAttempts: job?.maxAttempts,
          retryAfter: job?.retryAfter, message: !job && phase === "queued" ? "CV cũ chưa có mã job: đang chờ hoặc đang xử lý." : "" });
        if (["completed", "failed"].includes(phase)) clearTimeout(budget);
        else timer = setTimeout(poll, intervalMs);
      } catch (error) {
        if (!current()) return;
        const transient = error instanceof HttpError && (error.status === 0 || error.status === 429 || error.status >= 500);
        if (transient && ++errors < 3) {
          setState({ phase: "reconnecting", message: "Tạm mất kết nối trạng thái; đang thử lại…" });
          timer = setTimeout(poll, intervalMs);
        } else {
          clearTimeout(budget);
          setState({ phase: "error", message: error.message });
        }
      }
    }
    poll();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); clearTimeout(budget); };
    // Metadata updates must not restart polling; identity/job changes must cancel the old request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, cvId, jobId, enabled, token, revision, intervalMs, timeoutMs]);
  return { ...state, refresh: () => setRevision(value => value + 1) };
}
