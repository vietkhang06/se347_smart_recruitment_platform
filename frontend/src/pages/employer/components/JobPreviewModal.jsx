import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useToast } from "../../../context/ToastContext";

export default function JobPreviewModal({ show, onHide, job, onToggleStatus, onDeleteJob, onViewCandidates }) {
  const { showToast } = useToast();

  if (!job) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
            style={{ width: "48px", height: "48px", backgroundColor: "var(--primary)" }}
          >
            {job.logo || "FP"}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <code className="small">{job.id}</code>
              <Badge
                bg={
                  job.status === "Đang tuyển"
                    ? "success"
                    : job.status === "Chờ duyệt"
                    ? "warning"
                    : job.status === "Tạm dừng"
                    ? "secondary"
                    : "danger"
                }
              >
                {job.status}
              </Badge>
            </div>
            <Modal.Title className="fw-bold fs-5 mb-0">{job.title}</Modal.Title>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Quick Highlights Bar */}
        <div className="p-3 rounded bg-surface-2 border mb-4">
          <Row className="g-3">
            <Col sm={4}>
              <div className="small text-muted mb-1">Mức thu nhập:</div>
              <strong className="text-success fs-6">{job.salary || "Thỏa thuận"}</strong>
            </Col>
            <Col sm={4}>
              <div className="small text-muted mb-1">Địa điểm & Phòng ban:</div>
              <strong>{job.location} · {job.team || "Engineering"}</strong>
            </Col>
            <Col sm={4}>
              <div className="small text-muted mb-1">Lượt nộp / Lượt xem:</div>
              <strong className="text-primary">{job.applicants || 0} hồ sơ</strong>
              <span className="text-muted small"> / {job.views || 0} views</span>
            </Col>
          </Row>
        </div>

        {/* Requirements & Specialization Tags */}
        <div className="mb-4">
          <h6 className="fw-bold text-success mb-2">Thẻ kỹ năng & Tiêu chuẩn</h6>
          <div className="d-flex flex-wrap gap-2">
            {job.specTags?.map((tag) => (
              <Badge bg="success" className="bg-opacity-10 text-success p-2" key={tag}>
                <i className="bi bi-tag-fill me-1"></i>{tag}
              </Badge>
            ))}
            {job.reqTags?.map((tag) => (
              <Badge bg="secondary" className="bg-opacity-10 text-body p-2" key={tag}>
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* 3 Summary Bullets */}
        {job.summary && (
          <div className="p-3 rounded bg-surface border mb-4">
            <div className="row g-2 small">
              <div className="col-md-4">
                <span className="fw-bold text-success d-block">💡 Ngành nghề:</span>
                <span className="text-muted">{job.summary.industry}</span>
              </div>
              <div className="col-md-4">
                <span className="fw-bold text-success d-block">📐 Kỹ năng cần có:</span>
                <span className="text-muted">{job.summary.required}</span>
              </div>
              <div className="col-md-4">
                <span className="fw-bold text-success d-block">✏️ Kỹ năng nên có:</span>
                <span className="text-muted">{job.summary.preferred}</span>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <h6 className="fw-bold text-success border-bottom pb-2">Mô tả công việc</h6>
          {job.description ? (
            <div className="small text-body" dangerouslySetInnerHTML={{ __html: job.description }} />
          ) : (
            <p className="small text-muted">{job.desc}</p>
          )}
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="mb-4">
            <h6 className="fw-bold text-success border-bottom pb-2">Yêu cầu ứng viên</h6>
            <div className="small text-body" dangerouslySetInnerHTML={{ __html: job.requirements }} />
          </div>
        )}

        {/* Benefits */}
        {job.benefits && (
          <div className="mb-4">
            <h6 className="fw-bold text-success border-bottom pb-2">Quyền lợi & Đãi ngộ</h6>
            <div className="small text-body" dangerouslySetInnerHTML={{ __html: job.benefits }} />
          </div>
        )}

        {/* Work Location & Map */}
        <div>
          <h6 className="fw-bold text-success border-bottom pb-2">Địa điểm làm việc</h6>
          <p className="small text-muted mb-2">
            <i className="bi bi-geo-alt-fill text-danger me-1"></i>
            {job.address || job.location}
          </p>
          {job.mapLink && (
            <a
              href={job.mapLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-success btn-sm"
            >
              <i className="bi bi-map me-1"></i>Mở bản đồ chỉ đường Google Maps
            </a>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => {
            if (window.confirm(`Bạn có chắc chắn muốn xóa tin tuyển dụng "${job.title}"?`)) {
              onDeleteJob(job.id);
              onHide();
              showToast(`Đã xóa tin tuyển dụng ${job.id}`);
            }
          }}
        >
          <i className="bi bi-trash me-1"></i>Xóa tin
        </Button>

        <div className="d-flex gap-2">
          {onViewCandidates && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                onHide();
                onViewCandidates(job);
              }}
            >
              <i className="bi bi-people me-1"></i>Xem ứng viên ({job.applicants || 0})
            </Button>
          )}
          <Button
            variant={job.status === "Đang tuyển" ? "outline-warning" : "outline-success"}
            size="sm"
            onClick={() => {
              onToggleStatus(job.id);
            }}
          >
            <i className={`bi ${job.status === "Đang tuyển" ? "bi-pause-fill" : "bi-play-fill"} me-1`}></i>
            {job.status === "Đang tuyển" ? "Tạm dừng tin" : "Mở lại tin"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onHide}>
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
