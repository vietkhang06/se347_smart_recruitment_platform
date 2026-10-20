import { IS_API } from "../../services/dataMode";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useFavorites } from "../../context/FavoritesContext";
import JobCard from "../../components/jobs/JobCard";
import { jobService } from "../../services/jobService";

export default function SavedJobsPage() {
  const { favorites } = useFavorites();

  const [loading, setLoading] = useState(IS_API);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const ids = favorites.join(",");
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [jobs, setJobs] = useState(() => jobService.getJobsSnapshot());

  useEffect(() => {
    if (!IS_API) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    const list = ids ? ids.split(",") : [];
    Promise.all(list.map(id => jobService.getPublicJobById(id, { signal: controller.signal })))
      .then(data => { if (!controller.signal.aborted) setJobs(data.filter(Boolean)); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ids, retry]);
  useEffect(() => {
    if (IS_API) return;
    const refresh = () => setJobs(jobService.getJobsSnapshot());

    window.addEventListener("matchajob:store-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("matchajob:store-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const savedJobs = jobs.filter((job) =>
    favorites.some((id) => String(id) === String(job.id))
  );

  const visibleJobs = savedJobs.filter(
    (job) =>
      (!onlyOpen || jobService.isAcceptingApplications(job)) &&
      `${job.title} ${job.company}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );

  if (loading) return <Container className="py-5" role="status">Đang tải việc làm đã lưu…</Container>;
  if (error) return <Container className="py-5"><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button></Container>;
  return (
    <Container className="py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-1">Cơ hội việc làm đã lưu</h1>
        <p className="text-muted">
          Theo dõi các vị trí tuyển dụng bạn đang quan tâm (
          {savedJobs.length} vị trí)
        </p>
      </div>

      <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
        <input
          type="search"
          className="form-control"
          style={{ flex: "1 1 260px" }}
          aria-label="Tìm việc đã lưu"
          placeholder="Tìm theo tên công việc hoặc công ty…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <label className="small">
          <input
            type="checkbox"
            className="form-check-input me-2"
            checked={onlyOpen}
            onChange={(event) => setOnlyOpen(event.target.checked)}
          />
          Chỉ hiển thị tin đang tuyển
        </label>
      </div>

      {savedJobs.length > 0 && visibleJobs.length === 0 && (
        <p className="text-muted">
          Không có công việc khớp bộ lọc.
        </p>
      )}

      {savedJobs.length === 0 ? (
        <Card
          className="matcha-card p-5 text-center border-0 shadow-sm"
          data-aos="zoom-in"
        >
          <div className="fs-1 text-danger mb-2">
            <i className="bi bi-heart" />
          </div>

          <h4 className="fw-bold">Bạn chưa lưu công việc nào</h4>

          <p className="text-muted small">
            Hãy bấm biểu tượng trái tim tại các tin tuyển dụng để
            xem lại tại đây bất kỳ lúc nào.
          </p>

          <div>
            <Button as={Link} to="/jobs" variant="success">
              Khám phá việc làm ngay
            </Button>
          </div>
        </Card>
      ) : (
        <Row className="g-4">
          {visibleJobs.map((job, index) => (
            <Col lg={6} key={job.id}>
              <JobCard job={job} aosDelay={index * 80} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}