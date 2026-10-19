import { useState, useRef, useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");

/**
 * MatchaDatePicker - Hộp chọn ngày tùy biến cao cấp, hỗ trợ theme sáng/tối và chọn nhiều ngày
 * 
 * Props:
 * - value: string | string[] (định dạng "YYYY-MM-DD" hoặc "DD/MM/YYYY")
 * - onChange: (newVal: string | string[]) => void
 * - multiple: boolean (mặc định false - nếu true thì cho phép lọc/chọn nhiều ngày)
 * - placeholder: string (mặc định "Chọn ngày")
 * - minDate: Date | null
 * - maxDate: Date | null
 * - outputFormat: "YYYY-MM-DD" | "DD/MM/YYYY" (mặc định "YYYY-MM-DD")
 * - showSelectedTag: boolean (hiển thị tag ngày bên cạnh hộp chọn lịch khi có giá trị đơn lẻ)
 * - align: "start" | "end" (căn lề popup)
 * - size: "sm" | "md"
 * - className: string
 */
export default function MatchaDatePicker({
  value = "",
  onChange,
  multiple = false,
  placeholder = "Chọn ngày",
  minDate = null,
  maxDate = null,
  outputFormat = "YYYY-MM-DD",
  showSelectedTag = false,
  align = "start",
  size = "sm",
  className = ""
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const containerRef = useRef(null);

  // Chuẩn hóa mảng danh sách ngày đã chọn khi multiple = true
  const selectedList = multiple
    ? Array.isArray(value)
      ? value.map((v) => String(v).trim()).filter(Boolean)
      : value
      ? [String(value).trim()]
      : []
    : [];

  // Phân tích chuỗi ngày sang Date
  const parseValueToDate = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }
    // DD/MM/YYYY
    const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) {
      return new Date(Number(vnMatch[3]), Number(vnMatch[2]) - 1, Number(vnMatch[1]));
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  // So khớp ngày chính xác
  const isSameDate = (val, y, m, d) => {
    if (!val) return false;
    const str = String(val).trim();
    const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      return Number(iso[1]) === y && Number(iso[2]) - 1 === m && Number(iso[3]) === d;
    }
    const vn = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vn) {
      return Number(vn[3]) === y && Number(vn[2]) - 1 === m && Number(vn[1]) === d;
    }
    const dateObj = new Date(str);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.getFullYear() === y && dateObj.getMonth() === m && dateObj.getDate() === d;
    }
    return false;
  };

  const selectedDateObj = multiple
    ? (selectedList.length > 0 ? parseValueToDate(selectedList[selectedList.length - 1]) : null)
    : parseValueToDate(value);

  const initialDate = selectedDateObj || new Date();
  const [calYear, setCalYear] = useState(initialDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Đồng bộ tháng năm khi value thay đổi từ ngoài
  useEffect(() => {
    if (selectedDateObj) {
      setCalYear(selectedDateObj.getFullYear());
      setCalMonth(selectedDateObj.getMonth());
    }
  }, [value, multiple]);

  const [computedAlign, setComputedAlign] = useState(align);

  useEffect(() => {
    setComputedAlign(align);
  }, [align]);

  // Tự động kiểm tra mép màn hình để đảo hướng căn lề tránh tràn màn hình
  useEffect(() => {
    if (showCalendar && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popupWidth = 295;
      const viewportWidth = window.innerWidth;

      if (align === "start" && rect.left + popupWidth > viewportWidth - 12) {
        setComputedAlign("end");
      } else if (align === "end" && rect.right - popupWidth < 12) {
        setComputedAlign("start");
      } else {
        setComputedAlign(align);
      }
    }
  }, [showCalendar, align]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const formattedDate =
      outputFormat === "DD/MM/YYYY"
        ? `${pad(day)}/${pad(calMonth + 1)}/${calYear}`
        : `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;

    if (multiple) {
      // Toggle ngày trong danh sách
      const existsIndex = selectedList.findIndex((d) => isSameDate(d, calYear, calMonth, day));
      let newList;
      if (existsIndex >= 0) {
        newList = selectedList.filter((_, idx) => idx !== existsIndex);
      } else {
        newList = [...selectedList, formattedDate].sort();
      }
      onChange?.(newList);
      // Giữ mở lịch để người dùng tiếp tục bấm chọn các ngày khác
    } else {
      onChange?.(formattedDate);
      setShowCalendar(false);
    }
  };

  const handleClear = (e) => {
    e?.stopPropagation?.();
    if (multiple) {
      onChange?.([]);
    } else {
      onChange?.("");
    }
  };

  // Tính toán lưới ngày
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Thứ 2 = 0

  // Format hiển thị cho tag hoặc nút đơn lẻ
  const getDisplayString = () => {
    if (!selectedDateObj) return "";
    return `${pad(selectedDateObj.getDate())}/${pad(selectedDateObj.getMonth() + 1)}/${selectedDateObj.getFullYear()}`;
  };

  const displayDateStr = getDisplayString();
  const hasValue = multiple ? selectedList.length > 0 : Boolean(value);

  const renderButtonContent = () => {
    if (multiple) {
      if (selectedList.length === 0) {
        return <span>{placeholder}</span>;
      }
      return (
        <span className="d-inline-flex align-items-center">
          <span>{placeholder}</span>
          <span
            className="badge bg-primary text-white rounded-pill ms-1.5 px-2 py-0.5"
            style={{ fontSize: "11px", fontWeight: "600" }}
          >
            {selectedList.length}
          </span>
        </span>
      );
    }

    if (!showSelectedTag && value) {
      return <span>{displayDateStr}</span>;
    }
    return <span>{placeholder}</span>;
  };

  return (
    <div
      ref={containerRef}
      className={`d-inline-flex align-items-center position-relative ${className}`}
      style={{ gap: "8px" }}
    >
      {/* Nút mở hộp chọn lịch */}
      <button
        type="button"
        className={`btn btn-${size} ${
          hasValue ? "btn-outline-primary fw-semibold" : "btn-outline-secondary"
        } d-inline-flex align-items-center justify-content-center text-nowrap`}
        onClick={() => setShowCalendar(!showCalendar)}
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: hasValue ? "var(--primary)" : "var(--border)",
          color: hasValue ? "var(--primary)" : "var(--text)",
          padding: "5px 12px",
          gap: "8px",
          lineHeight: "1.4"
        }}
        title="Mở hộp chọn lịch"
      >
        <i className="bi bi-calendar3" style={{ fontSize: "13px", flexShrink: 0 }} />
        {renderButtonContent()}
        <i
          className="bi bi-chevron-down"
          style={{ fontSize: "10px", opacity: 0.7, flexShrink: 0, marginLeft: "4px" }}
        />
      </button>

      {/* Hiển thị ngày đã chọn xuất hiện bên cạnh hộp chọn lịch khi là chế độ đơn lẻ */}
      {!multiple && showSelectedTag && value && (
        <span
          className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1.5 d-inline-flex align-items-center small fw-semibold text-nowrap transition-all"
          style={{ fontSize: "12px", gap: "6px" }}
        >
          <i className="bi bi-calendar-check" style={{ fontSize: "12px", flexShrink: 0 }} />
          <span>{displayDateStr}</span>
          <button
            type="button"
            className="btn btn-link p-0 text-primary border-0 d-inline-flex align-items-center"
            style={{ fontSize: "13px", lineHeight: 1, marginLeft: "2px" }}
            onClick={handleClear}
            title="Xóa ngày đã chọn"
          >
            <i className="bi bi-x-lg" />
          </button>
        </span>
      )}

      {/* Dropdown Popup bảng lịch */}
      {showCalendar && (
        <div
          className={`custom-calendar-dropdown shadow border align-${computedAlign}`}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: computedAlign === "end" ? "auto" : 0,
            right: computedAlign === "end" ? 0 : "auto",
            zIndex: 1060,
            width: "290px",
            maxWidth: "calc(100vw - 24px)"
          }}
        >
          {/* Header tháng và năm */}
          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
            <strong className="text-body small">
              Tháng {calMonth + 1}/{calYear}
            </strong>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm p-1 px-2"
                onClick={handlePrevMonth}
                title="Tháng trước"
              >
                ‹
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm p-1 px-2"
                onClick={handleNextMonth}
                title="Tháng sau"
              >
                ›
              </button>
            </div>
          </div>

          {/* Tiêu đề các thứ trong tuần */}
          <div className="cal-grid-header">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>

          {/* Lưới các ngày trong tháng */}
          <div className="cal-grid-days">
            {/* Ô trống offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Các ngày */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellDate = new Date(calYear, calMonth, day, 0, 0, 0, 0);

              let isDisabled = false;
              if (minDate) {
                const min = new Date(minDate);
                min.setHours(0, 0, 0, 0);
                if (cellDate < min) isDisabled = true;
              }
              if (maxDate) {
                const max = new Date(maxDate);
                max.setHours(23, 59, 59, 999);
                if (cellDate > max) isDisabled = true;
              }

              const isCurrentSelected = multiple
                ? selectedList.some((d) => isSameDate(d, calYear, calMonth, day))
                : selectedDateObj &&
                  selectedDateObj.getFullYear() === calYear &&
                  selectedDateObj.getMonth() === calMonth &&
                  selectedDateObj.getDate() === day;

              const isToday =
                new Date().getFullYear() === calYear &&
                new Date().getMonth() === calMonth &&
                new Date().getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  className={`cal-day-cell ${isCurrentSelected ? "selected" : ""} ${
                    isToday && !isCurrentSelected ? "border border-success text-success fw-bold" : ""
                  }`}
                  onClick={() => handleSelectDay(day)}
                  title={isDisabled ? "Ngày không khả dụng" : isToday ? "Hôm nay" : ""}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer nút hành động nhanh */}
          <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center small">
            <button
              type="button"
              className="btn btn-link p-0 text-success text-decoration-none small fw-semibold"
              onClick={() => {
                const now = new Date();
                setCalYear(now.getFullYear());
                setCalMonth(now.getMonth());
                handleSelectDay(now.getDate());
              }}
              title="Chọn / chuyển đến hôm nay"
            >
              Hôm nay
            </button>
            {hasValue && (
              <button
                type="button"
                className="btn btn-link p-0 text-danger text-decoration-none small fw-semibold"
                onClick={handleClear}
                title={multiple ? "Xóa tất cả ngày đã chọn" : "Xóa ngày đã chọn"}
              >
                {multiple ? "Xóa tất cả" : "Xóa chọn"}
              </button>
            )}
            <button
              type="button"
              className={`btn ${
                multiple && hasValue
                  ? "btn-primary btn-sm px-2.5 py-0.5 text-white"
                  : "btn-link p-0 text-muted"
              } text-decoration-none small fw-semibold`}
              onClick={() => setShowCalendar(false)}
            >
              {multiple && hasValue ? `Xong (${selectedList.length})` : "Đóng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
