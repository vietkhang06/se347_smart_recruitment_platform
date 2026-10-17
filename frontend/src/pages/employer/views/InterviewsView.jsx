import { useState, forwardRef } from "react";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import Alert from "react-bootstrap/Alert";
import { useToast } from "../../../context/ToastContext";
import {
  interviewTime,
  interviewClosed,
  safeMeetingLink
} from "../../../services/mockStore";
import { interviewService } from "../../../services";
import MatchaDatePicker from "../../../components/common/MatchaDatePicker";

// Nút 3 chấm thao tác tùy biến đồng bộ với JobsView và CandidatesView
const CustomThreeDotsToggle = forwardRef(({ onClick, disabled }, ref) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    aria-label="Thao tác với lịch phỏng vấn"
    className="btn btn-sm border-0 rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
    style={{
      width: 32,
      height: 32,
      backgroundColor: "var(--surface-2)",
      color: "var(--text)"
    }}
    onClick={(event) => {
      event.preventDefault();
      onClick?.(event);
    }}
  >
    <i className="bi bi-three-dots-vertical" />
  </button>
));

CustomThreeDotsToggle.displayName = "CustomThreeDotsToggle";

// Helper xác định màu sắc trạng thái lịch phỏng vấn đồng bộ hệ thống design token
function getInterviewBadgeClass(status) {
  switch (status) {
    case "Sắp diễn ra":
      return "status-badge-primary";
    case "Đã xác nhận":
      return "status-badge-success";
    case "Chờ xác nhận":
      return "status-badge-warning";
    case "Đề nghị đổi lịch":
      return "status-badge-warning text-dark border border-warning";
    case "Hoàn tất":
      return "status-badge-secondary";
    case "Đã hủy":
      return "status-badge-danger";
    default:
      return "status-badge-secondary";
  }
}

