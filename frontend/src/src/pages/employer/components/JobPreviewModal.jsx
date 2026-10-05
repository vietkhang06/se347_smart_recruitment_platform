import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";
import HRContactCard from "../../../components/common/HRContactCard";

export default function JobPreviewModal({ show, onHide, job, onToggleStatus, onDeleteJob, onViewCandidates }) {
  const { showToast } = useToast();

  if (!job) return null;

  const hrProfile = mockStore.getEmployerProfile();

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton className="border-bottom">
        <div className="d-flex align-items-center gap-3 pe-3">
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
            <Modal.Title className="fw-bold fs-5 mb-0 text-body">{job.title}</Modal.Title>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ backgroundColor: "var(--bg)" }}>
        {/* NỘI DUNG CHI TIẾT CÔNG VIỆC TOÀN ĐỘ RỘNG */}
        <div className="p-4 border rounded-3 bg-surface shadow-sm w-100">
          {/* Header: Company & Title */}
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white fs-3 shadow-sm flex-shrink-0"
              style={{ width: "64px", height: "64px", backgroundColor: "var(--primary)" }}
            >
              {job.logo || "FP"}
            </div>
            <div>
              <h1 className="h3 fw-bold mb-1 text-body">{job.title}</h1>
              <div className="text-muted fs-6">
                <span className="text-muted fw-semibold">{job.company || "FPT Digital Talent"}</span> · <span>{job.location}</span>
              </div>
            </div>
          </div>

          {/* Badges row: salary, type, category, exp, match (Căn giữa tuyệt đối & kích cỡ hài hòa) */}
          <div className="job-highlight-group my-3 pb-3 border-bottom">
            <span className="job-highlight-badge badge-salary">
              {String(job.salary || "Thỏa thuận")
                .replace(/(\d+),000,000\s*-\s*(\d+),000,000\s*Triệu VNĐ/i, "$1 - $2 Triệu VNĐ")
                .replace(/(\d+),000,000\s*Triệu VNĐ/i, "$1 Triệu VNĐ")}
            </span>
            <span className="job-highlight-badge">{job.type || "Toàn thời gian"}</span>
            <span className="job-highlight-badge">{job.category || job.team || "Chuyên môn"}</span>
            <span className="job-highlight-badge">Kinh nghiệm: {job.exp || "1+ năm"}</span>
            <span className="job-highlight-badge badge-match">
              <i className="bi bi-stars me-1 text-success"></i>{job.match || 95}% Phù hợp
            </span>
          </div>

          {/* 3 Summary Cards if available */}
          {job.summary && (
            <div className="row g-2 mb-4">
              <div className="col-md-4">
                <div className="p-3 border rounded-3 bg-surface-2 h-100">
                  <div className="fw-bold small text-warning mb-1">💡 Kiến thức ngành</div>
                  <div className="small text-muted">{job.summary.industry}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 border rounded-3 bg-surface-2 h-100">
                  <div className="fw-bold small text-primary mb-1">📐 Kỹ năng cần có</div>
                  <div className="small text-muted">{job.summary.required}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 border rounded-3 bg-surface-2 h-100">
                  <div className="fw-bold small text-success mb-1">✏️ Kỹ năng nên có</div>
                  <div className="small text-muted">{job.summary.preferred}</div>
                </div>
              </div>
            </div>
          )}

          {/* Skill tags */}
          {(job.reqTags?.length > 0 || job.specTags?.length > 0) && (
            <div className="p-3 rounded-3 mb-4 bg-surface-2 border">
              <strong className="d-block small mb-2 text-muted">TIÊU CHÍ VÀ CHUYÊN MÔN:</strong>
              <div className="d-flex flex-wrap gap-2">
                {job.reqTags?.map((t) => (
                  <Badge bg="success" className="bg-opacity-10 text-success p-2" key={t}>
                    {t}
                  </Badge>
                ))}
                {job.specTags?.map((t) => (
                  <Badge bg="secondary" className="bg-opacity-10 text-body p-2" key={t}>
                    <i className="bi bi-tag-fill me-1"></i>{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content Detail */}
          <div className="content-detail py-2">
            <h5 className="fw-bold mb-3 text-body">Mô tả công việc</h5>
            {job.description ? (
              <div className="text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: job.description }} />
            ) : (
              <p className="text-muted leading-relaxed">
                {job.desc || "Chúng tôi đang tìm kiếm các ứng viên tiềm năng tham gia vào đội ngũ phát triển sản phẩm xuất sắc..."}
              </p>
            )}

            <h5 className="fw-bold mt-4 mb-3 text-body">Yêu cầu ứng viên</h5>
            {job.requirements ? (
              <div className="text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: job.requirements }} />
            ) : (
              <ul className="text-muted d-flex flex-column gap-2">
                <li>Kinh nghiệm làm việc từ {job.exp || "1 năm"} trong lĩnh vực liên quan.</li>
                <li>Khả năng làm việc độc lập, tư duy phản biện và tinh thần trách nhiệm cao.</li>
                <li>Kỹ năng giao tiếp và làm việc nhóm hiệu quả.</li>
              </ul>
            )}

            <h5 className="fw-bold mt-4 mb-3 text-body">Quyền lợi & Đãi ngộ</h5>
            {job.benefits ? (
              <div className="text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: job.benefits }} />
            ) : (
              <ul className="text-muted d-flex flex-column gap-2">
                <li>Mức thu nhập cạnh tranh: <strong>{job.salary || "Thỏa thuận"}</strong> + Thưởng dự án.</li>
                <li>Bảo hiểm sức khỏe cao cấp và kiểm tra sức khỏe định kỳ hàng năm.</li>
                <li>Môi trường làm việc mở, trang bị máy tính và thiết bị công nghệ hiện đại.</li>
              </ul>
            )}

            {/* Working Schedule & Location */}
            {(job.schedule || job.address) && (
              <div className="mt-4">
                <h5 className="fw-bold mb-3 text-body">Thời gian & Địa điểm làm việc</h5>
                {job.schedule ? (
                  <div className="text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: job.schedule }} />
                ) : (
                  <p className="text-muted">
                    <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                    {job.address || job.location}
                  </p>
                )}
                {job.mapLink && (
                  <div className="mt-2">
                    <a href={job.mapLink} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm">
                      <i className="bi bi-map me-1"></i>Chỉ đường qua Google Maps ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* THÔNG TIN LIÊN HỆ HR */}
            <div className="mt-4">
              <HRContactCard
                contact={job.contact || hrProfile}
                title="Thông tin liên hệ HR phụ trách"
              />
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2 border-top bg-surface">
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
          <i className="bi bi-trash me-1"></i>Xóa tin này
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
