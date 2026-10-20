import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { jobService } from "../../services/jobService";
import { IS_API } from "../../services/dataMode";
import JobCard from "../../components/jobs/JobCard";

export default function JobsPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [retry, setRetry] = useState(0);
  const query = params.toString();
  const rawPage = Number(params.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const values = Object.fromEntries(new URLSearchParams(query));
    jobService.search({ ...values, keyword: values.q || "", page, size: 8 }, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) { setResult(null); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError("");
    jobService.categories({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setCategories(data); })
      .catch(err => { if (!controller.signal.aborted) setCategoryError(err.message); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (IS_API) return;
    const refresh = () => setRetry(value => value + 1);
    window.addEventListener("matchajob:store-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("matchajob:store-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const mockJobs = IS_API ? [] : jobService.getJobsSnapshot();
  const workTypes = IS_API ? ["full_time", "part_time", "hybrid", "remote", "contract"] : [...new Set(mockJobs.map(j => j.workType || j.type).filter(Boolean))];
  const levels = IS_API ? ["intern", "fresher", "junior", "middle", "senior", "lead", "director"] : [...new Set(mockJobs.map(j => j.level || j.exp).filter(Boolean))];
  const locations = [...new Set(mockJobs.map(job => job.location).filter(Boolean))].sort();
  const experiences = [...new Set(mockJobs.map(job => job.experience || job.exp).filter(Boolean))].sort();
  const select = (label, key, items) => <Form.Group className="mb-3" controlId={`search-${key}`}>
    <Form.Label className="small fw-semibold">{label}</Form.Label>
    <Form.Select size="sm" value={params.get(key) || ""} onChange={e => update(key, e.target.value)}>
      <option value="">Tất cả</option>
      {params.get(key) && !items.some(item => String(item.id) === params.get(key)) && <option value={params.get(key)}>{params.get(key)}</option>}
      {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </Form.Select>
  </Form.Group>;
  return <Container className="py-5">
    <h1 className="fw-bold mb-1">Khám phá cơ hội việc làm</h1>
    <p className="text-muted mb-4">Tìm công việc phù hợp với bạn</p>
    <Row className="g-4">
      <Col lg={3} md={4}><Card className="matcha-card p-3 shadow-sm border-0">
        <div className="d-flex justify-content-between mb-3"><h2 className="h6">Bộ lọc tìm kiếm</h2><Button variant="link" size="sm" onClick={() => setParams({})}>Đặt lại</Button></div>
        <Form.Group className="mb-3" controlId="search-keyword"><Form.Label>Từ khóa</Form.Label><Form.Control size="sm" value={params.get("q") || ""} onChange={e => update("q", e.target.value)} placeholder={IS_API ? "Vị trí, địa điểm…" : "Vị trí, kỹ năng…"} /></Form.Group>
        {IS_API ? <Form.Group className="mb-3" controlId="search-location"><Form.Label>Địa điểm</Form.Label><Form.Control size="sm" value={params.get("location") || ""} onChange={e => update("location", e.target.value)} placeholder="Thành phố…" /></Form.Group>
          : select("Địa điểm", "location", locations.map(id => ({ id, name: id })))}
        {select("Hình thức làm việc", "workType", workTypes.map(id => ({ id, name: ({ full_time: "Toàn thời gian", part_time: "Bán thời gian", contract: "Hợp đồng", hybrid: "Kết hợp", remote: "Từ xa" })[id] || id })))}
        {select("Ngành nghề", "categoryId", categories)}
        {categoryError && <div className="text-danger small" role="alert">Không tải được ngành nghề. <button className="btn btn-link btn-sm" onClick={() => setRetry(v => v + 1)}>Thử lại</button></div>}
        {select("Cấp bậc", "level", levels.map(id => ({ id, name: id })))}
        {!IS_API && select("Kinh nghiệm", "experience", experiences.map(id => ({ id, name: id })))}
      </Card></Col>
      <Col lg={9} md={8}>
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <span>{!loading && !error && `${result?.totalElements || 0} việc làm phù hợp`}</span>
          <Form.Select aria-label="Sắp xếp" className="w-auto" value={params.get("sortBy") || "postedAt_desc"} onChange={e => update("sortBy", e.target.value)}>
            <option value="postedAt_desc">Mới nhất</option><option value="salary_desc">Mức lương cao nhất</option><option value="title_asc">Tên A–Z</option>{!IS_API && <option value="match_desc">Độ phù hợp cao nhất</option>}
          </Form.Select>
        </div>
        {loading ? <div className="py-5 text-center" role="status">Đang tải việc làm…</div> : error ? <div className="alert alert-danger" role="alert">{error} <Button variant="outline-danger" onClick={() => setRetry(v => v + 1)}>Thử lại</Button></div>
          : !result?.content.length ? <Card className="matcha-card p-5 text-center"><h2 className="h5">Không tìm thấy việc làm phù hợp</h2><p>Thử thay đổi bộ lọc hoặc quay về trang đầu.</p><Button variant="outline-success" onClick={() => page ? update("page", "") : setParams({})}>{page ? "Về trang đầu" : "Xóa bộ lọc"}</Button></Card>
          : <Row className="g-3">{result.content.map(job => <Col lg={6} key={job.id}><JobCard job={job} /></Col>)}</Row>}
        {!loading && !error && (result?.totalPages > 1 || page > 0) && <nav className="d-flex align-items-center justify-content-between gap-2 mt-4" aria-label="Phân trang việc làm">
          <Button variant="outline-success" disabled={page === 0} onClick={() => update("page", String(page - 1))}>Trước</Button>
          <span>Trang {page + 1} / {Math.max(1, result?.totalPages || 0)}</span>
          <Button variant="outline-success" disabled={page + 1 >= (result?.totalPages || 0)} onClick={() => update("page", String(page + 1))}>Sau</Button>
        </nav>}
      </Col>
    </Row>
  </Container>;
}