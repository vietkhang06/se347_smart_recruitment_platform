import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import ModerationModal from "../components/ModerationModal";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function ModerationView({ reviews, setReviews }) {
  const { showToast } = useToast();
  const [activeSegment, setActiveSegment] = useState("jobs"); // "jobs" | "companies" | "processed"

  // Modal State
  const [modalAction, setModalAction] = useState(null); // "approve" | "reject"
  const [selectedReview, setSelectedReview] = useState(null);

  const pendingJobsCount = reviews.filter((r) => r.type === "job" && (r.status === "Chờ duyệt" || r.status === "Cần kiểm tra")).length;
  const pendingCompaniesCount = reviews.filter((r) => r.type === "company" && (r.status === "Chờ xác minh" || r.status === "Cần kiểm tra")).length;
  const processedCount = reviews.filter((r) => r.status === "Đã duyệt" || r.status === "Đã từ chối").length;

  const filteredReviews = reviews.filter((r) => {
    if (activeSegment === "processed") {
      return r.status === "Đã duyệt" || r.status === "Đã từ chối";
    }
    if (activeSegment === "companies") {
      return r.type === "company" && (r.status === "Chờ xác minh" || r.status === "Cần kiểm tra");
    }
    // "jobs"
    return r.type === "job" && (r.status === "Chờ duyệt" || r.status === "Cần kiểm tra");
  });

  const handleOpenModeration = (review, action) => {
    setSelectedReview(review);
    setModalAction(action);
  };

  const handleConfirmModeration = (id, newStatus, note) => {
    if (newStatus === "Đã duyệt") {
      mockStore.approveReview(id, note);
    } else {
      mockStore.rejectReview(id, note);
    }

    setReviews(mockStore.getReviews());
    showToast(`${newStatus === "Đã duyệt" ? "Đã phê duyệt" : "Đã từ chối"} hồ sơ ${id}`);
    setModalAction(null);
    setSelectedReview(null);
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Trung tâm kiểm duyệt nội dung (Content Moderation)</h5>
          <p className="text-muted small mb-0">Đối soát tin tuyển dụng và hồ sơ doanh nghiệp trước khi hiển thị công khai</p>
        </div>
        <Button variant="outline-dark" size="sm" onClick={() => showToast("Đã mở cấu hình bộ lọc AI kiểm duyệt tự động")}>
          <i className="bi bi-gear me-1"></i>Cấu hình quy tắc AI
        </Button>
      </div>

      {/* Segmented Filter */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "jobs" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("jobs")}
        >
          Tin tuyển dụng chờ duyệt ({pendingJobsCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "companies" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("companies")}
        >
          Doanh nghiệp xác minh ({pendingCompaniesCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "processed" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("processed")}
        >
          Đã xử lý ({processedCount})
        </button>
      </div>

      {/* Review Queue Table */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã đối soát</th>
              <th>Tiêu đề / Đối tượng</th>
              <th>Đơn vị gửi duyệt</th>
              <th>Đánh giá rủi ro AI</th>
              <th>Thời gian nộp</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  Hàng đợi kiểm duyệt hiện đang trống. Tuyệt vời!
                </td>
              </tr>
            ) : (
              filteredReviews.map((r) => {
                const isProcessed = r.status === "Đã duyệt" || r.status === "Đã từ chối";
                return (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td>
                      <strong className="d-block text-body">{r.title}</strong>
                      <span className="small text-muted">{r.details || (r.type === "company" ? "Hồ sơ xác minh ĐKKD" : "Tin đăng mới")}</span>
                    </td>
                    <td>
                      <span className="fw-semibold">{r.company}</span>
                    </td>
                    <td>
                      <Badge bg={r.risk === "Cao" ? "danger" : r.risk === "Trung bình" ? "warning" : "success"}>
                        {r.risk === "Cao" && <i className="bi bi-shield-exclamation me-1"></i>}
                        Rủi ro: {r.risk}
                      </Badge>
                    </td>
                    <td className="small text-muted">{r.submitted}</td>
                    <td>
                      <Badge
                        bg={
                          r.status === "Đã duyệt"
                            ? "success"
                            : r.status === "Đã từ chối"
                            ? "danger"
                            : r.status === "Cần kiểm tra"
                            ? "warning"
                            : "primary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      {isProcessed ? (
                        <span className="small text-muted fst-italic">
                          {r.note ? `"${r.note}"` : "Đã hoàn tất"}
                        </span>
                      ) : (
                        <div className="d-flex gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            title="Phê duyệt nội dung"
                            onClick={() => handleOpenModeration(r, "approve")}
                          >
                            <i className="bi bi-check-lg me-1"></i>Duyệt
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="Từ chối nội dung"
                            onClick={() => handleOpenModeration(r, "reject")}
                          >
                            <i className="bi bi-x-lg me-1"></i>Từ chối
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Moderation Confirmation Modal */}
      <ModerationModal
        show={modalAction !== null}
        onHide={() => {
          setModalAction(null);
          setSelectedReview(null);
        }}
        review={selectedReview}
        action={modalAction}
        onConfirm={handleConfirmModeration}
      />
    </Card>
  );
}
