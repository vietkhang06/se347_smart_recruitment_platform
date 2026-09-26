import { useState, useRef, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";

import {
  DEFAULT_REQ_SUGGESTIONS,
  DEFAULT_SPEC_SUGGESTIONS,
  DEFAULT_JOB_TEMPLATES
} from "../../../mock/mockComposerTemplates";
import { mockStore } from "../../../services/mockStore";

// Currency format helper: xxx,yyy,zzz
const formatNumberWithCommas = (val) => {
  if (!val && val !== 0) return "";
  const raw = String(val).replace(/\D/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("en-US");
};

export default function JobComposerModal({ show, onHide, onJobCreated }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("edit"); // "edit" | "preview"

  const template = DEFAULT_JOB_TEMPLATES.logisticsSales;

  // 1. Basic Info
  const [title, setTitle] = useState(template.title);
  const [city, setCity] = useState(template.city);
  const [address, setAddress] = useState(template.address);
  const [jobLevel, setJobLevel] = useState(template.jobLevel);
  const [workType, setWorkType] = useState(template.workType);
  const [team, setTeam] = useState(template.team);

  // 2. Salary & Deadline
  const [salaryMode, setSalaryMode] = useState(template.salaryMode); // range, from, under, negotiable
  const [salaryCurrency, setSalaryCurrency] = useState(template.salaryCurrency);
  const [salaryMin, setSalaryMin] = useState(template.salaryMin);
  const [salaryMax, setSalaryMax] = useState(template.salaryMax);
  const [salarySingle, setSalarySingle] = useState(template.salarySingle);

  // Deadline logic: >= today + 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 7);

  const pad = (n) => String(n).padStart(2, "0");
  const formatDateString = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  // Default deadline is today + 30 days
  const defaultDeadlineDate = new Date(today);
  defaultDeadlineDate.setDate(today.getDate() + 30);
  const [deadline, setDeadline] = useState(formatDateString(defaultDeadlineDate));
  const [experience, setExperience] = useState(template.experience);

  // Custom Calendar State
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(minDate.getFullYear());
  const [calMonth, setCalMonth] = useState(minDate.getMonth()); // 0-indexed
  const calendarRef = useRef(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
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

  // 3. Tags Pools and Selected Tags
  const [reqPool, setReqPool] = useState(DEFAULT_REQ_SUGGESTIONS);
  const [specPool, setSpecPool] = useState(DEFAULT_SPEC_SUGGESTIONS);

  const [reqTags, setReqTags] = useState(template.reqTags);
  const [specTags, setSpecTags] = useState(template.specTags);

  const [newReqTag, setNewReqTag] = useState("");
  const [newSpecTag, setNewSpecTag] = useState("");

  // Available suggestions (auto-hide if selected)
  const availableReqSuggestions = reqPool.filter((t) => !reqTags.includes(t));
  const availableSpecSuggestions = specPool.filter((t) => !specTags.includes(t));

  // 4. Rich Texts
  const [descHtml, setDescHtml] = useState(template.descHtml);
  const [reqHtml, setReqHtml] = useState(template.reqHtml);
  const [benefitsHtml, setBenefitsHtml] = useState(template.benefitsHtml);
  const [scheduleHtml, setScheduleHtml] = useState(template.scheduleHtml);

  // 5. Summary Row (Icon cards)
  const [sumIndustry, setSumIndustry] = useState(template.summary.industry);
  const [sumRequired, setSumRequired] = useState(template.summary.required);
  const [sumPreferred, setSumPreferred] = useState(template.summary.preferred);

  // 6. Map Link
  const [mapLink, setMapLink] = useState(template.mapLink);

  // Refs for contenteditable elements
  const descRef = useRef(null);
  const reqRef = useRef(null);
  const benefitsRef = useRef(null);
  const scheduleRef = useRef(null);

  // Rich editor helpers
  const handleExecCommand = (command, e) => {
    e.preventDefault(); // Prevent losing focus or scroll jumping
    document.execCommand(command, false, null);
  };

  // Tag Helpers with Animation support
  const addReqTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!reqTags.includes(trimmed)) {
      setReqTags((prev) => [...prev, trimmed]);
      if (!reqPool.includes(trimmed)) {
        setReqPool((prev) => [...prev, trimmed]);
      }
      setNewReqTag("");
    }
  };

  const removeReqTag = (tag) => {
    setReqTags((prev) => prev.filter((t) => t !== tag));
  };

  const addSpecTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!specTags.includes(trimmed)) {
      setSpecTags((prev) => [...prev, trimmed]);
      if (!specPool.includes(trimmed)) {
        setSpecPool((prev) => [...prev, trimmed]);
      }
      setNewSpecTag("");
    }
  };

  const removeSpecTag = (tag) => {
    setSpecTags((prev) => prev.filter((t) => t !== tag));
  };

  // Salary format handlers
  const handleSalaryMinChange = (e) => {
    setSalaryMin(formatNumberWithCommas(e.target.value));
  };

  const handleSalaryMaxChange = (e) => {
    setSalaryMax(formatNumberWithCommas(e.target.value));
  };

  const handleSalarySingleChange = (e) => {
    setSalarySingle(formatNumberWithCommas(e.target.value));
  };

  // Salary Display helper
  const getSalaryDisplay = () => {
    if (salaryMode === "range") return `${salaryMin || "0"} - ${salaryMax || "0"} ${salaryCurrency}`;
    if (salaryMode === "from") return `Từ ${salarySingle || "0"} ${salaryCurrency}`;
    if (salaryMode === "under") return `Lên đến ${salarySingle || "0"} ${salaryCurrency}`;
    return "Thỏa thuận";
  };

  // Calendar calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon=0, Sun=6

  const handleSelectDay = (day) => {
    const selectedDate = new Date(calYear, calMonth, day, 0, 0, 0, 0);
    if (selectedDate < minDate) {
      showToast(`Hạn nộp hồ sơ phải từ ngày ${formatDateString(minDate)} trở đi (tối thiểu 7 ngày)!`);
      return;
    }
    setDeadline(`${pad(day)}/${pad(calMonth + 1)}/${calYear}`);
    setShowCalendar(false);
  };

  const handlePrevMonth = () => {
    const prevMonthDate = new Date(calYear, calMonth - 1, 1);
    const lastDayOfPrevMonth = new Date(calYear, calMonth, 0);
    if (lastDayOfPrevMonth < minDate) return; // Disallow completely past months
    setCalYear(prevMonthDate.getFullYear());
    setCalMonth(prevMonthDate.getMonth());
  };

  const handleNextMonth = () => {
    const nextMonthDate = new Date(calYear, calMonth + 1, 1);
    setCalYear(nextMonthDate.getFullYear());
    setCalMonth(nextMonthDate.getMonth());
  };

  // Handle Submit
  const handlePublish = (e) => {
    e.preventDefault();

    // 1. Tên vị trí tuyển dụng
    if (!title.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập tên vị trí tuyển dụng");
      return;
    }

    // 2. Địa chỉ cụ thể
    if (!address.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập địa chỉ cụ thể nơi làm việc");
      return;
    }

    // 3. Mức lương (theo từng chế độ thể hiện)
    if (salaryMode === "range") {
      if (!salaryMin.trim() || !salaryMax.trim()) {
        setActiveTab("edit");
        showToast("Vui lòng nhập đầy đủ mức lương tối thiểu và tối đa");
        return;
      }
    } else if (salaryMode === "from" || salaryMode === "under") {
      if (!salarySingle.trim()) {
        setActiveTab("edit");
        showToast("Vui lòng nhập số tiền lương");
        return;
      }
    }

    // 4. Hạn nộp hồ sơ
    if (!deadline.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng chọn hạn nộp hồ sơ");
      return;
    }

    // 5. Yêu cầu kinh nghiệm
    if (!experience.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập hoặc chọn yêu cầu kinh nghiệm");
      return;
    }

    // 6. Thẻ Tags (Yêu cầu & Chuyên môn)
    if (reqTags.length === 0) {
      setActiveTab("edit");
      showToast("Vui lòng chọn hoặc thêm ít nhất 1 thẻ Yêu cầu");
      return;
    }
    if (specTags.length === 0) {
      setActiveTab("edit");
      showToast("Vui lòng chọn hoặc thêm ít nhất 1 thẻ Chuyên môn");
      return;
    }

    // 7. Mô tả công việc & Yêu cầu ứng viên (WYSIWYG)
    const descText = (descRef.current?.innerText || "").trim();
    if (!descText) {
      setActiveTab("edit");
      showToast("Vui lòng điền nội dung Mô tả công việc");
      return;
    }

    const reqText = (reqRef.current?.innerText || "").trim();
    if (!reqText) {
      setActiveTab("edit");
      showToast("Vui lòng điền nội dung Yêu cầu ứng viên");
      return;
    }

    // 8. 3 Dòng tóm tắt Icon
    if (!sumIndustry.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập tóm tắt Kiến thức ngành (💡)");
      return;
    }
    if (!sumRequired.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập tóm tắt Kỹ năng cần có (📐)");
      return;
    }
    if (!sumPreferred.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập tóm tắt Kỹ năng nên có (✏️)");
      return;
    }

    // 9. Quyền lợi & Đãi ngộ
    const benefitsText = (benefitsRef.current?.innerText || "").trim();
    if (!benefitsText) {
      setActiveTab("edit");
      showToast("Vui lòng điền nội dung Quyền lợi & Đãi ngộ");
      return;
    }

    // 10. Thời gian & Địa điểm làm việc
    const scheduleText = (scheduleRef.current?.innerText || "").trim();
    if (!scheduleText) {
      setActiveTab("edit");
      showToast("Vui lòng điền nội dung Thời gian & Địa điểm làm việc");
      return;
    }

    // 11. Link Google Maps
    if (!mapLink.trim()) {
      setActiveTab("edit");
      showToast("Vui lòng nhập Link Google Maps vị trí văn phòng");
      return;
    }

    const newJob = {
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      team,
      location: city,
      address,
      jobLevel,
      workType,
      salary: getSalaryDisplay(),
      deadline,
      experience,
      reqTags,
      specTags,
      description: descRef.current?.innerHTML || descHtml,
      requirements: reqRef.current?.innerHTML || reqHtml,
      benefits: benefitsRef.current?.innerHTML || benefitsHtml,
      schedule: scheduleRef.current?.innerHTML || scheduleHtml,
      summary: {
        industry: sumIndustry,
        required: sumRequired,
        preferred: sumPreferred
      },
      mapLink,
      applicants: 0,
      views: 1,
      status: "Đang tuyển",
      posted: "Vừa xong"
    };

    // Save to unified mockStore
    const createdJob = mockStore.saveJob(newJob);

    if (onJobCreated) onJobCreated(createdJob);
    showToast(`Đã xuất bản tin tuyển dụng: ${title} (${createdJob.status})`);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName="composer-custom-dialog"
      centered
      scrollable
    >
      <Modal.Header closeButton className="border-bottom pb-3">
        <div className="d-flex align-items-center justify-content-between w-100 me-3 flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success bg-opacity-10 text-success fw-bold">Tuyển dụng</span>
              <h5 className="modal-title fw-bold mb-0">Tạo tin tuyển dụng chuyên nghiệp</h5>
            </div>
            <small className="text-muted">Biên tập chi tiết với Live Preview & đồng bộ tức thì</small>
          </div>

          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${activeTab === "edit" ? "btn-success" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("edit")}
            >
              <i className="bi bi-pencil-square me-1"></i>Soạn thảo
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "preview" ? "btn-success" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("preview")}
            >
              <i className="bi bi-eye me-1"></i>Xem trước tin đăng
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4 bg-surface">
        {activeTab === "edit" ? (
          <Form id="job-composer-form">
            <div className="composer-form-inner w-100" style={{ margin: "0 auto" }}>
              {/* 1. THÔNG TIN CHUNG */}
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    1
                  </span>
                  Thông tin chung vị trí
                </h6>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Label className="small fw-semibold">
                      Tên vị trí tuyển dụng <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      required
                      placeholder="VD: Senior Frontend Engineer hoặc Chuyên viên Kinh doanh Logistics"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Col>

                  <Col sm={6}>
                    <Form.Label className="small fw-semibold">
                      Tỉnh / Thành phố <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select value={city} onChange={(e) => setCity(e.target.value)}>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Toàn quốc">Toàn quốc (Remote)</option>
                    </Form.Select>
                  </Col>

                  <Col sm={6}>
                    <Form.Label className="small fw-semibold">
                      Địa chỉ cụ thể làm việc <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: Tòa nhà FPT Tân Thuận, Quận 7, TP.HCM"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Col>

                  <Col sm={4}>
                    <Form.Label className="small fw-semibold">Cấp bậc</Form.Label>
                    <Form.Select value={jobLevel} onChange={(e) => setJobLevel(e.target.value)}>
                      <option value="Nhân viên">Nhân viên</option>
                      <option value="Trưởng nhóm">Trưởng nhóm</option>
                      <option value="Trưởng/Phó phòng">Trưởng/Phó phòng</option>
                      <option value="Quản lý / Giám sát">Quản lý / Giám sát</option>
                      <option value="Trưởng chi nhánh">Trưởng chi nhánh</option>
                      <option value="Phó giám đốc">Phó giám đốc</option>
                      <option value="Giám đốc">Giám đốc</option>
                      <option value="Thực tập sinh">Thực tập sinh</option>
                    </Form.Select>
                  </Col>

                  <Col sm={4}>
                    <Form.Label className="small fw-semibold">Loại hình làm việc</Form.Label>
                    <Form.Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
                      <option value="Toàn thời gian">Toàn thời gian</option>
                      <option value="Bán thời gian">Bán thời gian</option>
                      <option value="Thực tập">Thực tập</option>
                      <option value="Khác">Khác</option>
                    </Form.Select>
                  </Col>

                  <Col sm={4}>
                    <Form.Label className="small fw-semibold">Khối / Phòng ban</Form.Label>
                    <Form.Select value={team} onChange={(e) => setTeam(e.target.value)}>
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Design">Design</option>
                      <option value="Sales">Sales & BD</option>
                      <option value="Data">Data & AI</option>
                      <option value="People">People / HR</option>
                    </Form.Select>
                  </Col>
                </Row>
              </div>

              {/* 2. MỨC LƯƠNG & THỜI HẠN */}
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    2
                  </span>
                  Mức lương, Thời hạn & Kinh nghiệm
                </h6>
                <Row className="g-3">
                  <Col md={5}>
                    <Form.Label className="small fw-semibold">
                      Cách thể hiện mức lương <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select value={salaryMode} onChange={(e) => setSalaryMode(e.target.value)}>
                      <option value="range">Trong khoảng lương</option>
                      <option value="from">Mức lương tối thiểu</option>
                      <option value="under">Mức lương tối đa</option>
                      <option value="negotiable">Thỏa thuận</option>
                    </Form.Select>
                  </Col>

                  <Col md={7}>
                    <Form.Label className="small fw-semibold">
                      Số tiền & Loại tiền tệ {salaryMode !== "negotiable" && <span className="text-danger">*</span>}
                    </Form.Label>
                    <div className="d-flex gap-2">
                      {salaryMode === "range" && (
                        <>
                          <Form.Control
                            type="text"
                            placeholder="Tối thiểu (VD: 15,000,000)"
                            value={salaryMin}
                            onChange={handleSalaryMinChange}
                          />
                          <span className="d-flex align-items-center text-muted">-</span>
                          <Form.Control
                            type="text"
                            placeholder="Tối đa (VD: 25,000,000)"
                            value={salaryMax}
                            onChange={handleSalaryMaxChange}
                          />
                        </>
                      )}
                      {(salaryMode === "from" || salaryMode === "under") && (
                        <Form.Control
                          type="text"
                          placeholder="Số tiền (VD: 20,000,000)"
                          value={salarySingle}
                          onChange={handleSalarySingleChange}
                        />
                      )}
                      {salaryMode === "negotiable" && (
                        <Form.Control type="text" disabled value="Lương thỏa thuận khi phỏng vấn" />
                      )}
                      <Form.Select
                        style={{ maxWidth: 135 }}
                        value={salaryCurrency}
                        onChange={(e) => setSalaryCurrency(e.target.value)}
                        disabled={salaryMode === "negotiable"}
                      >
                        <option value="Triệu VNĐ">Triệu VNĐ</option>
                        <option value="USD ($)">USD ($)</option>
                      </Form.Select>
                    </div>
                  </Col>

                  {/* HẠN NỘP HỒ SƠ VỚI CUSTOM CALENDAR POPUP */}
                  <Col sm={6} className="position-relative" ref={calendarRef}>
                    <Form.Label className="small fw-semibold">
                      Hạn nộp hồ sơ <span className="text-danger">*</span>
                      <small className="text-muted fw-normal ms-1">(tối thiểu 7 ngày từ hôm nay)</small>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        readOnly
                        placeholder="DD/MM/YYYY"
                        value={deadline}
                        onClick={() => setShowCalendar(!showCalendar)}
                        style={{ cursor: "pointer", backgroundColor: "var(--surface)" }}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowCalendar(!showCalendar)}
                        title="Mở lịch chọn hạn nộp"
                      >
                        <i className="bi bi-calendar3"></i>
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          const d30 = new Date(today);
                          d30.setDate(today.getDate() + 30);
                          setDeadline(formatDateString(d30));
                          showToast(`Đã đặt hạn nộp là ${formatDateString(d30)} (+30 ngày)`);
                        }}
                        title="Nhanh +30 ngày"
                        className="text-nowrap"
                      >
                        +30 ngày
                      </Button>
                    </InputGroup>

                    {/* Custom Themed Calendar Dropdown */}
                    {showCalendar && (
                      <div className="custom-calendar-dropdown">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong className="text-body small">
                            Tháng {calMonth + 1}/{calYear}
                          </strong>
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm p-1"
                              onClick={handlePrevMonth}
                              aria-label="Tháng trước"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm p-1"
                              onClick={handleNextMonth}
                              aria-label="Tháng sau"
                            >
                              ›
                            </button>
                          </div>
                        </div>

                        <div className="cal-grid-header">
                          <span>T2</span>
                          <span>T3</span>
                          <span>T4</span>
                          <span>T5</span>
                          <span>T6</span>
                          <span>T7</span>
                          <span>CN</span>
                        </div>

                        <div className="cal-grid-days">
                          {/* Empty offset days */}
                          {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`offset-${i}`} />
                          ))}

                          {/* Days in Month */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const cellDate = new Date(calYear, calMonth, day, 0, 0, 0, 0);
                            const isDisabled = cellDate < minDate;
                            const isCurrentSelected = deadline === `${pad(day)}/${pad(calMonth + 1)}/${calYear}`;

                            return (
                              <button
                                key={day}
                                type="button"
                                disabled={isDisabled}
                                className={`cal-day-cell ${isCurrentSelected ? "selected" : ""}`}
                                onClick={() => handleSelectDay(day)}
                                title={isDisabled ? `Chỉ được chọn từ ngày ${formatDateString(minDate)} trở đi` : ""}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-success text-decoration-none fw-semibold"
                            style={{ fontSize: "11px" }}
                            onClick={() => {
                              setDeadline(formatDateString(minDate));
                              setShowCalendar(false);
                            }}
                          >
                            +7 ngày (Sớm nhất)
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                            style={{ fontSize: "11px" }}
                            onClick={() => setShowCalendar(false)}
                          >
                            Đóng
                          </button>
                        </div>
                      </div>
                    )}
                  </Col>

                  <Col sm={6}>
                    <Form.Label className="small fw-semibold">
                      Yêu cầu kinh nghiệm <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      list="exp-presets-react"
                      placeholder="Chọn hoặc tự nhập (VD: 1 năm, 2-3 năm...)"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                    <datalist id="exp-presets-react">
                      <option value="Không yêu cầu kinh nghiệm" />
                      <option value="Dưới 1 năm kinh nghiệm" />
                      <option value="1 năm kinh nghiệm" />
                      <option value="2 năm kinh nghiệm" />
                      <option value="3 năm kinh nghiệm" />
                      <option value="4 năm kinh nghiệm" />
                      <option value="5 năm kinh nghiệm" />
                      <option value="Trên 5 năm kinh nghiệm" />
                    </datalist>
                  </Col>
                </Row>
              </div>

              {/* 3. HASHTAGS & PHÂN LOẠI (ANIMATED INTERACTION) */}
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    3
                  </span>
                  Tổng quan thẻ Tags (Yêu cầu & Chuyên môn)
                </h6>

                {/* Nhóm Tag 1: Yêu cầu */}
                <div className="mb-4">
                  <Form.Label className="small fw-semibold d-block mb-2">
                    Thẻ Yêu cầu <span className="text-danger me-1">*</span>: <span className="text-muted fw-normal">Trình độ, ngoại ngữ, tiêu chí tổng quan</span>
                  </Form.Label>
                  <div className="d-flex gap-2 mb-3" style={{ maxWidth: "580px" }}>
                    <Form.Control
                      size="sm"
                      placeholder="Nhập tag yêu cầu rồi nhấn Enter hoặc bấm Thêm..."
                      value={newReqTag}
                      onChange={(e) => setNewReqTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addReqTag(newReqTag);
                        }
                      }}
                    />
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="text-nowrap flex-shrink-0"
                      style={{ whiteSpace: "nowrap", minWidth: "110px" }}
                      onClick={() => addReqTag(newReqTag)}
                    >
                      + Thêm tag
                    </Button>
                  </div>

                  {/* Selected Tags row */}
                  <div className="d-flex flex-wrap gap-2 mb-2" style={{ minHeight: "34px" }}>
                    {reqTags.length === 0 ? (
                      <span className="text-muted small fst-italic">Chưa có tag yêu cầu nào được chọn.</span>
                    ) : (
                      reqTags.map((t) => (
                        <span key={t} className="tag-chip">
                          {t}
                          <button
                            type="button"
                            className="tag-chip-remove"
                            onClick={() => removeReqTag(t)}
                            title="Xóa tag này (trả về gợi ý)"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Available Suggestions row */}
                  {availableReqSuggestions.length > 0 && (
                    <div className="d-flex flex-wrap align-items-center gap-1 pt-1">
                      <span className="text-muted small me-2">Gợi ý:</span>
                      {availableReqSuggestions.map((s) => (
                        <span
                          key={s}
                          className="suggest-chip"
                          onClick={() => addReqTag(s)}
                          title="Bấm để chọn tag này"
                        >
                          + {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nhóm Tag 2: Chuyên môn */}
                <div>
                  <Form.Label className="small fw-semibold d-block mb-2">
                    Thẻ Chuyên môn <span className="text-danger me-1">*</span>: <span className="text-muted fw-normal">Kỹ năng nghiệp vụ, công nghệ, mảng kinh doanh</span>
                  </Form.Label>
                  <div className="d-flex gap-2 mb-3" style={{ maxWidth: "580px" }}>
                    <Form.Control
                      size="sm"
                      placeholder="Nhập tag chuyên môn rồi nhấn Enter hoặc bấm Thêm..."
                      value={newSpecTag}
                      onChange={(e) => setNewSpecTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSpecTag(newSpecTag);
                        }
                      }}
                    />
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="text-nowrap flex-shrink-0"
                      style={{ whiteSpace: "nowrap", minWidth: "110px" }}
                      onClick={() => addSpecTag(newSpecTag)}
                    >
                      + Thêm tag
                    </Button>
                  </div>

                  {/* Selected Tags row */}
                  <div className="d-flex flex-wrap gap-2 mb-2" style={{ minHeight: "34px" }}>
                    {specTags.length === 0 ? (
                      <span className="text-muted small fst-italic">Chưa có tag chuyên môn nào được chọn.</span>
                    ) : (
                      specTags.map((t) => (
                        <span key={t} className="tag-chip">
                          {t}
                          <button
                            type="button"
                            className="tag-chip-remove"
                            onClick={() => removeSpecTag(t)}
                            title="Xóa tag này (trả về gợi ý)"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Available Suggestions row */}
                  {availableSpecSuggestions.length > 0 && (
                    <div className="d-flex flex-wrap align-items-center gap-2 pt-1">
                      <span className="text-muted small me-2">Gợi ý:</span>
                      {availableSpecSuggestions.map((s) => (
                        <span
                          key={s}
                          className="suggest-chip"
                          onClick={() => addSpecTag(s)}
                          title="Bấm để chọn tag này"
                        >
                          + {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. MÔ TẢ & YÊU CẦU WYSIWYG */}
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    4
                  </span>
                  Mô tả công việc & Yêu cầu ứng viên (WYSIWYG Word-like)
                </h6>

                {/* Mô tả công việc */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="small fw-semibold mb-0">
                      Mô tả công việc <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="mini-toolbar">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("bold", e)}
                      >
                        <i className="bi bi-type-bold"></i> In đậm
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("insertUnorderedList", e)}
                      >
                        <i className="bi bi-list-ul"></i> Gạch đầu dòng
                      </button>
                    </div>
                  </div>
                  <div
                    ref={descRef}
                    className="rich-editor-box"
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: descHtml }}
                  />
                </div>

                {/* Yêu cầu ứng viên */}
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="small fw-semibold mb-0">
                      Yêu cầu ứng viên <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="mini-toolbar">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("bold", e)}
                      >
                        <i className="bi bi-type-bold"></i> In đậm
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("insertUnorderedList", e)}
                      >
                        <i className="bi bi-list-ul"></i> Gạch đầu dòng
                      </button>
                    </div>
                  </div>
                  <div
                    ref={reqRef}
                    className="rich-editor-box"
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: reqHtml }}
                  />
                </div>
              </div>

              {/* 5. 3 DÒNG TÓM TẮT ICON */}
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    5
                  </span>
                  Yêu cầu tóm tắt (3 dòng thẻ Icon)
                </h6>
                <div className="d-flex flex-column gap-2">
                  <div className="summary-icon-row">
                    <span className="summary-icon">💡</span>
                    <div className="flex-grow-1">
                      <Form.Label className="small fw-bold mb-1">
                        Kiến thức ngành <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        value={sumIndustry}
                        onChange={(e) => setSumIndustry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="summary-icon-row">
                    <span className="summary-icon">📐</span>
                    <div className="flex-grow-1">
                      <Form.Label className="small fw-bold mb-1">
                        Kỹ năng cần có <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        value={sumRequired}
                        onChange={(e) => setSumRequired(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="summary-icon-row">
                    <span className="summary-icon">✏️</span>
                    <div className="flex-grow-1">
                      <Form.Label className="small fw-bold mb-1">
                        Kỹ năng nên có <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        value={sumPreferred}
                        onChange={(e) => setSumPreferred(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. THU NHẬP, QUYỀN LỢI & ĐỊA ĐIỂM (XẾP DỌC TỪ TRÊN XUỐNG) */}
              <div className="mb-4">
                <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <span
                    className="bg-success text-white rounded-circle d-inline-flex"
                    style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    6
                  </span>
                  Thu nhập, Quyền lợi & Địa điểm làm việc
                </h6>

                {/* 6.1 Quyền lợi & Đãi ngộ (Xếp dọc) */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="small fw-semibold mb-0">
                      Quyền lợi & Đãi ngộ <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="mini-toolbar">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("bold", e)}
                      >
                        <i className="bi bi-type-bold"></i> In đậm
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("insertUnorderedList", e)}
                      >
                        <i className="bi bi-list-ul"></i> Gạch đầu dòng
                      </button>
                    </div>
                  </div>
                  <div
                    ref={benefitsRef}
                    className="rich-editor-box"
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: benefitsHtml }}
                  />
                </div>

                {/* 6.2 Thời gian & Địa điểm (Xếp tiếp tục từ trên xuống) */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="small fw-semibold mb-0">
                      Thời gian & Địa điểm làm việc <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="mini-toolbar">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("bold", e)}
                      >
                        <i className="bi bi-type-bold"></i> In đậm
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => handleExecCommand("insertUnorderedList", e)}
                      >
                        <i className="bi bi-list-ul"></i> Gạch đầu dòng
                      </button>
                    </div>
                  </div>
                  <div
                    ref={scheduleRef}
                    className="rich-editor-box"
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: scheduleHtml }}
                  />
                </div>

                {/* 6.3 Link Google Maps */}
                <div>
                  <Form.Label className="small fw-semibold">
                    Link Google Maps vị trí văn phòng <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="url"
                      placeholder="https://maps.google.com/?q=..."
                      value={mapLink}
                      onChange={(e) => setMapLink(e.target.value)}
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => window.open(mapLink, "_blank")}
                      className="text-nowrap"
                    >
                      <i className="bi bi-geo-alt me-1"></i>Xem thử bản đồ ↗
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        ) : (
          /* TAB 2: LIVE PREVIEW */
          <div className="p-3 border rounded-3 bg-surface shadow-sm w-100" style={{ margin: "0 auto" }}>
            <div className="composer-preview-header mb-3">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <Badge bg="success" className="bg-opacity-10 text-success">
                  {jobLevel}
                </Badge>
                <Badge bg="primary" className="bg-opacity-10 text-primary">
                  {workType}
                </Badge>
                <span className="text-muted small">Hạn nộp: {deadline}</span>
              </div>
              <h3 className="fw-bold mb-2 text-body">{title}</h3>
              <div className="d-flex align-items-center gap-3 text-muted small flex-wrap">
                <span>
                  <i className="bi bi-building me-2"></i>FPT Digital Talent
                </span>
                <span>
                  <i className="bi bi-geo-alt me-2"></i>{address}
                </span>
                <span className="text-success fw-bold fs-6">
                  <i className="bi bi-cash me-2"></i>{getSalaryDisplay()}
                </span>
              </div>
            </div>

            {/* Tags preview */}
            <div className="p-3 rounded mb-3 bg-surface-2 border">
              <strong className="d-block small mb-2 text-muted">TIÊU CHÍ VÀ CHUYÊN MÔN:</strong>
              <div className="d-flex flex-wrap gap-1">
                {reqTags.map((t) => (
                  <span key={t} className="badge bg-success bg-opacity-10 text-success">
                    {t}
                  </span>
                ))}
                {specTags.map((t) => (
                  <span key={t} className="badge bg-secondary bg-opacity-10 text-body">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 3 Summary Cards Preview */}
            <div className="row g-2 mb-4">
              <div className="col-md-4">
                <div className="p-2 border rounded bg-surface h-100">
                  <div className="fw-bold small text-warning mb-1">💡 Kiến thức ngành</div>
                  <div className="small text-muted">{sumIndustry}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-2 border rounded bg-surface h-100">
                  <div className="fw-bold small text-primary mb-1">📐 Kỹ năng cần có</div>
                  <div className="small text-muted">{sumRequired}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-2 border rounded bg-surface h-100">
                  <div className="fw-bold small text-success mb-1">✏️ Kỹ năng nên có</div>
                  <div className="small text-muted">{sumPreferred}</div>
                </div>
              </div>
            </div>

            {/* Description Preview */}
            <div className="mb-4">
              <h5 className="fw-bold text-success border-bottom pb-2">Mô tả công việc</h5>
              <div dangerouslySetInnerHTML={{ __html: descRef.current?.innerHTML || descHtml }} />
            </div>

            {/* Requirements Preview */}
            <div className="mb-4">
              <h5 className="fw-bold text-success border-bottom pb-2">Yêu cầu ứng viên</h5>
              <div dangerouslySetInnerHTML={{ __html: reqRef.current?.innerHTML || reqHtml }} />
            </div>

            {/* Benefits Preview */}
            <div className="mb-4">
              <h5 className="fw-bold text-success border-bottom pb-2">Quyền lợi được hưởng</h5>
              <div dangerouslySetInnerHTML={{ __html: benefitsRef.current?.innerHTML || benefitsHtml }} />
            </div>

            {/* Schedule & Map Preview */}
            <div>
              <h5 className="fw-bold text-success border-bottom pb-2">Địa điểm & Thời gian làm việc</h5>
              <div dangerouslySetInnerHTML={{ __html: scheduleRef.current?.innerHTML || scheduleHtml }} />
              <div className="mt-2">
                <a href={mapLink} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm">
                  <i className="bi bi-map me-1"></i>Chỉ đường qua Google Maps
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top d-flex justify-content-between pe-4">
        <span className="text-muted small">
          {activeTab === "edit" ? "Tự động lưu demo vào hệ thống" : "Đang ở chế độ xem trước người dùng"}
        </span>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide}>
            Hủy bỏ
          </Button>
          <Button variant="success" className="fw-bold" onClick={handlePublish}>
            ✓ Đăng tin tuyển dụng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
