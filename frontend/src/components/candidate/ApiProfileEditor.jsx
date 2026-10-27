import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { candidateProfileService } from "../../services/profileService";
const fields = [
  ["headline", "Chức danh mong muốn", 255], ["location", "Địa điểm", 255],
  ["education", "Học vấn", 500], ["address", "Địa chỉ", 1000], ["bio", "Giới thiệu bản thân", 5000]
];
export default function ApiProfileEditor({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    candidateProfileService.load({ signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setProfile(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await candidateProfileService.save(profile);
      setProfile(updated); setNotice("Đã lưu hồ sơ trên hệ thống.");
    } catch (err) { setError(err.message || "Không lưu được hồ sơ."); }
    finally { setBusy(false); }
  };
  if (loading) return <Container className="py-5" role="status">Đang tải hồ sơ…</Container>;
  if (!profile) return <Container className="py-5"><Alert variant="danger" role="alert">{error || "Không có dữ liệu hồ sơ."}</Alert><Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button></Container>;
  const cvUrl = /^https?:\/\//i.test(profile.cv_url || "") ? profile.cv_url : null;
  return <Container className="py-5">
    <Card className="matcha-card p-4 mb-4 border-0 shadow-sm"><h1 className="h4">Hồ sơ ứng viên</h1><strong>{user.name}</strong><span className="text-muted">{user.email}</span></Card>
    <Row className="g-4"><Col lg={8}><Card className="matcha-card p-4 border-0 shadow-sm">
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      {notice && <Alert variant="success" role="status">{notice}</Alert>}
      <Form onSubmit={save}><fieldset disabled={busy}>
        <Row className="g-3">{fields.map(([key, label, max]) => <Col md={key === "bio" || key === "address" ? 12 : 6} key={key}>
          <Form.Group controlId={`profile-${key}`}><Form.Label>{label}</Form.Label>
            <Form.Control as={key === "bio" ? "textarea" : "input"} rows={key === "bio" ? 5 : undefined} maxLength={max} value={profile[key] || ""}
              onChange={e => { setNotice(""); setProfile(p => ({ ...p, [key]: e.target.value })); }} />
          </Form.Group>
        </Col>)}
          <Col md={6}><Form.Group controlId="profile-years"><Form.Label>Số năm kinh nghiệm</Form.Label>
            <Form.Control type="number" min={0} max={60} step={1} value={profile.experience_years ?? ""}
              onChange={e => { setNotice(""); setProfile(p => ({ ...p, experience_years: e.target.value })); }} />
            <Form.Text>Để trống giữ nguyên; nhập 0 nếu chưa có kinh nghiệm.</Form.Text>
          </Form.Group></Col>
          <Col xs={12}><Button type="submit" variant="success">{busy ? "Đang lưu…" : "Lưu thay đổi hồ sơ"}</Button></Col>
        </Row>
      </fieldset></Form>
    </Card></Col>
    <Col lg={4}><Card className="matcha-card p-4 border-0 shadow-sm"><h2 className="h5">CV hiện tại</h2>
      {cvUrl ? <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success">Xem CV</a> : <p className="text-muted">Chưa có CV trên hệ thống.</p>}
      {profile.ai_cv_score != null && <p className="mt-3">Điểm CV: {profile.ai_cv_score}/100</p>}
    </Card></Col></Row>
  </Container>;
}