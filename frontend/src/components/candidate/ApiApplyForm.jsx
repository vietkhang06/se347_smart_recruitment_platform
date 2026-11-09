import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Form } from "react-bootstrap";
import { candidateProfileService } from "../../services/profileService";
import { candidateApi } from "../../services/candidateApi";
import ApiCvManager from "./ApiCvManager";

export default function ApiApplyForm({ job, onSuccess, onBusy }) {
  const [profile, setProfile] = useState(null), [cvId, setCvId] = useState("");
  const [letter, setLetter] = useState(""), [consent, setConsent] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false), [sent, setSent] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setError("");
    candidateProfileService.load({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setProfile(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [retry]);
  async function submit(event) {
    event.preventDefault();
    if (lock.current || uploading || !cvId || !consent || sent) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError("");
    let result;
    try { result = await candidateApi.apply(job.id, cvId, letter); setSent(true); }
    catch (err) { setError(err.status === 409 ? "Bạn đã ứng tuyển vị trí này. Xem đơn trong lịch sử ứng tuyển." : err.message); }
    finally { lock.current = false; setBusy(false); onBusy?.(false); }
    if (result) onSuccess?.(result);
  }
  return <Form onSubmit={submit}>
    <p className="text-muted">{job.company} · {job.title}</p>
    {error && <Alert variant="danger">{error} <Link to="/candidate/applications">Xem đơn ứng tuyển</Link></Alert>}
    {sent && <Alert variant="success">Đã gửi hồ sơ thành công.</Alert>}
    {!profile ? <><p role="status">{error ? "Chưa tải được hồ sơ." : "Đang tải hồ sơ…"}</p>{error && <Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button>}</> : <fieldset disabled={busy || sent}>
      <ApiCvManager candidateId={profile.id} selectedId={cvId} onSelect={id => { setCvId(id); setConsent(false); }} onBusy={value => { setUploading(value); onBusy?.(value); }} />
      <Form.Group controlId="api-cover-letter" className="mt-3">
        <Form.Label>Thư giới thiệu</Form.Label>
        <Form.Control as="textarea" rows={4} maxLength={2000} value={letter} onChange={e => setLetter(e.target.value)} />
      </Form.Group>
      <Form.Check className="my-3" id="api-apply-consent" required checked={consent} onChange={e => setConsent(e.target.checked)} label="Tôi xác nhận CV đã chọn và đồng ý chia sẻ hồ sơ với nhà tuyển dụng của vị trí này." />
      <Button type="submit" variant="success" disabled={busy || uploading || !cvId || !consent || sent}>{busy ? "Đang gửi…" : "Xác nhận gửi hồ sơ"}</Button>
    </fieldset>}
  </Form>;
}