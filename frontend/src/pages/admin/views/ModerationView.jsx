import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import ModerationModal from "../components/ModerationModal";
import CustomThreeDotsToggle from "../../../components/common/CustomThreeDotsToggle";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function ModerationView({ reviews, setReviews }) {
  const { showToast } = useToast();
  const [activeSegment, setActiveSegment] = useState("jobs"); // "jobs" | "companies" | "processed"
  const [selectedReviewIds, setSelectedReviewIds] = useState([]);

  // Modal State
  const [modalAction, setModalAction] = useState(null); // "approve" | "reject"
  const [selectedReview, setSelectedReview] = useState(null);

  const pendingJobsCount = reviews.filter((r) => (r.type === "job" || !r.type) && (r.status === "Chờ duyệt" || r.status === "Cần kiểm tra")).length;
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
    return (r.type === "job" || !r.type) && (r.status === "Chờ duyệt" || r.status === "Cần kiểm tra");
  });

  const isAllSelected = filteredReviews.length > 0 && selectedReviewIds.length === filteredReviews.length;
  const isPartiallySelected = selectedReviewIds.length > 0 && selectedReviewIds.length < filteredReviews.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedReviewIds([]);
    } else {
      setSelectedReviewIds(filteredReviews.map((r) => r.id));
    }
  };

  const handleToggleSelectReview = (id) => {
    setSelectedReviewIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    selectedReviewIds.forEach((id) => mockStore.approveReview(id, "Phê duyệt hàng loạt bởi quản trị viên"));
    setReviews(mockStore.getReviews());
    showToast(`Đã phê duyệt thành công ${selectedReviewIds.length} hồ sơ`);
    setSelectedReviewIds([]);
  };

  const handleBulkReject = () => {
    selectedReviewIds.forEach((id) => mockStore.rejectReview(id, "Từ chối hàng loạt do không đạt tiêu chuẩn"));
    setReviews(mockStore.getReviews());
    showToast(`Đã từ chối ${selectedReviewIds.length} hồ sơ`);
    setSelectedReviewIds([]);
  };

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

      {/* Modern Filter Pills */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <button
          type="button"
          className={`filter-pill ${activeSegment === "jobs" ? "active" : ""}`}
          onClick={() => setActiveSegment("jobs")}
        >
          <span>Tin tuyển dụng chờ duyệt</span>
          <span className="badge">{pendingJobsCount}</span>
        </button>
        <button
          type="button"
          className={`filter-pill ${activeSegment === "companies" ? "active" : ""}`}
          onClick={() => setActiveSegment("companies")}
        >
          <span>Doanh nghiệp xác minh</span>
          <span className="badge">{pendingCompaniesCount}</span>
        </button>
        <button
          type="button"
          className={`filter-pill ${activeSegment === "processed" ? "active" : ""}`}
          onClick={() => setActiveSegment("processed")}
        >
          <span>Đã xử lý</span>
          <span className="badge">{processedCount}</span>
        </button>
      </div>

      {/* Bulk Action Banner */}
      {selectedReviewIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success"></i>
            <span>Đã chọn <strong className="text-success">{selectedReviewIds.length}</strong> hồ sơ kiểm duyệt</span>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkApprove}
            >
              <i className="bi bi-check2-all me-1"></i>Duyệt tất cả đã chọn
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkReject}
            >
              <i className="bi bi-x-circle me-1"></i>Từ chối đã chọn
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              onClick={() => setSelectedReviewIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Review Queue Table */}
      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: "48px", textAlign: "center" }}>
                <Form.Check
                  className="matcha-checkbox-wrap"
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Chọn tất cả hồ sơ"
                />
              </th>
              <th className="text-center text-nowrap" style={{ width: "110px" }}>Mã đối soát</th>
              <th className="text-start text-nowrap">Tiêu đề / Đối tượng</th>
              <th className="text-start text-nowrap">Đơn vị gửi duyệt</th>
              <th className="text-center text-nowrap">Đánh giá rủi ro AI</th>
              <th className="text-center text-nowrap">Thời gian nộp</th>
              <th className="text-center text-nowrap">Trạng thái</th>
              <th className="text-center text-nowrap" style={{ width: "80px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  Hàng đợi kiểm duyệt hiện đang trống. Tuyệt vời!
                </td>
              </tr>
            ) : (
              filteredReviews.map((r) => {
                const isProcessed = r.status === "Đã duyệt" || r.status === "Đã từ chối";
                const isSelected = selectedReviewIds.includes(r.id);
                return (
                  <tr key={r.id} className={isSelected ? "table-active" : ""}>
                    <td className="text-center">
                      <Form.Check
                        className="matcha-checkbox-wrap"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectReview(r.id)}
                        aria-label={`Chọn hồ sơ ${r.id}`}
                      />
                    </td>
                    <td className="text-center"><code>{r.id}</code></td>
                    <td className="text-start">
                      <strong className="d-block text-body">{r.title}</strong>
                      <span className="small text-muted">{r.details || (r.type === "company" ? "Hồ sơ xác minh ĐKKD" : "Tin đăng mới")}</span>
                    </td>
                    <td className="text-start">
                      <span className="fw-semibold text-body">{r.company}</span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          r.risk === "Cao"
                            ? "status-badge-danger"
                            : r.risk === "Trung bình"
                            ? "status-badge-warning"
                            : "status-badge-success"
                        }`}
                      >
                        {r.risk === "Cao" && <i className="bi bi-shield-exclamation me-1"></i>}
                        Rủi ro: {r.risk}
                      </span>
                    </td>
                    <td className="text-center text-muted small">{r.submitted}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          r.status === "Đã duyệt"
                            ? "status-badge-success"
                            : r.status === "Đã từ chối"
                            ? "status-badge-danger"
                            : r.status === "Cần kiểm tra"
                            ? "status-badge-warning"
                            : "status-badge-info"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <Dropdown align="end">
                        <Dropdown.Toggle as={CustomThreeDotsToggle} />
                        <Dropdown.Menu className="matcha-dropdown-menu py-2">
                          {!isProcessed ? (
                            <>
                              <Dropdown.Item
                                onClick={() => handleOpenModeration(r, "approve")}
                                className="small py-2 text-success"
                              >
                                <i className="bi bi-check2-circle text-success me-2"></i>Phê duyệt nội dung
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleOpenModeration(r, "reject")}
                                className="small py-2 text-danger"
                              >
                                <i className="bi bi-x-circle text-danger me-2"></i>Từ chối nội dung
                              </Dropdown.Item>
                              <Dropdown.Divider />
                            </>
                          ) : (
                            <>
                              <Dropdown.Item disabled className="small py-2 text-muted fst-italic">
                                <i className="bi bi-info-circle me-2"></i>Ghi chú: {r.note || "Đã hoàn tất"}
                              </Dropdown.Item>
                              <Dropdown.Divider />
                            </>
                          )}
                          <Dropdown.Item
                            onClick={() => {
                              navigator.clipboard?.writeText(r.id);
                              showToast(`Đã sao chép mã đối soát ${r.id}`);
                            }}
                            className="small py-2"
                          >
                            <i className="bi bi-copy text-secondary me-2"></i>Sao chép mã đối soát
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => showToast(`Chi tiết đối tượng: ${r.title} (${r.company})`)}
                            className="small py-2"
                          >
                            <i className="bi bi-eye text-primary me-2"></i>Xem tóm tắt thông tin
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
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
