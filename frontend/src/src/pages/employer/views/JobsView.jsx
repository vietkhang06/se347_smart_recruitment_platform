import { useState, forwardRef } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import JobPreviewModal from "../components/JobPreviewModal";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

// Custom Dropdown Toggle without default Bootstrap arrow/caret
const CustomThreeDotsToggle = forwardRef(({ onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className="btn btn-sm border-0 rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
    style={{ width: "32px", height: "32px", backgroundColor: "var(--surface-2)", color: "var(--text)" }}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    <i className="bi bi-three-dots-vertical fs-6"></i>
  </button>
));
CustomThreeDotsToggle.displayName = "CustomThreeDotsToggle";

export default function JobsView({ jobs, setJobs, onOpenComposer, onNavigateCandidates }) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState([]);

  const filteredJobs = jobs.filter((j) => {
    const matchStatus = filterStatus === "all" ? true : j.status === filterStatus;
    const matchQuery =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const toggleJobStatus = (id) => {
    const nextStatus = mockStore.toggleJobStatus(id);
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status: nextStatus } : j)));
    showToast(`Đã chuyển trạng thái tin sang: ${nextStatus}`);
  };

  const handleDeleteJob = (id) => {
    mockStore.deleteJob(id);
    setJobs(jobs.filter((j) => j.id !== id));
    setSelectedJobIds((prev) => prev.filter((item) => item !== id));
  };

  const handleOpenPreview = (job) => {
    setSelectedJob(job);
    setShowPreviewModal(true);
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedJobIds(filteredJobs.map((j) => j.id));
    } else {
      setSelectedJobIds([]);
    }
  };

  const handleToggleSelectJob = (id) => {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkPause = () => {
    selectedJobIds.forEach((id) => mockStore.updateJob(id, { status: "Tạm dừng" }));
    setJobs(mockStore.getEmployerJobs("COMP-01"));
    showToast(`Đã tạm dừng ${selectedJobIds.length} tin tuyển dụng đã chọn`);
    setSelectedJobIds([]);
  };

  const handleBulkResume = () => {
    selectedJobIds.forEach((id) => mockStore.updateJob(id, { status: "Đang tuyển" }));
    setJobs(mockStore.getEmployerJobs("COMP-01"));
    showToast(`Đã mở lại ${selectedJobIds.length} tin tuyển dụng đã chọn`);
    setSelectedJobIds([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Xác nhận xóa ${selectedJobIds.length} tin tuyển dụng đã chọn?`)) {
      selectedJobIds.forEach((id) => mockStore.deleteJob(id));
      setJobs(mockStore.getEmployerJobs("COMP-01"));
      showToast(`Đã xóa vĩnh viễn ${selectedJobIds.length} tin tuyển dụng`);
      setSelectedJobIds([]);
    }
  };

  const filterOptions = [
    { key: "all", label: "Tất cả", count: jobs.length },
    { key: "Đang tuyển", label: "Đang tuyển", count: jobs.filter((j) => j.status === "Đang tuyển").length },
    { key: "Chờ duyệt", label: "Chờ duyệt", count: jobs.filter((j) => j.status === "Chờ duyệt").length },
    { key: "Tạm dừng", label: "Tạm dừng", count: jobs.filter((j) => j.status === "Tạm dừng").length },
    { key: "Đã đóng", label: "Đã đóng", count: jobs.filter((j) => j.status === "Đã đóng").length }
  ];

  const isAllSelected = filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length;
  const isPartiallySelected = selectedJobIds.length > 0 && !isAllSelected;

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div>
          <h5 className="fw-bold mb-0">Quản lý tin tuyển dụng</h5>
          <p className="text-muted small mb-0">Theo dõi toàn bộ các vị trí đã đăng, hiệu suất tiếp cận và trạng thái</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => showToast("Đã xuất danh sách tin tuyển dụng (.CSV)")}>
            <i className="bi bi-download me-1"></i>Xuất danh sách
          </Button>
          <Button variant="success" size="sm" className="fw-bold" onClick={onOpenComposer}>
            <i className="bi bi-plus-lg me-1"></i>Tạo tin mới
          </Button>
        </div>
      </div>

      {/* Modern Filter Pills & Search Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {filterOptions.map((item) => {
            const isActive = filterStatus === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`filter-pill ${isActive ? "active" : ""}`}
                onClick={() => setFilterStatus(item.key)}
              >
                <span>{item.label}</span>
                <span className="badge">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ maxWidth: 300, width: "100%" }}>
          <InputGroup size="sm">
            <InputGroup.Text style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--muted)" }}>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo vị trí, mã tin hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </InputGroup>
        </div>
      </div>

      {/* Bulk Action Banner when multiple rows selected */}
      {selectedJobIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success"></i>
            <span>Đã chọn <strong className="text-success">{selectedJobIds.length}</strong> tin tuyển dụng</span>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-warning"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkPause}
            >
              <i className="bi bi-pause-circle me-1"></i>Tạm dừng đã chọn
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkResume}
            >
              <i className="bi bi-play-circle me-1"></i>Mở lại đã chọn
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash me-1"></i>Xóa đã chọn
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              onClick={() => setSelectedJobIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Table of Jobs: Tiêu đề căn giữa text-nowrap, nội dung căn trái (JD, phòng ban, vị trí) & căn giữa (mã, số lượng, ngày, trạng thái, thao tác) */}
      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              {/* Checkbox chọn tất cả: Cố định 48px, căn giữa */}
              <th style={{ width: "48px", textAlign: "center" }}>
                <Form.Check
                  className="matcha-checkbox-wrap"
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Chọn tất cả tin tuyển dụng"
                />
              </th>
              <th className="text-center text-nowrap">Mã tin</th>
              <th className="text-center text-nowrap">Vị trí tuyển dụng</th>
              <th className="text-center text-nowrap">Phòng ban</th>
              <th className="text-center text-nowrap">Địa điểm</th>
              <th className="text-center text-nowrap">Ứng viên / Lượt xem</th>
              <th className="text-center text-nowrap">Ngày đăng</th>
              <th className="text-center text-nowrap">Trạng thái</th>
              {/* Cột Thao tác: width 100px text-nowrap để chữ THAO TÁC không bị ngắt đôi xuống dòng */}
              <th className="text-center text-nowrap" style={{ width: "100px", minWidth: "95px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  Không tìm thấy tin tuyển dụng nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredJobs.map((j) => {
                const isSelected = selectedJobIds.includes(j.id);
                return (
                  <tr key={j.id} className={isSelected ? "table-active" : ""}>
                    <td className="text-center">
                      <Form.Check
                        className="matcha-checkbox-wrap"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectJob(j.id)}
                        aria-label={`Chọn tin ${j.title}`}
                      />
                    </td>
                    <td className="text-center"><code>{j.id}</code></td>
                    <td className="text-start">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-start fw-bold text-body text-decoration-none d-block text-truncate"
                        style={{ maxWidth: "260px" }}
                        onClick={() => handleOpenPreview(j)}
                      >
                        {j.title}
                      </button>
                      {j.salary && <span className="small text-muted">{j.salary}</span>}
                    </td>
                    <td className="text-start">{j.team || "Engineering"}</td>
                    <td className="text-start"><i className="bi bi-geo-alt me-1 text-muted"></i>{j.location}</td>
                    <td className="text-center">
                      <strong className="text-body">{j.applicants || 0}</strong>
                      <span className="text-muted small"> / {j.views || 0} views</span>
                    </td>
                    <td className="text-center text-muted small">{j.posted}</td>
                    <td className="text-center">
                      <span
                        className={`status-badge ${
                          j.status === "Đang tuyển"
                            ? "status-badge-success"
                            : j.status === "Chờ duyệt"
                            ? "status-badge-warning"
                            : j.status === "Tạm dừng"
                            ? "status-badge-secondary"
                            : "status-badge-danger"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <Dropdown align="end">
                        <Dropdown.Toggle as={CustomThreeDotsToggle} />
                        <Dropdown.Menu className="matcha-dropdown-menu py-2">
                          <Dropdown.Item onClick={() => handleOpenPreview(j)} className="small py-2">
                            <i className="bi bi-eye text-primary me-2"></i>Xem chi tiết JD
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => {
                              if (onNavigateCandidates) onNavigateCandidates(j);
                            }}
                            className="small py-2"
                          >
                            <i className="bi bi-people text-info me-2"></i>Xem ứng viên ({j.applicants || 0})
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => showToast(`Đã sao chép liên kết chia sẻ cho ${j.title}`)}
                            className="small py-2"
                          >
                            <i className="bi bi-link-45deg text-secondary me-2"></i>Sao chép liên kết
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => toggleJobStatus(j.id)} className="small py-2">
                            <i className={`bi ${j.status === "Đang tuyển" ? "bi-pause-circle text-warning" : "bi-play-circle text-success"} me-2`}></i>
                            {j.status === "Đang tuyển" ? "Tạm dừng nhận đơn" : "Tiếp tục tuyển dụng"}
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => {
                              if (window.confirm(`Xác nhận xóa vĩnh viễn tin "${j.title}"?`)) {
                                handleDeleteJob(j.id);
                                showToast(`Đã xóa tin tuyển dụng ${j.id}`);
                              }
                            }}
                            className="small py-2 text-danger"
                          >
                            <i className="bi bi-trash text-danger me-2"></i>Xóa tin này
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

      {/* Quick View JD Modal */}
      <JobPreviewModal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        job={selectedJob}
        onToggleStatus={toggleJobStatus}
        onDeleteJob={handleDeleteJob}
        onViewCandidates={(job) => {
          if (onNavigateCandidates) onNavigateCandidates(job);
        }}
      />
    </Card>
  );
}
