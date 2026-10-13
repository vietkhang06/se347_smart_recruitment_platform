import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import { useFavorites } from "../../context/FavoritesContext";
import { useToast } from "../../context/ToastContext";
import { jobService } from "../../services/jobService";
import { ownApplications } from "../../services/applicationService";
import HRContactCard from "../../components/common/HRContactCard";
import CandidateApplyForm from "../../components/candidate/CandidateApplyForm";

export default function JobDetailPage() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState(() => jobService.getJobsSnapshot());
  const [, setApplications] = useState(() => ownApplications());
  const [showModal, setShowModal] = useState(false);

  const job = jobs.find((item) => String(item.id) === String(id));
  const hrProfile = jobService.getEmployerContact();
  const fav = job ? isFavorite(job.id) : false;

  const alreadyApplied = Boolean(
    job &&
      ownApplications().some(
        (application) => String(application.jobId) === String(job.id)
      )
  );

  useEffect(() => {
    const refresh = () => {
      setJobs(jobService.getJobsSnapshot());
      setApplications(ownApplications());
    };

    window.addEventListener("matchajob:store-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("matchajob:store-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!jobService.isAcceptingApplications(job)) {
    return (
      <Container className="py-5">
        <Card
          className="matcha-card p-5 text-center border-0 shadow-sm mx-auto"
          style={{ maxWidth: 640 }}
        >
          <i
            className="bi bi-search fs-1 text-muted mb-3"
            aria-hidden="true"
          />
          <h1 className="h4 fw-bold">Công việc không còn khả dụng</h1>
          <p className="text-muted">
            Tin có thể chưa được duyệt, đã tạm dừng, đóng hoặc đường dẫn
            không chính xác.
          </p>
          <div>
            <Link to="/jobs" className="btn btn-success">
              Khám phá việc làm khác
            </Link>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none">
              Trang chủ
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/jobs" className="text-decoration-none">
              Việc làm
            </Link>
          </li>
          <li
            className="breadcrumb-item active text-truncate"
            style={{ maxWidth: "300px" }}
          >
            {job.title}
          </li>
        </ol>
      </nav>

      <Row className="g-4">
        <Col lg={8}>
          <Card
            className="matcha-card p-4 mb-4 border-0 shadow-sm"
            data-aos="fade-up"
          >
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white fs-3 shadow-sm flex-shrink-0"
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "var(--primary)"
                }}
              >
                {job.logo || "FP"}
              </div>

              <div>
                <h1 className="h3 fw-bold mb-1">{job.title}</h1>
                <div className="text-muted fs-6">
                  <Link
                    to="/companies"
                    className="text-decoration-none text-muted fw-semibold"
                  >
                    {job.company}
                  </Link>
                  {" · "}
                  <span>{job.location}</span>
                </div>
              </div>
            </div>

            <div className="job-highlight-group my-3 pb-3 border-bottom">
              <span className="job-highlight-badge badge-salary">
                {String(job.salary || "Thỏa thuận")
                  .replace(
                    /(\d+),000,000\s*-\s*(\d+),000,000\s*Triệu VNĐ/i,
                    "$1 - $2 Triệu VNĐ"
                  )
                  .replace(
                    /(\d+),000,000\s*Triệu VNĐ/i,
                    "$1 Triệu VNĐ"
                  )}
              </span>

              <span className="job-highlight-badge">{job.type}</span>

              <span className="job-highlight-badge">
                {job.category || job.team || "Chuyên môn"}
              </span>

              <span className="job-highlight-badge">
                Kinh nghiệm: {job.exp || "1+ năm"}
              </span>

              {Number.isFinite(Number(job.match)) && job.match !== "" && (
                <span className="job-highlight-badge badge-match">
                  <i className="bi bi-stars me-1 text-success" />
                  {job.match}% Phù hợp
                </span>
              )}
            </div>

            {job.summary && (
              <div className="row g-2 mb-4">
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface h-100">
                    <div className="fw-bold small text-warning mb-1">
                      💡 Kiến thức ngành
                    </div>
                    <div className="small text-muted">
                      {job.summary.industry}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface h-100">
                    <div className="fw-bold small text-primary mb-1">
                      📐 Kỹ năng cần có
                    </div>
                    <div className="small text-muted">
                      {job.summary.required}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface h-100">
                    <div className="fw-bold small text-success mb-1">
                      ✏️ Kỹ năng nên có
                    </div>
                    <div className="small text-muted">
                      {job.summary.preferred}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(job.reqTags?.length > 0 || job.specTags?.length > 0) && (
              <div className="p-3 rounded-3 mb-4 bg-surface-2 border">
                <strong className="d-block small mb-2 text-muted">
                  TIÊU CHÍ VÀ CHUYÊN MÔN:
                </strong>

                <div className="d-flex flex-wrap gap-2">
                  {job.reqTags?.map((tag) => (
                    <Badge
                      bg="success"
                      className="bg-opacity-10 text-success p-2"
                      key={tag}
                    >
                      {tag}
                    </Badge>
                  ))}

                  {job.specTags?.map((tag) => (
                    <Badge
                      bg="secondary"
                      className="bg-opacity-10 text-body p-2"
                      key={tag}
                    >
                      <i className="bi bi-tag-fill me-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="content-detail py-2">
              <h5 className="fw-bold mb-3">Mô tả công việc</h5>

              {job.description ? (
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <p className="text-muted leading-relaxed">
                  {job.desc} Chúng tôi đang tìm kiếm những chuyên gia có
                  niềm đam mê mạnh mẽ với việc xây dựng sản phẩm xuất sắc,
                  giải quyết bài toán phức tạp và mang lại giá trị cao
                  nhất cho hàng triệu người sử dụng.
                </p>
              )}

              <h5 className="fw-bold mt-4 mb-3">Yêu cầu ứng viên</h5>

              {job.requirements ? (
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              ) : (
                <ul className="text-muted d-flex flex-column gap-2">
                  <li>
                    Kinh nghiệm làm việc từ {job.exp} trong lĩnh vực
                    tương đương.
                  </li>
                  <li>
                    Kỹ năng giao tiếp và làm việc nhóm tốt, tư duy phản
                    biện và giải quyết vấn đề hiệu quả.
                  </li>
                  <li>
                    Có tinh thần tự chủ, trách nhiệm cao trong công việc
                    và tinh thần học hỏi công nghệ liên tục.
                  </li>
                </ul>
              )}

              <h5 className="fw-bold mt-4 mb-3">Quyền lợi & Đãi ngộ</h5>

              {job.benefits ? (
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.benefits }}
                />
              ) : (
                <ul className="text-muted d-flex flex-column gap-2">
                  <li>
                    Mức thu nhập cạnh tranh từ{" "}
                    <strong>{job.salary}</strong> + Thưởng hiệu suất
                    cuối năm.
                  </li>
                  <li>
                    Gói bảo hiểm sức khỏe cao cấp cho nhân viên và người
                    thân.
                  </li>
                  <li>
                    Môi trường làm việc mở, trang bị thiết bị hiện đại
                    (MacBook Pro, màn hình 4K).
                  </li>
                  <li>
                    Chế độ làm việc linh hoạt (Flexible hours, Hybrid
                    working).
                  </li>
                </ul>
              )}

              {(job.schedule || job.address) && (
                <div className="mt-4">
                  <h5 className="fw-bold mb-3">
                    Thời gian & Địa điểm làm việc
                  </h5>

                  {job.schedule ? (
                    <div
                      className="text-muted leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: job.schedule }}
                    />
                  ) : (
                    <p className="text-muted">
                      <i className="bi bi-geo-alt-fill text-danger me-2" />
                      {job.address || job.location}
                    </p>
                  )}

                  {job.mapLink && (
                    <div className="mt-2">
                      <a
                        href={job.mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-success btn-sm"
                      >
                        <i className="bi bi-map me-1" />
                        Chỉ đường qua Google Maps ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <HRContactCard
                  contact={job.contact || hrProfile}
                  title="Thông tin liên hệ HR phụ trách"
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={4}>
          <Card
            className="matcha-card p-4 border-0 shadow-sm sticky-top"
            style={{ top: "80px" }}
            data-aos="fade-left"
          >
            <h5 className="fw-bold mb-3">Sẵn sàng gia nhập?</h5>

            <p className="text-muted small">
              Nhà tuyển dụng sẽ phản hồi hồ sơ của bạn trong vòng
              24–48 giờ làm việc.
            </p>

            <div className="d-grid gap-2 mb-3">
              <Button
                variant={alreadyApplied ? "outline-success" : "success"}
                size="lg"
                className="fw-bold"
                disabled={alreadyApplied}
                onClick={() => setShowModal(true)}
              >
                <i
                  className={`bi ${
                    alreadyApplied ? "bi-check-circle-fill" : "bi-send-fill"
                  } me-2`}
                />
                {alreadyApplied ? "Đã nộp hồ sơ" : "Ứng tuyển ngay"}
              </Button>

              {alreadyApplied && (
                <small className="text-success text-center">
                  Bạn đã ứng tuyển vị trí này. Theo dõi tiến trình tại
                  mục Hồ sơ đã nộp.
                </small>
              )}

              <Button
                variant={fav ? "outline-danger" : "outline-secondary"}
                onClick={() => toggleFavorite(job.id)}
                className="fw-medium"
              >
                <i
                  className={`bi ${
                    fav ? "bi-heart-fill text-danger" : "bi-heart"
                  } me-2`}
                />
                {fav ? "Đã lưu việc làm" : "Lưu việc làm"}
              </Button>
            </div>

            <hr />

            <div className="d-flex flex-column gap-3 small">
              <div>
                <span className="text-muted d-block">
                  Công ty tuyển dụng
                </span>
                <strong className="fs-6">{job.company}</strong>
              </div>

              <div>
                <span className="text-muted d-block">
                  Địa điểm làm việc
                </span>
                <strong>{job.location}</strong>
              </div>

              <div>
                <span className="text-muted d-block">Hình thức</span>
                <strong>{job.type}</strong>
              </div>

              <div>
                <span className="text-muted d-block">Hạn nộp hồ sơ</span>
                <strong>{job.deadline || "15/10/2026"}</strong>
              </div>

              <div>
                <span className="text-muted d-block">Mức thu nhập</span>
                <strong className="text-success">{job.salary}</strong>
              </div>

              <div>
                <span className="text-muted d-block">HR phụ trách</span>
                <strong>{job.contact?.name || hrProfile.name}</strong>
                <div className="text-muted">
                  {job.contact?.email || hrProfile.email}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">
            Ứng tuyển: {job.title}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <CandidateApplyForm
            job={job}
            onSuccess={() => {
              setApplications(ownApplications());
              setShowModal(false);
              showToast("Đã gửi hồ sơ và CV thành công!");
            }}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
}