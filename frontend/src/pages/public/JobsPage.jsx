import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { jobService } from "../../services/jobService";
import JobCard from "../../components/jobs/JobCard";

const salaryValue = (job) => {
  const value = job.salaryMin || String(job.salary || "").match(/[\d,.]+/)?.[0] || 0;
  return Number(String(value).replace(/[^\d]/g, "")) || 0;
};

const postedValue = (posted = "") => {
  const text = String(posted).toLocaleLowerCase("vi");
  if (/vừa xong|hôm nay|giờ trước/.test(text)) return Number.MAX_SAFE_INTEGER;
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return 0;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
};

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState(() => jobService.getJobsSnapshot());
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobType, setJobType] = useState("");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [sortBy, setSortBy] = useState("new");

  useEffect(() => {
    const refresh = () => setJobs(jobService.getJobsSnapshot());
    window.addEventListener("matchajob:store-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("matchajob:store-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    setKeyword(searchParams.get("q") || "");
    setLocation(searchParams.get("location") || "");
  }, [searchParams]);

  const publicJobs = useMemo(() => jobs.filter((job) => jobService.isAcceptingApplications(job)), [jobs]);
  const locations = useMemo(() => [...new Set(publicJobs.map((job) => job.location).filter(Boolean))].sort(), [publicJobs]);
  const jobTypes = useMemo(() => [...new Set(publicJobs.map((job) => job.type).filter(Boolean))].sort(), [publicJobs]);
  const categories = useMemo(() => [...new Set(publicJobs.map((job) => job.category || job.team).filter(Boolean))].sort(), [publicJobs]);
  const experiences = useMemo(() => [...new Set(publicJobs.map((job) => job.exp).filter(Boolean))].sort(), [publicJobs]);

  const handleReset = () => {
    setKeyword("");
    setLocation("");
    setJobType("");
    setCategory("");
    setExperience("");
    setSortBy("new");
    setSearchParams({});
  };

  const filteredJobs = useMemo(() => {
    const query = keyword.toLocaleLowerCase("vi").trim();
    return publicJobs.filter((job) => {
      const searchable = [job.title, job.company, job.category, job.team, ...(job.specTags || []), ...(job.reqTags || [])]
        .filter(Boolean).join(" ").toLocaleLowerCase("vi");
      return (!query || searchable.includes(query))
        && (!location || job.location === location)
        && (!jobType || job.type === jobType)
        && (!category || (job.category || job.team) === category)
        && (!experience || job.exp === experience);
    }).sort((a, b) => {
      if (sortBy === "salary") return salaryValue(b) - salaryValue(a);
      if (sortBy === "match") return (b.match || 0) - (a.match || 0);
      return postedValue(b.posted) - postedValue(a.posted);
    });
  }, [publicJobs, keyword, location, jobType, category, experience, sortBy]);

  return (
    <Container className="py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-1">Khám phá cơ hội việc làm</h1>
        <p className="text-muted">{publicJobs.length} công việc đang nhận hồ sơ từ các nhà tuyển dụng</p>
      </div>

      <Row className="g-4">
        <Col lg={3} md={4}>
          <Card className="matcha-card p-3 shadow-sm border-0 sticky-top" style={{ top: "80px" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Bộ lọc tìm kiếm</h6>
              <Button variant="link" size="sm" className="p-0 text-muted text-decoration-none" onClick={handleReset}>Đặt lại</Button>
            </div>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Từ khóa</Form.Label>
              <Form.Control size="sm" placeholder="Vị trí, kỹ năng, công ty..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Địa điểm</Form.Label>
              <Form.Select size="sm" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Tất cả địa điểm</option>
                {locations.map((item) => <option value={item} key={item}>{item}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Hình thức làm việc</Form.Label>
              <Form.Select size="sm" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="">Tất cả hình thức</option>
                {jobTypes.map((item) => <option value={item} key={item}>{item}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Ngành nghề</Form.Label>
              <Form.Select size="sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tất cả ngành nghề</option>
                {categories.map((item) => <option value={item} key={item}>{item}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label className="small fw-semibold">Kinh nghiệm</Form.Label>
              <Form.Select size="sm" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option value="">Mọi mức kinh nghiệm</option>
                {experiences.map((item) => <option value={item} key={item}>{item}</option>)}
              </Form.Select>
            </Form.Group>
          </Card>
        </Col>

        <Col lg={9} md={8}>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div className="text-muted small">Tìm thấy <strong className="text-body">{filteredJobs.length}</strong> việc làm phù hợp</div>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="jobs-sort" className="small text-muted text-nowrap">Sắp xếp:</label>
              <Form.Select id="jobs-sort" size="sm" className="w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="new">Mới đăng gần đây</option>
                <option value="salary">Mức lương cao nhất</option>
                <option value="match">Độ phù hợp cao nhất</option>
              </Form.Select>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="matcha-card p-5 text-center border-0 shadow-sm">
              <div className="fs-1 text-muted mb-2"><i className="bi bi-search" /></div>
              <h5 className="fw-bold">Không tìm thấy việc làm phù hợp</h5>
              <p className="text-muted small">Thử đổi từ khóa hoặc bỏ bớt bộ lọc. Tin chưa được HR duyệt hoặc đã tạm dừng sẽ không xuất hiện.</p>
              <div><Button variant="outline-success" size="sm" onClick={handleReset}>Xóa bộ lọc</Button></div>
            </Card>
          ) : (
            <Row className="g-3">
              {filteredJobs.map((job, idx) => <Col lg={6} sm={12} key={job.id}><JobCard job={job} aosDelay={(idx % 4) * 80} /></Col>)}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
}