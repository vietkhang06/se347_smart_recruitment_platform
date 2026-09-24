import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import ModerationModal from "../components/ModerationModal";
import { useToast } from "../../../context/ToastContext";

export default function ModerationView({ reviews, setReviews }) {
  const { showToast } = useToast();
  const [activeSegment, setActiveSegment] = useState("jobs"); // "jobs" | "companies" | "processed"

  // Modal State
  const [modalAction, setModalAction] = useState(null); // "approve" | "reject"
  const [selectedReview, setSelectedReview] = useState(null);

  const filteredReviews = reviews.filter((r) => {
    if (activeSegment === "processed") {
      return r.status === "Đã duyệt" || r.status === "Đã từ chối";
    }
    if (activeSegment === "companies") {
      return r.company && (r.title.includes("Doanh nghiệp") || r.company.includes("Retail"));
    }
    // "jobs" (default pending jobs)
    return r.status === "Chờ duyệt" || r.status === "Cần kiểm tra";
  });

  const handleOpenModeration = (review, action) => {
    setSelectedReview(review);
    setModalAction(action);
  };

  const handleConfirmModeration = (id, newStatus, note) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus, note } : r))
    );
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
      <div className="d-flex gap-2 mb-3">
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "jobs" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("jobs")}
        >
          Tin tuyển dụng chờ duyệt ({reviews.filter((r) => r.status === "Chờ duyệt" || r.status === "Cần kiểm tra").length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "companies" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("companies")}
        >
          Doanh nghiệp xác minh (2)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSegment === "processed" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
          onClick={() => setActiveSegment("processed")}
        >
          Đã xử lý ({reviews.filter((r) => r.status === "Đã duyệt" || r.status === "Đã từ chối").length})
        </button>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã hồ sơ</th>
              <th>Tiêu đề tin / Doanh nghiệp</th>
              <th>Đơn vị gửi</th>
              <th>Đánh giá rủi ro</th>
              <th>Thời gian gửi</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  Không có nội dung nào trong danh mục này.
                </td>
              </tr>
            ) : (
              filteredReviews.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td className="fw-semibold">{r.title}</td>
                  <td>{r.company}</td>
                  <td>
                    <Badge bg={r.risk === "Cao" ? "danger" : "success"} className="p-2">
                      {r.risk}
                    </Badge>
                  </td>
                  <td className="text-muted small">{r.submitted}</td>
                  <td>
                    <Badge
                      bg={
                        r.status === "Đã duyệt"
                          ? "success"
                          : r.status === "Đã từ chối"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td>
                    {r.status === "Chờ duyệt" || r.status === "Cần kiểm tra" ? (
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleOpenModeration(r, "approve")}
                        >
                          <i className="bi bi-check-lg"></i> Duyệt
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleOpenModeration(r, "reject")}
                        >
                          <i className="bi bi-x-lg"></i> Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted small">Đã hoàn thành</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Moderation Modal */}
      <ModerationModal
        show={modalAction !== null}
        onHide={() => setModalAction(null)}
        review={selectedReview}
        action={modalAction}
        onConfirm={handleConfirmModeration}
      />
    </Card>
  );
}