// Xuất danh sách lịch phỏng vấn dạng CSV chuẩn UTF-8
function exportInterviewsCSV(interviews) {
  const sanitizeCell = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) {
      text = "'" + text;
    }
    return '"' + text.replace(/"/g, '""') + '"';
  };

  const rows = [
    [
      "Mã lịch",
      "Giờ phỏng vấn",
      "Ngày phỏng vấn",
      "Ứng viên",
      "Vị trí tuyển dụng",
      "Hình thức",
      "Link phòng họp",
      "Hội đồng phỏng vấn",
      "Trạng thái",
      "Phản hồi từ ứng viên",
      "Ghi chú / Lý do hủy"
    ],
    ...interviews.map((item) => [
      item.id,
      item.time,
      item.date,
      item.candidate,
      item.role,
      item.type,
      item.meetingLink || "",
      item.people || "",
      item.status,
      item.candidateResponse ? item.candidateResponse.note || item.candidateResponse.type : "",
      item.cancelReason || item.note || ""
    ])
  ];

  const csvContent =
    "\uFEFF" + rows.map((row) => row.map(sanitizeCell).join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `matchajob-interviews-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function InterviewsView({
  interviews = [],
  setInterviews,
  onOpenInterviewModal
}) {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilters, setDateFilters] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Multi-row selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [editing, setEditing] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lọc danh sách lịch
  const filteredInterviews = interviews.filter((item) => {
    const matchStatus = statusFilter === "all" ? true : item.status === statusFilter;
    
    // So khớp nhiều ngày được chọn cùng lúc (OR logic: lịch trùng bất kỳ ngày nào trong dateFilters)
    let matchDate = true;
    if (dateFilters.length > 0) {
      const rawItem = String(item.date || "").trim();
      matchDate = dateFilters.some((df) => {
        const rawFilter = String(df).trim();
        if (rawItem === rawFilter || rawItem.includes(rawFilter)) return true;

        const filterIso = rawFilter.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const filterVn = rawFilter.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const parts = filterIso
          ? { y: filterIso[1], m: filterIso[2], d: filterIso[3] }
          : filterVn
          ? { d: filterVn[1], m: filterVn[2], y: filterVn[3] }
          : null;

        if (parts) {
          const pad2 = (n) => String(n).padStart(2, "0");
          const dm = `${pad2(parts.d)}/${pad2(parts.m)}`;
          const dmy = `${pad2(parts.d)}/${pad2(parts.m)}/${parts.y}`;
          const iso = `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`;
          return (
            rawItem === dm ||
            rawItem === dmy ||
            rawItem === iso ||
            rawItem.includes(dm) ||
            rawItem.includes(dmy)
          );
        }
        return false;
      });
    }

    const query = searchQuery.trim().toLowerCase();
    const matchQuery =
      !query ||
      `${item.candidate} ${item.role} ${item.people} ${item.type}`
        .toLowerCase()
        .includes(query);

    return matchStatus && matchDate && matchQuery;
  });

  const pages = Math.max(1, Math.ceil(filteredInterviews.length / pageSize));
  const current = Math.min(page, pages);
  const paginatedList = filteredInterviews.slice(
    (current - 1) * pageSize,
    current * pageSize
  );

  // Multi-selection Handlers
  const isAllSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) => selectedIds.includes(item.id));
  const isPartiallySelected =
    paginatedList.some((item) => selectedIds.includes(item.id)) && !isAllSelected;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedList.map((item) => item.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedList.map((item) => item.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk status update
  const handleBulkUpdateStatus = async (newStatus) => {
    try {
      setIsSubmitting(true);
      for (const id of selectedIds) {
        await interviewService.updateInterviewStatus(id, newStatus);
      }
      const refreshed = await interviewService.getInterviews();
      setInterviews(refreshed);
      showToast(`Đã cập nhật trạng thái ${selectedIds.length} lịch phỏng vấn sang "${newStatus}".`);
      setSelectedIds([]);
    } catch (err) {
      showToast(err.message || "Không thể cập nhật hàng loạt.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCancel = async () => {
    if (
      window.confirm(
        `Xác nhận hủy ${selectedIds.length} lịch phỏng vấn đã chọn?`
      )
    ) {
      try {
        setIsSubmitting(true);
        for (const id of selectedIds) {
          await interviewService.cancelInterview(id, "Hủy hàng loạt bởi Nhà tuyển dụng");
        }
        const refreshed = await interviewService.getInterviews();
        setInterviews(refreshed);
        showToast(`Đã hủy ${selectedIds.length} lịch phỏng vấn đã chọn.`);
        setSelectedIds([]);
      } catch (err) {
        showToast(err.message || "Không thể hủy lịch.", "danger");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Đánh dấu hoàn tất một lịch
  const handleMarkCompleted = async (item) => {
    try {
      await interviewService.updateInterviewStatus(item.id, "Hoàn tất");
      const refreshed = await interviewService.getInterviews();
      setInterviews(refreshed);
      showToast(`Đã cập nhật trạng thái hoàn tất cho buổi phỏng vấn với ${item.candidate}.`);
    } catch (err) {
      showToast(err.message || "Không thể hoàn tất lịch phỏng vấn.", "danger");
    }
  };

  // Mở modal điều chỉnh
  const openEditModal = (item) => {
    setEditing({
      ...item,
      date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : item.date || "",
      meetingLink: item.meetingLink || "",
      note: item.note || "",
      people: item.people || "",
      type: item.type || "Google Meet (Trực tuyến)"
    });
    setModalError("");
  };

  // Lưu chỉnh sửa lịch
  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setModalError("");
    setIsSubmitting(true);

    try {
      await interviewService.updateInterview(
        editing.id,
        {
          date: editing.date,
          time: editing.time,
          type: editing.type,
          people: editing.people,
          meetingLink: editing.meetingLink,
          note: editing.note
        }
      );

      const refreshed = await interviewService.getInterviews();
      setInterviews(refreshed);
      showToast(`Đã cập nhật lịch phỏng vấn với ${editing.candidate}.`);
      setEditing(null);
    } catch (err) {
      setModalError(err.message || "Không thể lưu thay đổi lịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal hủy
  const openCancelModal = (item) => {
    setCancelTarget(item);
    setCancelReason("Ứng viên bận việc đột xuất");
    setModalError("");
  };

  // Xác nhận hủy lịch
  const handleConfirmCancel = async (event) => {
    event.preventDefault();
    setModalError("");
    setIsSubmitting(true);

    try {
      await interviewService.cancelInterview(
        cancelTarget.id,
        cancelReason || "Nhà tuyển dụng hủy lịch"
      );
      const refreshed = await interviewService.getInterviews();
      setInterviews(refreshed);
      showToast(`Đã hủy lịch phỏng vấn với ${cancelTarget.candidate}.`);
      setCancelTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== cancelTarget.id));
    } catch (err) {
      setModalError(err.message || "Không thể hủy lịch phỏng vấn.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Danh mục filter pills
  const filterOptions = [
    { key: "all", label: "Tất cả", count: interviews.length },
    {
      key: "Sắp diễn ra",
      label: "Sắp diễn ra",
      count: interviews.filter((i) => i.status === "Sắp diễn ra").length
    },
    {
      key: "Chờ xác nhận",
      label: "Chờ xác nhận",
      count: interviews.filter((i) => i.status === "Chờ xác nhận").length
    },
    {
      key: "Đã xác nhận",
      label: "Đã xác nhận",
      count: interviews.filter((i) => i.status === "Đã xác nhận").length
    },
    {
      key: "Đề nghị đổi lịch",
      label: "Đề nghị đổi lịch",
      count: interviews.filter((i) => i.status === "Đề nghị đổi lịch").length
    },
    {
      key: "Hoàn tất",
      label: "Hoàn tất",
      count: interviews.filter((i) => i.status === "Hoàn tất").length
    },
    {
      key: "Đã hủy",
      label: "Đã hủy",
      count: interviews.filter((i) => i.status === "Đã hủy").length
    }
  ];

  // Bỏ lọc 1 ngày cụ thể
  const handleRemoveDateFilter = (dateToRemove) => {
    setDateFilters((prev) => prev.filter((d) => d !== dateToRemove));
    setPage(1);
  };

  // Xóa nhanh tất cả các ngày đang lọc thay vì phải bỏ lọc từng ngày
  const handleClearAllDateFilters = () => {
    setDateFilters([]);
    setPage(1);
  };

  // Xóa toàn bộ bộ lọc
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilters([]);
    setPage(1);
  };

  // Format ngày hiển thị trên chip tag (DD/MM/YYYY)
  const formatChipDate = (dateStr) => {
    if (!dateStr) return "";
    const str = String(dateStr).trim();
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return `${String(isoMatch[3]).padStart(2, "0")}/${String(isoMatch[2]).padStart(2, "0")}/${isoMatch[1]}`;
    }
    return str;
  };

  return (
    <div data-aos="fade-up">
      <Card className="matcha-card p-4 border-0 shadow-sm">
        {/* Header toolbar: Đồng bộ kích thước với JobsView & CandidatesView */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
          <div>
            <h5 className="fw-bold mb-0">
              Quản lý lịch phỏng vấn ({interviews.length})
            </h5>
            <p className="text-muted small mb-0">
              Điều phối phòng họp trực tuyến, theo dõi phản hồi ứng viên và hội đồng tuyển dụng
            </p>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={!filteredInterviews.length}
              onClick={() => {
                try {
                  exportInterviewsCSV(filteredInterviews);
                  showToast("Đã xuất danh sách lịch phỏng vấn theo bộ lọc.");
                } catch {
                  showToast("Không thể xuất danh sách CSV.", "danger");
                }
              }}
            >
              <i className="bi bi-download me-1" />
              Xuất danh sách
            </Button>

            {/* Nút Tạo lịch phỏng vấn thu nhỏ kích thước (size="sm") đồng bộ hoàn hảo với bố cục toàn trang */}
            <Button
              variant="success"
              size="sm"
              className="fw-bold d-inline-flex align-items-center"
              onClick={onOpenInterviewModal}
            >
              <i className="bi bi-plus-lg me-1" />
              Tạo lịch phỏng vấn
            </Button>
          </div>
        </div>

        {/* Hàng 1: Thanh Filter Pills phân loại trạng thái */}
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          {filterOptions.map((opt) => {
            const isActive = statusFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`filter-pill ${isActive ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter(opt.key);
                  setPage(1);
                }}
              >
                <span>{opt.label}</span>
                <span className="badge">{opt.count}</span>
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Thanh tìm kiếm ứng viên & Hộp chọn ngày tùy biến cao cấp, không bị gãy dòng */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
          {/* Ô tìm kiếm: Linh hoạt co giãn */}
          <div style={{ flex: "1 1 260px", maxWidth: "420px" }}>
            <InputGroup size="sm">
              <InputGroup.Text
                style={{
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--muted)"
                }}
              >
                <i className="bi bi-search" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Tìm theo tên ứng viên, vị trí, hội đồng..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text)"
                }}
              />
            </InputGroup>
          </div>

          {/* Cụm hộp chọn lịch MatchaDatePicker & Nút Xóa tất cả lọc: Dùng flex-nowrap để không bị rớt dòng */}
          <div className="d-flex align-items-center flex-nowrap gap-2">
            <MatchaDatePicker
              multiple={true}
              value={dateFilters}
              onChange={(dates) => {
                setDateFilters(dates);
                setPage(1);
              }}
              placeholder="Lọc theo ngày"
              showSelectedTag={false}
              align="end"
            />

            {(searchQuery || statusFilter !== "all" || dateFilters.length > 0) && (
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-pill d-inline-flex align-items-center text-nowrap"
                onClick={clearAllFilters}
                title="Xóa toàn bộ bộ lọc"
              >
                <i className="bi bi-x-circle me-1" />
                Xóa tất cả lọc
              </Button>
            )}
          </div>
        </div>

        {/* Hàng 3: Danh sách các ngày đang lọc nằm ở hàng bên dưới nút lọc theo yêu cầu */}
        {dateFilters.length > 0 && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3 py-2 px-3 rounded-3 bg-surface-2 border animate__animated animate__fadeIn">
            <span className="small text-muted fw-semibold d-inline-flex align-items-center me-1">
              <i className="bi bi-funnel-fill text-primary me-1.5" />
              Đang lọc {dateFilters.length} ngày:
            </span>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {[...dateFilters].sort().map((d) => (
                <span
                  key={d}
                  className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1.5 d-inline-flex align-items-center small fw-semibold"
                  style={{ fontSize: "12px", gap: "6px" }}
                >
                  <i className="bi bi-calendar-check" style={{ fontSize: "11px" }} />
                  <span>{formatChipDate(d)}</span>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-primary border-0 d-inline-flex align-items-center"
                    style={{ fontSize: "12px", lineHeight: 1 }}
                    onClick={() => handleRemoveDateFilter(d)}
                    title={`Bỏ lọc ngày ${formatChipDate(d)}`}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </span>
              ))}
            </div>

            {/* Nút xóa nhanh tất cả các ngày đang lọc thay vì phải bỏ lọc từng ngày */}
            <Button
              variant="outline-danger"
              size="sm"
              className="py-1 px-2.5 rounded-pill small fw-semibold ms-auto d-inline-flex align-items-center"
              style={{ fontSize: "11.5px" }}
              onClick={handleClearAllDateFilters}
              title="Xóa nhanh tất cả các ngày đang lọc"
            >
              <i className="bi bi-trash3 me-1" />
              Xóa tất cả ngày lọc
            </Button>
          </div>
        )}

        {/* Bulk Action Banner khi chọn nhiều dòng */}
        {selectedIds.length > 0 && (
          <div className="p-3 mb-3 rounded-3 bg-surface-2 border d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="small">
              Đã chọn <strong>{selectedIds.length}</strong> cuộc phỏng vấn
            </div>

            <div className="d-flex gap-2 align-items-center flex-wrap">
              <Button
                variant="outline-success"
                size="sm"
                className="rounded-pill"
                onClick={() => handleBulkUpdateStatus("Đã xác nhận")}
              >
                <i className="bi bi-check2 me-1" />
                Đánh dấu Xác nhận
              </Button>

              <Button
                variant="outline-info"
                size="sm"
                className="rounded-pill"
                onClick={() => handleBulkUpdateStatus("Hoàn tất")}
              >
                <i className="bi bi-check-all me-1" />
                Đánh dấu Hoàn tất
              </Button>

              <Button
                variant="outline-danger"
                size="sm"
                className="rounded-pill"
                onClick={handleBulkCancel}
              >
                <i className="bi bi-trash me-1" />
                Hủy đã chọn
              </Button>

              <Button
                variant="link"
                size="sm"
                className="text-decoration-none text-muted p-0 ms-2 small"
                onClick={() => setSelectedIds([])}
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        )}

        {/* Bảng dữ liệu phỏng vấn: Thiết kế đồng bộ hoàn toàn với JobsView và CandidatesView */}
        <div className="table-responsive">
          <Table hover className="matcha-table align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: "center" }}>
                  <Form.Check
                    className="matcha-checkbox-wrap"
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Chọn tất cả cuộc phỏng vấn trang này"
                  />
                </th>
                <th className="text-center text-nowrap" style={{ minWidth: 110 }}>Thời gian</th>
                <th className="text-start text-nowrap" style={{ minWidth: 160 }}>Ứng viên</th>
                <th className="text-start text-nowrap" style={{ minWidth: 170 }}>Vị trí ứng tuyển</th>
                <th className="text-start text-nowrap" style={{ minWidth: 150 }}>Hình thức</th>
                <th className="text-start text-nowrap" style={{ minWidth: 150 }}>Hội đồng</th>
                <th className="text-center text-nowrap" style={{ minWidth: 160 }}>Trạng thái & Phản hồi</th>
                <th className="text-center text-nowrap" style={{ width: 85, minWidth: 80 }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-x fs-2 d-block mb-2 text-secondary opacity-50" />
                    Không có lịch phỏng vấn nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isClosed = interviewClosed(item);

                  return (
                    <tr key={item.id} className={isSelected ? "table-active" : ""}>
                      {/* Checkbox */}
                      <td className="text-center">
                        <Form.Check
                          className="matcha-checkbox-wrap"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Chọn cuộc phỏng vấn với ${item.candidate}`}
                        />
                      </td>

                      {/* Thời gian */}
                      <td className="text-center">
                        <strong className="text-primary d-block">{item.time}</strong>
                        <span className="small text-muted">{item.date}</span>
                        {!Number.isFinite(interviewTime(item)) && (
                          <div
                            className="small text-warning"
                            style={{ fontSize: "10px" }}
                          >
                            Cần kiểm tra ngày
                          </div>
                        )}
                      </td>

                      {/* Ứng viên */}
                      <td className="text-start">
                        <div className="fw-semibold text-body">{item.candidate}</div>
                        {item.email && (
                          <div className="small text-muted">{item.email}</div>
                        )}
                      </td>

                      {/* Vị trí */}
                      <td className="text-start">
                        <div className="small fw-medium text-body">
                          {item.role || "Chưa xác định"}
                        </div>
                      </td>

                      {/* Hình thức & link họp */}
                      <td className="text-start">
                        <span className="badge bg-secondary bg-opacity-10 text-body mb-1">
                          <i
                            className={`bi ${
                              String(item.type || "").toLowerCase().includes("trực tuyến") ||
                              String(item.type || "").toLowerCase().includes("meet") ||
                              String(item.type || "").toLowerCase().includes("online")
                                ? "bi-camera-video"
                                : "bi-building"
                            } me-1`}
                          />
                          {item.type || "Trực tuyến"}
                        </span>

                        {safeMeetingLink(item.meetingLink) && !isClosed && (
                          <a
                            href={safeMeetingLink(item.meetingLink)}
                            target="_blank"
                            rel="noreferrer"
                            className="d-block small text-success text-decoration-none mt-1"
                          >
                            <i className="bi bi-box-arrow-up-right me-1" />
                            Vào phòng họp
                          </a>
                        )}
                      </td>

                      {/* Hội đồng */}
                      <td className="text-start">
                        <div className="small text-body">
                          {item.people || "Chưa phân công"}
                        </div>
                      </td>

                      {/* Trạng thái & Phản hồi */}
                      <td className="text-center">
                        <span className={`status-badge ${getInterviewBadgeClass(item.status)}`}>
                          {item.status}
                        </span>

                        {item.candidateResponse && (
                          <div
                            className="small text-muted mt-1 fst-italic"
                            style={{
                              fontSize: "11px",
                              maxWidth: 220,
                              margin: "0 auto",
                              overflowWrap: "anywhere"
                            }}
                            title={item.candidateResponse.note || ""}
                          >
                            {item.candidateResponse.type === "confirmed"
                              ? "✓ Ứng viên xác nhận"
                              : "⚠ Đề nghị đổi lịch"}
                            {item.candidateResponse.note
                              ? `: "${item.candidateResponse.note}"`
                              : ""}
                          </div>
                        )}

                        {item.cancelReason && (
                          <div
                            className="small text-danger mt-1"
                            style={{ fontSize: "11px", maxWidth: 200, margin: "0 auto" }}
                          >
                            Lý do hủy: {item.cancelReason}
                          </div>
                        )}
                      </td>

                      {/* Thao tác: CustomThreeDotsToggle Dropdown chuẩn */}
                      <td className="text-center">
                        <Dropdown align="end">
                          <Dropdown.Toggle as={CustomThreeDotsToggle} />

                          <Dropdown.Menu className="matcha-dropdown-menu py-2 shadow-sm border">
                            <Dropdown.Item
                              disabled={isClosed}
                              onClick={() => openEditModal(item)}
                              className="small py-2"
                            >
                              <i className="bi bi-pencil-square me-2 text-primary" />
                              Điều chỉnh lịch
                            </Dropdown.Item>

                            <Dropdown.Item
                              disabled={isClosed}
                              onClick={() => handleMarkCompleted(item)}
                              className="small py-2"
                            >
                              <i className="bi bi-check-all me-2 text-success" />
                              Đánh dấu Hoàn tất
                            </Dropdown.Item>

                            {safeMeetingLink(item.meetingLink) && !isClosed && (
                              <Dropdown.Item
                                href={safeMeetingLink(item.meetingLink)}
                                target="_blank"
                                rel="noreferrer"
                                className="small py-2 text-success"
                              >
                                <i className="bi bi-camera-video me-2" />
                                Mở phòng họp
                              </Dropdown.Item>
                            )}

                            <Dropdown.Divider />

                            <Dropdown.Item
                              disabled={isClosed}
                              onClick={() => openCancelModal(item)}
                              className="small py-2 text-danger"
                            >
                              <i className="bi bi-x-circle me-2" />
                              Hủy lịch phỏng vấn
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

        {/* Phân trang đồng bộ giao diện */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3 border-top gap-2">
          <small className="text-muted">
            Hiển thị {filteredInterviews.length > 0 ? (current - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(current * pageSize, filteredInterviews.length)} trên tổng số{" "}
            <strong>{filteredInterviews.length}</strong> lịch phỏng vấn
          </small>

          <div className="d-flex gap-2 align-items-center">
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              <i className="bi bi-chevron-left me-1" />
              Trước
            </Button>
            <span className="small fw-semibold px-2 text-body">
              {current} / {pages}
            </span>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              Sau
              <i className="bi bi-chevron-right ms-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal Điều chỉnh lịch hẹn */}
      <Modal
        show={Boolean(editing)}
        onHide={() => setEditing(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">
            <i className="bi bi-pencil-square me-2 text-primary" />
            Điều chỉnh lịch phỏng vấn
          </Modal.Title>
        </Modal.Header>

        {editing && (
          <Form onSubmit={handleSaveEdit}>
            <Modal.Body>
              {modalError && <Alert variant="danger">{modalError}</Alert>}

              <div className="p-3 mb-3 rounded-3 bg-surface-2 border">
                <div className="fw-bold">{editing.candidate}</div>
                <div className="small text-muted">{editing.role}</div>
                <div className="small text-warning mt-1">
                  <i className="bi bi-info-circle me-1" />
                  Khi thay đổi thời gian hoặc hình thức, hệ thống sẽ tự động gửi yêu cầu xác nhận lại đến ứng viên.
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Ngày phỏng vấn *</Form.Label>
                    <div>
                      <MatchaDatePicker
                        value={editing.date || ""}
                        onChange={(d) => setEditing({ ...editing, date: d })}
                        placeholder="Chọn ngày phỏng vấn"
                        showSelectedTag={true}
                        outputFormat="YYYY-MM-DD"
                      />
                    </div>
                  </Form.Group>
                </div>

                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Giờ (Giờ VN) *</Form.Label>
                    <Form.Control
                      type="time"
                      required
                      value={editing.time || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, time: e.target.value })
                      }
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Hình thức phỏng vấn</Form.Label>
                <Form.Select
                  value={editing.type || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value })
                  }
                >
                  <option value="Google Meet (Trực tuyến)">Google Meet (Trực tuyến)</option>
                  <option value="Zoom (Trực tuyến)">Zoom (Trực tuyến)</option>
                  <option value="Microsoft Teams (Trực tuyến)">Microsoft Teams (Trực tuyến)</option>
                  <option value="Trực tiếp tại văn phòng">Trực tiếp tại văn phòng</option>
                  <option value="Phỏng vấn qua điện thoại">Phỏng vấn qua điện thoại</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Link phòng họp (nếu có)</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editing.meetingLink || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, meetingLink: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Hội đồng phỏng vấn</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ví dụ: Hoàng Long (Lead HR) + Minh Đức (Tech Lead)"
                  value={editing.people || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, people: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-0">
                <Form.Label className="small fw-semibold">Ghi chú / Hướng dẫn ứng viên</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  maxLength={1000}
                  placeholder="Chuẩn bị CV, dự án mẫu hoặc thông tin gửi xe..."
                  value={editing.note || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, note: e.target.value })
                  }
                />
              </Form.Group>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setEditing(null)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="success"
                size="sm"
                type="submit"
                className="fw-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      {/* Modal Hủy lịch hẹn */}
      <Modal
        show={Boolean(cancelTarget)}
        onHide={() => setCancelTarget(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold text-danger">
            <i className="bi bi-exclamation-triangle me-2" />
            Xác nhận hủy lịch phỏng vấn
          </Modal.Title>
        </Modal.Header>

        {cancelTarget && (
          <Form onSubmit={handleConfirmCancel}>
            <Modal.Body>
              {modalError && <Alert variant="danger">{modalError}</Alert>}

              <p className="mb-2">
                Bạn sắp hủy buổi phỏng vấn với ứng viên{" "}
                <strong>{cancelTarget.candidate}</strong> vào ngày{" "}
                <strong>{cancelTarget.date} ({cancelTarget.time})</strong>.
              </p>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Lý do hủy lịch *</Form.Label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {[
                    "Ứng viên bận việc đột xuất",
                    "Doanh nghiệp thay đổi kế hoạch",
                    "Trùng lịch hội đồng tuyển dụng",
                    "Đã chốt ứng viên cho vị trí này"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-0 px-2 small"
                      style={{ fontSize: "11px" }}
                      onClick={() => setCancelReason(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <Form.Control
                  as="textarea"
                  rows={3}
                  required
                  placeholder="Nhập lý do cụ thể..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </Form.Group>

              <div className="small text-muted">
                Thông báo hủy lịch và lý do sẽ được cập nhật đến ứng viên qua hệ thống thông báo.
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setCancelTarget(null)}
                disabled={isSubmitting}
              >
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="submit"
                className="fw-bold"
                disabled={isSubmitting || !cancelReason.trim()}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận hủy lịch"}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </div>
  );
}