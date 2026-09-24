import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { MATCHAJOB_DATA } from "../../services/data";
import JobCard from "../../components/jobs/JobCard";

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobType, setJobType] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("match");

  // Sync params with URL if change
  useEffect(() => {
    const q = searchParams.get("q");
    const loc = searchParams.get("location");
    if (q !== null) setKeyword(q);
    if (loc !== null) setLocation(loc);
  }, [searchParams]);

  const handleReset = () => {
    setKeyword("");
    setLocation("");
    setJobType("");
    setCategory("");
    setSortBy("match");
    setSearchParams({});
  };

  const filteredJobs = useMemo(() => {
    return MATCHAJOB_DATA.jobs.filter(job => {
      const q = keyword.toLowerCase().trim();
      const matchKeyword = !q || 
        job.title.toLowerCase().includes(q) || 
        job.company.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q);

      const matchLocation = !location || job.location.includes(location);
      const matchType = !jobType || job.type === jobType;
      const matchCat = !category || job.category === category;

      return matchKeyword && matchLocation && matchType && matchCat;
    }).sort((a, b) => {
      if (sortBy === "match") return b.match - a.match;
      if (sortBy === "salary") return parseInt(b.salary) - parseInt(a.salary);
      return b.id - a.id;
    });
  }, [keyword, location, jobType, category, sortBy]);

  return (
    <Container className="py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-1">Khám phá cơ hội việc làm</h1>
        <p className="text-muted">Tìm kiếm trong {MATCHAJOB_DATA.jobs.length} việc làm công nghệ & sản phẩm chọn lọc</p>
      </div>

      <Row className="g-4">
        {/* Sidebar Filters */}
        <Col lg={3} md={4}>
          <Card className="matcha-card p-3 shadow-sm border-0 sticky-top" style={{ top: "80px" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Bộ lọc tìm kiếm</h6>
              <Button variant="link" size="sm" className="p-0 text-muted text-decoration-none" onClick={handleReset}>
                Đặt lại
              </Button>
            </div>

            {/* Keyword Input */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Từ khóa</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                placeholder="Vị trí, kỹ năng..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </Form.Group>

            {/* Location Select */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Địa điểm</Form.Label>
              <Form.Select 
                size="sm" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Tất cả địa điểm</option>
                <option value="TP.HCM">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </Form.Select>
            </Form.Group>

            {/* Job Type Select */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Hình thức làm việc</Form.Label>
              <Form.Select 
                size="sm" 
                value={jobType} 
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="">Tất cả hình thức</option>
                <option value="Toàn thời gian">Toàn thời gian</option>
                <option value="Hybrid">Hybrid</option>
              </Form.Select>
            </Form.Group>

            {/* Category Select */}
            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Ngành nghề</Form.Label>
              <Form.Select 
                size="sm" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Tất cả ngành nghề</option>
                <option value="Công nghệ">Công nghệ thông tin</option>
                <option value="Thiết kế">Thiết kế / Sáng tạo</option>
                <option value="Dữ liệu">Dữ liệu & Phân tích</option>
                <option value="Kinh doanh">Kinh doanh / BA</option>
              </Form.Select>
            </Form.Group>
          </Card>
        </Col>

        {/* Job Listings Area */}
        <Col lg={9} md={8}>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div className="text-muted small">
              Tìm thấy <strong className="text-body">{filteredJobs.length}</strong> việc làm phù hợp
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted text-nowrap">Sắp xếp:</span>
              <Form.Select 
                size="sm" 
                className="w-auto"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="match">Độ phù hợp cao nhất</option>
                <option value="salary">Mức lương cao nhất</option>
                <option value="new">Mới đăng gần đây</option>
              </Form.Select>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="matcha-card p-5 text-center border-0 shadow-sm">
              <div className="fs-1 text-muted mb-2"><i className="bi bi-search"></i></div>
              <h5 className="fw-bold">Không tìm thấy việc làm phù hợp</h5>
              <p className="text-muted small">Vui lòng thử tìm kiếm bằng từ khóa khác hoặc bỏ bớt các bộ lọc đang chọn.</p>
              <div>
                <Button variant="outline-success" size="sm" onClick={handleReset}>
                  Xóa bộ lọc
                </Button>
              </div>
            </Card>
          ) : (
            <Row className="g-3">
              {filteredJobs.map((job, idx) => (
                <Col lg={6} sm={12} key={job.id}>
                  <JobCard job={job} aosDelay={(idx % 4) * 80} />
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
}
