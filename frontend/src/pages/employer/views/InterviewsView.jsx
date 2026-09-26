import { useState, forwardRef } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
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

export default function InterviewsView({ interviews, setInterviews, onOpenInterviewModal }) {
  const { showToast } = useToast();

  // Status & Date Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(null); // { day, month, year } or null
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);

  // Calendar Navigation State (Month 0-indexed: 8 is September)
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(8);

  // Multi-row Selection
  const [selectedIds, setSelectedIds] = useState([]);

  const pad = (n) => String(n).padStart(2, "0");

  // Check if an interview matches a specific date
  const isInterviewOnDate = (iv, d, m, y) => {
    const dm = `${pad(d)}/${pad(m + 1)}`;
    const dmy = `${pad(d)}/${pad(m + 1)}/${y}`;
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
    const dateStr = String(iv.date || "");
    return (
      dateStr === dm ||
      dateStr.startsWith(`${d}/${m + 1}`) ||
      dateStr.startsWith(`${pad(d)}/${m + 1}`) ||
      dateStr.includes(dm) ||
      dateStr.includes(dmy) ||
      dateStr === iso
    );
  };

  // Filtered interviews list
  const filteredInterviews = interviews.filter((iv) => {
    const matchStatus = statusFilter === "all" ? true : iv.status === statusFilter;
    const matchDate = selectedDate
      ? isInterviewOnDate(iv, selectedDate.day, selectedDate.month, selectedDate.year)
      : true;
    return matchStatus && matchDate;
  });

  // Calendar Date calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0, Sunday = 6

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const newDate = { day, month: calMonth, year: calYear };
    setSelectedDate(newDate);
    setShowCalendarDropdown(false);
    showToast(`Đang lọc lịch phỏng vấn ngày ${pad(day)}/${pad(calMonth + 1)}/${calYear}`);
  };

  const handleClearDateFilter = () => {
    setSelectedDate(null);
    showToast("Đã hiển thị tất cả các ngày");
  };

  // Status updates & cancel single
  const handleCancelInterview = (id, candidateName) => {
    mockStore.cancelInterview(id);
    setInterviews((prev) => prev.filter((iv) => iv.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast(`Đã hủy lịch phỏng vấn với ${candidateName}`);
  };

  const handleUpdateStatus = (id, newStatus) => {
    mockStore.updateInterview(id, { status: newStatus });
    setInterviews((prev) =>
      prev.map((iv) => (iv.id === id ? { ...iv, status: newStatus } : iv))
    );
    showToast(`Đã cập nhật trạng thái buổi phỏng vấn sang: ${newStatus}`);
  };

  // Multi-selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredInterviews.map((iv) => iv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdateStatus = (newStatus) => {
    selectedIds.forEach((id) => mockStore.updateInterview(id, { status: newStatus }));
    setInterviews(mockStore.getInterviews());
    showToast(`Đã cập nhật trạng thái ${selectedIds.length} cuộc phỏng vấn sang "${newStatus}"`);
    setSelectedIds([]);
  };

  const handleBulkCancel = () => {
    if (window.confirm(`Xác nhận hủy ${selectedIds.length} lịch phỏng vấn đã chọn?`)) {
      selectedIds.forEach((id) => mockStore.cancelInterview(id));
      setInterviews(mockStore.getInterviews());
      showToast(`Đã hủy ${selectedIds.length} lịch phỏng vấn`);
      setSelectedIds([]);
    }
  };

  // Filter count options
  const filterOptions = [
    { key: "all", label: "Tất cả", count: interviews.length },
    { key: "Sắp diễn ra", label: "Sắp diễn ra", count: interviews.filter((iv) => iv.status === "Sắp diễn ra").length },
    { key: "Đã xác nhận", label: "Đã xác nhận", count: interviews.filter((iv) => iv.status === "Đã xác nhận").length },
    { key: "Hoàn tất", label: "Hoàn tất", count: interviews.filter((iv) => iv.status === "Hoàn tất").length }
  ];

  const isAllSelected = filteredInterviews.length > 0 && selectedIds.length === filteredInterviews.length;
  const isPartiallySelected = selectedIds.length > 0 && !isAllSelected;

  return (
    <div data-aos="fade-up">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Quản lý lịch phỏng vấn ({interviews.length})</h5>
          <p className="text-muted small mb-0">Điều phối phòng họp, link trực tuyến và hội đồng phỏng vấn</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => showToast("Đã đồng bộ thành công với Google Calendar")}
          >
            <i className="bi bi-calendar2-check me-1"></i>Đồng bộ Google Calendar
          </Button>
          <Button variant="success" size="sm" className="fw-bold" onClick={onOpenInterviewModal}>
            <i className="bi bi-plus-lg me-1"></i>Tạo lịch phỏng vấn
          </Button>
        </div>
      </div>

      {/* Main Full-Width Card */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        {/* Controls Toolbar: Status Pills (Left) & Date Filter with Calendar Dropdown (Right) */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-3">
          {/* Status Filter Pills */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {filterOptions.map((item) => {
              const isActive = statusFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`filter-pill ${isActive ? "active" : ""}`}
                  onClick={() => setStatusFilter(item.key)}
                >
                  <span>{item.label}</span>
                  <span className="badge">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date Filter & Interactive Mini Calendar Popover with Year & Month Navigation */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Dropdown
              show={showCalendarDropdown}
              onToggle={(isOpen) => setShowCalendarDropdown(isOpen)}
              align="end"
            >
              <Dropdown.Toggle
                as="button"
                type="button"
                className={`filter-pill ${selectedDate ? "active" : ""}`}
              >
                <i className="bi bi-calendar3"></i>
                <span>
                  {selectedDate
                    ? `Ngày ${pad(selectedDate.day)}/${pad(selectedDate.month + 1)}/${selectedDate.year}`
                    : "Mở bảng lịch"}
                </span>
                <i className="bi bi-chevron-down small ms-1" style={{ fontSize: "10px" }}></i>
              </Dropdown.Toggle>

              <Dropdown.Menu
                className="p-3 matcha-calendar-popover shadow border mt-2"
                style={{ width: "320px", zIndex: 1050 }}
              >
                {/* Calendar Header with Month and Year Navigation */}
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  {/* Month Navigation */}
                  <div className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={handlePrevMonth}
                      title="Tháng trước"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-semibold small mx-1" style={{ minWidth: "64px", textAlign: "center" }}>
                      Tháng {pad(calMonth + 1)}
                    </span>
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={handleNextMonth}
                      title="Tháng sau"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>

                  {/* Year Navigation */}
                  <div className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={() => setCalYear((prev) => prev - 1)}
                      title="Năm trước"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-bold small text-success mx-1" style={{ minWidth: "42px", textAlign: "center" }}>
                      {calYear}
                    </span>
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={() => setCalYear((prev) => prev + 1)}
                      title="Năm sau"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>

                {/* Day of Week Headers */}
                <div
                  className="d-grid mb-1 text-center"
                  style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}
                >
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                    <div key={day} className="text-muted fw-bold" style={{ fontSize: "11px" }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div
                  className="d-grid text-center"
                  style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}
                >
                  {/* Empty Offset cells */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`}></div>
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isSelected =
                      selectedDate &&
                      selectedDate.day === day &&
                      selectedDate.month === calMonth &&
                      selectedDate.year === calYear;

                    const hasEvent = interviews.some((iv) =>
                      isInterviewOnDate(iv, day, calMonth, calYear)
                    );

                    return (
                      <button
                        key={day}
                        type="button"
                        className={`cal-day-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectDay(day)}
                      >
                        <span>{day}</span>
                        {hasEvent && (
                          <span className="cal-event-dot"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Footer */}
                <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center" style={{ fontSize: "11px" }}>
                  <span className="text-muted d-flex align-items-center gap-1">
                    <span className="rounded-circle bg-success d-inline-block" style={{ width: "6px", height: "6px" }}></span>
                    Có lịch hẹn
                  </span>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-success text-decoration-none"
                      style={{ fontSize: "11px" }}
                      onClick={() => {
                        const now = new Date();
                        setCalYear(now.getFullYear());
                        setCalMonth(now.getMonth());
                        handleSelectDay(now.getDate());
                      }}
                    >
                      Hôm nay
                    </button>
                    <span className="text-muted">·</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-secondary text-decoration-none"
                      style={{ fontSize: "11px" }}
                      onClick={handleClearDateFilter}
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* Clear date filter button if active */}
            {selectedDate && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1 text-nowrap"
                onClick={handleClearDateFilter}
                title="Xóa bộ lọc ngày"
                style={{ fontSize: "12px" }}
              >
                <i className="bi bi-x-circle me-1"></i>Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Banner when multiple rows selected */}
        {selectedIds.length > 0 && (
          <div
            className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
            style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
          >
            <div className="d-flex align-items-center gap-2 small fw-semibold">
              <i className="bi bi-check2-circle fs-5 text-success"></i>
              <span>Đã chọn <strong className="text-success">{selectedIds.length}</strong> cuộc phỏng vấn</span>
            </div>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <Button
                variant="outline-success"
                size="sm"
                className="rounded-pill"
                onClick={() => handleBulkUpdateStatus("Đã xác nhận")}
              >
                <i className="bi bi-check2 me-1"></i>Đã xác nhận
              </Button>
              <Button
                variant="outline-info"
                size="sm"
                className="rounded-pill"
                onClick={() => handleBulkUpdateStatus("Hoàn tất")}
              >
                <i className="bi bi-check-all me-1"></i>Đã hoàn thành
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="rounded-pill"
                onClick={handleBulkCancel}
              >
                <i className="bi bi-trash me-1"></i>Hủy các lịch đã chọn
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

        {/* Full-width Interview Table: Tiêu đề căn giữa text-nowrap, nội dung căn trái (Ứng viên, Vị trí, Hình thức, Hội đồng) & căn giữa (Thời gian, Trạng thái, Thao tác) */}
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
                    aria-label="Chọn tất cả cuộc phỏng vấn"
                  />
                </th>
                <th className="text-center text-nowrap">Thời gian</th>
                <th className="text-center text-nowrap">Ứng viên</th>
                <th className="text-center text-nowrap">Vị trí ứng tuyển</th>
                <th className="text-center text-nowrap">Hình thức</th>
                <th className="text-center text-nowrap">Hội đồng</th>
                <th className="text-center text-nowrap">Trạng thái</th>
                {/* Cột Thao tác: width 100px text-nowrap để chữ THAO TÁC không bị ngắt đôi xuống dòng */}
                <th className="text-center text-nowrap" style={{ width: "100px", minWidth: "95px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-x fs-2 d-block mb-2 text-secondary opacity-50"></i>
                    Không có lịch phỏng vấn nào phù hợp với bộ lọc ngày hoặc trạng thái đã chọn.
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((iv) => {
                  const isSelected = selectedIds.includes(iv.id);
                  return (
                    <tr key={iv.id || iv.candidate} className={isSelected ? "table-active" : ""}>
                      <td className="text-center">
                        <Form.Check
                          className="matcha-checkbox-wrap"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(iv.id)}
                          aria-label={`Chọn cuộc phỏng vấn với ${iv.candidate}`}
                        />
                      </td>
                      <td className="text-center">
                        <strong className="text-primary d-block">{iv.time}</strong>
                        <span className="small text-muted">{iv.date}</span>
                      </td>
                      <td className="text-start fw-semibold">{iv.candidate}</td>
                      <td className="text-start small">{iv.role}</td>
                      <td className="text-start">
                        <span className="small badge bg-secondary bg-opacity-10 text-body">
                          {iv.type}
                        </span>
                        {iv.meetingLink && (
                          <a
                            href={iv.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="d-block small text-success text-decoration-none mt-1"
                          >
                            <i className="bi bi-camera-video me-1"></i>Vào phòng họp
                          </a>
                        )}
                      </td>
                      <td className="text-start text-muted small">{iv.people}</td>
                      <td className="text-center">
                        <span
                          className={`status-badge ${
                            iv.status === "Hoàn tất"
                              ? "status-badge-secondary"
                              : iv.status === "Sắp diễn ra"
                              ? "status-badge-primary"
                              : iv.status === "Chờ xác nhận"
                              ? "status-badge-warning"
                              : "status-badge-success"
                          }`}
                        >
                          {iv.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <Dropdown align="end">
                          <Dropdown.Toggle as={CustomThreeDotsToggle} />
                          <Dropdown.Menu className="matcha-dropdown-menu py-2">
                            {iv.meetingLink && (
                              <Dropdown.Item href={iv.meetingLink} target="_blank" className="small py-2">
                                <i className="bi bi-box-arrow-up-right me-2 text-primary"></i>Mở link Meet
                              </Dropdown.Item>
                            )}
                            <Dropdown.Item onClick={() => handleUpdateStatus(iv.id, "Đã xác nhận")} className="small py-2">
                              <i className="bi bi-check2-circle me-2 text-success"></i>Đánh dấu Đã xác nhận
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleUpdateStatus(iv.id, "Hoàn tất")} className="small py-2">
                              <i className="bi bi-check-all me-2 text-info"></i>Đánh dấu Đã hoàn thành
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                              className="small py-2 text-danger"
                              onClick={() => handleCancelInterview(iv.id, iv.candidate)}
                            >
                              <i className="bi bi-x-circle me-2"></i>Hủy lịch hẹn
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
      </Card>
    </div>
  );
}

