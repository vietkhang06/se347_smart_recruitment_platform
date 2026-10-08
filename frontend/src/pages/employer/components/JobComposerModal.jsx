import { useState, useRef, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";
import HRContactCard from "../../../components/common/HRContactCard";

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

export default function JobComposerModal({ show, onHide, onJobCreated, onNavigateProfile }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("edit"); // "edit" | "preview"
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [exitTarget, setExitTarget] = useState(null); // "profile" | "close"
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // HR Profile state synced with mockStore
  const [hrProfile, setHrProfile] = useState(() => mockStore.getEmployerProfile());

  useEffect(() => {
    const handleStoreChange = () => {
      setHrProfile(mockStore.getEmployerProfile());
    };
    window.addEventListener("matchajob:store-changed", handleStoreChange);
    return () => window.removeEventListener("matchajob:store-changed", handleStoreChange);
  }, []);

  // Sync contenteditable refs when switching tabs
  const handleSwitchToPreview = () => {
    if (descRef.current) setDescHtml(descRef.current.innerHTML);
    if (reqRef.current) setReqHtml(reqRef.current.innerHTML);
    if (benefitsRef.current) setBenefitsHtml(benefitsRef.current.innerHTML);
    if (scheduleRef.current) setScheduleHtml(scheduleRef.current.innerHTML);
    setActiveTab("preview");
  };

  const handleSwitchToEdit = () => {
    setActiveTab("edit");
  };

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

  // Khi modal mở, tự động nạp bản nháp đã lưu (nếu có), ngoại trừ thông tin HR
  useEffect(() => {
    if (show) {
      const draft = mockStore.getJobDraft();
      if (draft) {
        if (draft.title !== undefined) setTitle(draft.title);
        if (draft.city !== undefined) setCity(draft.city);
        if (draft.address !== undefined) setAddress(draft.address);
        if (draft.jobLevel !== undefined) setJobLevel(draft.jobLevel);
        if (draft.workType !== undefined) setWorkType(draft.workType);
        if (draft.team !== undefined) setTeam(draft.team);
        if (draft.salaryMode !== undefined) setSalaryMode(draft.salaryMode);
        if (draft.salaryCurrency !== undefined) setSalaryCurrency(draft.salaryCurrency);
        if (draft.salaryMin !== undefined) setSalaryMin(draft.salaryMin);
        if (draft.salaryMax !== undefined) setSalaryMax(draft.salaryMax);
        if (draft.salarySingle !== undefined) setSalarySingle(draft.salarySingle);
        if (draft.deadline !== undefined) setDeadline(draft.deadline);
        if (draft.experience !== undefined) setExperience(draft.experience);
        if (draft.reqPool !== undefined) setReqPool(draft.reqPool);
        if (draft.specPool !== undefined) setSpecPool(draft.specPool);
        if (draft.reqTags !== undefined) setReqTags(draft.reqTags);
        if (draft.specTags !== undefined) setSpecTags(draft.specTags);
        if (draft.descHtml !== undefined) setDescHtml(draft.descHtml);
        if (draft.reqHtml !== undefined) setReqHtml(draft.reqHtml);
        if (draft.benefitsHtml !== undefined) setBenefitsHtml(draft.benefitsHtml);
        if (draft.scheduleHtml !== undefined) setScheduleHtml(draft.scheduleHtml);
        if (draft.sumIndustry !== undefined) setSumIndustry(draft.sumIndustry);
        if (draft.sumRequired !== undefined) setSumRequired(draft.sumRequired);
        if (draft.sumPreferred !== undefined) setSumPreferred(draft.sumPreferred);
        if (draft.mapLink !== undefined) setMapLink(draft.mapLink);
        setHasDraft(true);

        setTimeout(() => {
          if (descRef.current && draft.descHtml) descRef.current.innerHTML = draft.descHtml;
          if (reqRef.current && draft.reqHtml) reqRef.current.innerHTML = draft.reqHtml;
          if (benefitsRef.current && draft.benefitsHtml) benefitsRef.current.innerHTML = draft.benefitsHtml;
          if (scheduleRef.current && draft.scheduleHtml) scheduleRef.current.innerHTML = draft.scheduleHtml;
        }, 50);
      } else {
        setHasDraft(false);
      }
      // Thông tin HR luôn lấy bản mới nhất từ hồ sơ HR
      setHrProfile(mockStore.getEmployerProfile());
    }
  }, [show]);

  // Gom toàn bộ thông tin form hiện tại (ngoại trừ thông tin HR) để lưu nháp
  const getCurrentFormDataWithoutHr = () => {
    return {
      title,
      city,
      address,
      jobLevel,
      workType,
      team,
      salaryMode,
      salaryCurrency,
      salaryMin,
      salaryMax,
      salarySingle,
      deadline,
      experience,
      reqPool,
      specPool,
      reqTags,
      specTags,
      descHtml: descRef.current ? descRef.current.innerHTML : descHtml,
      reqHtml: reqRef.current ? reqRef.current.innerHTML : reqHtml,
      benefitsHtml: benefitsRef.current ? benefitsRef.current.innerHTML : benefitsHtml,
      scheduleHtml: scheduleRef.current ? scheduleRef.current.innerHTML : scheduleHtml,
      sumIndustry,
      sumRequired,
      sumPreferred,
      mapLink,
      savedAt: new Date().toISOString()
      // KHÔNG lưu hrProfile vào bản nháp theo đúng yêu cầu
    };
  };

  // Xử lý yêu cầu thoát / chuyển tab (yêu cầu xác nhận nếu chưa đăng tin)
  const handleRequestClose = () => {
    setExitTarget("close");
    setShowExitConfirmModal(true);
  };

  const handleRequestNavigateProfile = () => {
    setExitTarget("profile");
    setShowExitConfirmModal(true);
  };

  const handleCancelExit = () => {
    setShowExitConfirmModal(false);
    setExitTarget(null);
  };

  // Xác nhận: "Có, để sau làm tiếp" -> Lưu bản nháp (không gồm HR) và rời đi
  const handleConfirmExit = () => {
    const draftData = getCurrentFormDataWithoutHr();
    mockStore.saveJobDraft(draftData);
    setHasDraft(true);
    setShowExitConfirmModal(false);

    if (exitTarget === "profile") {
      showToast("Đã lưu bản nháp tin đăng thành công! Đang chuyển đến Hồ sơ HR...");
      if (onNavigateProfile) {
        onNavigateProfile();
      }
    } else {
      showToast("Đã lưu bản nháp tin đăng để sau làm tiếp.");
      onHide();
    }
    setExitTarget(null);
  };

  // Lưu bản nháp thủ công khi đang thao tác
  const handleSaveDraftManually = () => {
    const draftData = getCurrentFormDataWithoutHr();
    mockStore.saveJobDraft(draftData);
    setHasDraft(true);
    showToast("Đã lưu bản nháp tin đăng thành công!");
  };


  // Khôi phục bản nháp gần nhất từ mockStore
  const handleRestoreDraft = () => {
    const draft = mockStore.getJobDraft();
    if (!draft) {
      showToast("Không tìm thấy dữ liệu bản nháp đã lưu");
      setShowRestoreConfirmModal(false);
      return;
    }
    if (draft.title !== undefined) setTitle(draft.title);
    if (draft.city !== undefined) setCity(draft.city);
    if (draft.address !== undefined) setAddress(draft.address);
    if (draft.jobLevel !== undefined) setJobLevel(draft.jobLevel);
    if (draft.workType !== undefined) setWorkType(draft.workType);
    if (draft.team !== undefined) setTeam(draft.team);
    if (draft.salaryMode !== undefined) setSalaryMode(draft.salaryMode);
    if (draft.salaryCurrency !== undefined) setSalaryCurrency(draft.salaryCurrency);
    if (draft.salaryMin !== undefined) setSalaryMin(draft.salaryMin);
    if (draft.salaryMax !== undefined) setSalaryMax(draft.salaryMax);
    if (draft.salarySingle !== undefined) setSalarySingle(draft.salarySingle);
    if (draft.deadline !== undefined) setDeadline(draft.deadline);
    if (draft.experience !== undefined) setExperience(draft.experience);
    if (draft.reqPool !== undefined) setReqPool(draft.reqPool);
    if (draft.specPool !== undefined) setSpecPool(draft.specPool);
    if (draft.reqTags !== undefined) setReqTags(draft.reqTags);
    if (draft.specTags !== undefined) setSpecTags(draft.specTags);
    if (draft.descHtml !== undefined) setDescHtml(draft.descHtml);
    if (draft.reqHtml !== undefined) setReqHtml(draft.reqHtml);
    if (draft.benefitsHtml !== undefined) setBenefitsHtml(draft.benefitsHtml);
    if (draft.scheduleHtml !== undefined) setScheduleHtml(draft.scheduleHtml);
    if (draft.sumIndustry !== undefined) setSumIndustry(draft.sumIndustry);
    if (draft.sumRequired !== undefined) setSumRequired(draft.sumRequired);
    if (draft.sumPreferred !== undefined) setSumPreferred(draft.sumPreferred);
    if (draft.mapLink !== undefined) setMapLink(draft.mapLink);
    if (descRef.current && draft.descHtml) descRef.current.innerHTML = draft.descHtml;
    if (reqRef.current && draft.reqHtml) reqRef.current.innerHTML = draft.reqHtml;
    if (benefitsRef.current && draft.benefitsHtml) benefitsRef.current.innerHTML = draft.benefitsHtml;
    if (scheduleRef.current && draft.scheduleHtml) scheduleRef.current.innerHTML = draft.scheduleHtml;
    setHasDraft(true);
    setShowRestoreConfirmModal(false);
    showToast("Đã khôi phục thành công bản nháp gần nhất!");
  };

  const handleDiscardDraft = () => {
    mockStore.clearJobDraft();
    setHasDraft(false);
    const tmpl = DEFAULT_JOB_TEMPLATES.logisticsSales;
    setTitle(tmpl.title);
    setCity(tmpl.city);
    setAddress(tmpl.address);
    setJobLevel(tmpl.jobLevel);
    setWorkType(tmpl.workType);
    setTeam(tmpl.team);
    setSalaryMode(tmpl.salaryMode);
    setSalaryCurrency(tmpl.salaryCurrency);
    setSalaryMin(tmpl.salaryMin);
    setSalaryMax(tmpl.salaryMax);
    setSalarySingle(tmpl.salarySingle);
    setDeadline(formatDateString(defaultDeadlineDate));
    setExperience(tmpl.experience);
    setReqTags(tmpl.reqTags);
    setSpecTags(tmpl.specTags);
    setDescHtml(tmpl.descHtml);
    setReqHtml(tmpl.reqHtml);
    setBenefitsHtml(tmpl.benefitsHtml);
    setScheduleHtml(tmpl.scheduleHtml);
    if (descRef.current) descRef.current.innerHTML = tmpl.descHtml;
    if (reqRef.current) reqRef.current.innerHTML = tmpl.reqHtml;
    if (benefitsRef.current) benefitsRef.current.innerHTML = tmpl.benefitsHtml;
    if (scheduleRef.current) scheduleRef.current.innerHTML = tmpl.scheduleHtml;
    setSumIndustry(tmpl.summary.industry);
    setSumRequired(tmpl.summary.required);
    setSumPreferred(tmpl.summary.preferred);
    setMapLink(tmpl.mapLink);
    showToast("Đã xóa bản nháp và đặt lại nội dung mẫu ban đầu.");
  };

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

  // Salary Display helper: Chuẩn hóa hiển thị lương gọn gàng, vừa vặn thẩm mỹ
  const getSalaryDisplay = () => {
    const parseVal = (v) => {
      if (!v && v !== 0) return "";
      const raw = String(v).replace(/\D/g, "");
      if (!raw) return "";
      const num = Number(raw);
      if (salaryCurrency === "Triệu VNĐ") {
        if (num >= 1000000) {
          const millions = num / 1000000;
          return Number.isInteger(millions) ? String(millions) : String(millions.toFixed(1)).replace(/\.0$/, "");
        }
      }
      return Number(raw).toLocaleString("en-US");
    };

    if (salaryMode === "negotiable") return "Thỏa thuận";
    if (salaryMode === "range") {
      const minStr = parseVal(salaryMin) || "0";
      const maxStr = parseVal(salaryMax) || "0";
      return `${minStr} - ${maxStr} ${salaryCurrency}`;
    }
    if (salaryMode === "from") {
      const sStr = parseVal(salarySingle) || "0";
      return `Từ ${sStr} ${salaryCurrency}`;
    }
    if (salaryMode === "under") {
      const sStr = parseVal(salarySingle) || "0";
      return `Tối đa ${sStr} ${salaryCurrency}`;
    }
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
      company: "FPT Digital Talent",
      logo: "FP",
      contact: hrProfile,
      applicants: 0,
      views: 1,
      status: "Đang tuyển",
      posted: "Vừa xong"
    };

    // Save to unified mockStore
    const createdJob = mockStore.saveJob(newJob);

    if (onJobCreated) onJobCreated(createdJob);
    mockStore.clearJobDraft();
    setHasDraft(false);
    showToast(`Đã xuất bản tin tuyển dụng: ${title} (${createdJob.status})`);
    onHide();
  };

  return (
    <>
      <Modal
        show={show}
        onHide={handleRequestClose}
        dialogClassName={`composer-custom-dialog ${activeTab === "preview" ? "preview-mode" : ""}`}
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
              <div className="d-flex align-items-center gap-2 mt-1">
                {hasDraft ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm p-0 d-inline-flex align-items-center text-primary text-decoration-none shadow-none border-0 bg-transparent"
                      onClick={() => setShowRestoreConfirmModal(true)}
                      title="Nhấp để khôi phục lại nội dung bản nháp đã lưu gần nhất"
                    >
                      <span
                        className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 d-inline-flex align-items-center gap-1 composer-draft-badge"
                        style={{ cursor: "pointer" }}
                      >
                        <i className="bi bi-clock-history"></i>
                        <span className="fw-semibold">Bản nháp đã lưu</span>
                        <span className="opacity-75 fw-normal small">(Bấm để khôi phục)</span>
                      </span>
                    </button>
                    <span className="text-muted small">·</span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-primary text-decoration-none p-0 d-inline-flex align-items-center"
                      style={{ fontSize: "12px" }}
                      onClick={handleSaveDraftManually}
                      title="Lưu bản nháp nội dung hiện tại"
                    >
                      <i className="bi bi-floppy me-1"></i>Lưu nháp
                    </button>
                    <span className="text-muted small">·</span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger text-decoration-none p-0 d-inline-flex align-items-center"
                      style={{ fontSize: "12px" }}
                      onClick={handleDiscardDraft}
                      title="Xóa bản nháp và tạo tin mới từ đầu"
                    >
                      <i className="bi bi-trash me-1"></i>Xóa nháp
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm p-0 d-inline-flex align-items-center text-muted text-decoration-none shadow-none border-0 bg-transparent"
                      onClick={() => showToast("Chưa có bản nháp nào được lưu trước đó")}
                      title="Chưa có bản nháp nào được lưu"
                    >
                      <span
                        className="badge bg-light text-muted border px-2.5 py-1 d-inline-flex align-items-center gap-1"
                        style={{ cursor: "pointer" }}
                      >
                        <i className="bi bi-clock-history"></i>
                        <span className="fw-semibold">Bản nháp đã lưu</span>
                        <span className="opacity-75 fw-normal small">(Chưa có nháp)</span>
                      </span>
                    </button>
                    <span className="text-muted small">·</span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-primary text-decoration-none p-0 d-inline-flex align-items-center"
                      style={{ fontSize: "12px" }}
                      onClick={handleSaveDraftManually}
                      title="Lưu bản nháp nội dung hiện tại"
                    >
                      <i className="bi bi-floppy me-1"></i>Lưu nháp
                    </button>
                  </>
                )}
              </div>
            </div>

          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${activeTab === "edit" ? "btn-success" : "btn-outline-secondary"}`}
              onClick={handleSwitchToEdit}
            >
              <i className="bi bi-pencil-square me-1"></i>Soạn thảo
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "preview" ? "btn-success" : "btn-outline-secondary"}`}
              onClick={handleSwitchToPreview}
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
                        <option value="VNĐ">VNĐ</option>
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

              {/* 7. THÔNG TIN LIÊN HỆ HR */}
              <div className="mb-2 mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h6 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                    <span
                      className="bg-success text-white rounded-circle d-inline-flex"
                      style={{ width: 20, height: 20, fontSize: 11, alignItems: "center", justifyContent: "center" }}
                    >
                      7
                    </span>
                    Thông tin liên hệ HR phụ trách
                  </h6>
                  <Button
                    variant="outline-success"
                    size="sm"
                    className="fw-semibold"
                    onClick={handleRequestNavigateProfile}
                  >
                    <i className="bi bi-pencil-square me-1"></i>Chỉnh sửa thông tin HR
                  </Button>
                </div>

                <HRContactCard
                  contact={hrProfile}
                  isComposerSection={true}
                />
              </div>
            </div>
          </Form>
        ) : (
          /* TAB 2: LIVE PREVIEW NỘI DUNG CHÍNH TOÀN ĐỘ RỘNG */
          <div className="w-100">
            <div className="p-4 border rounded-3 bg-surface shadow-sm w-100">
              {/* Header: Company & Title */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white fs-3 shadow-sm flex-shrink-0"
                  style={{ width: "64px", height: "64px", backgroundColor: "var(--primary)" }}
                >
                  FP
                </div>
                <div>
                  <h1 className="h3 fw-bold mb-1 text-body">{title || "Chưa nhập tiêu đề việc làm"}</h1>
                  <div className="text-muted fs-6">
                    <span className="fw-semibold text-muted">FPT Digital Talent</span> · <span>{city || "Toàn quốc"}</span>
                  </div>
                </div>
              </div>

              {/* Badges row: salary, type, category, exp, match (Căn giữa tuyệt đối & kích cỡ hài hòa) */}
              <div className="job-highlight-group my-3 pb-3 border-bottom">
                <span className="job-highlight-badge badge-salary">{getSalaryDisplay()}</span>
                <span className="job-highlight-badge">{workType}</span>
                <span className="job-highlight-badge">{jobLevel}</span>
                <span className="job-highlight-badge">Kinh nghiệm: {experience}</span>
                <span className="job-highlight-badge badge-match">
                  <i className="bi bi-stars me-1 text-success"></i>96% Phù hợp
                </span>
              </div>

              {/* 3 Summary Cards */}
              <div className="row g-2 mb-4">
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface-2 h-100">
                    <div className="fw-bold small text-warning mb-1">💡 Kiến thức ngành</div>
                    <div className="small text-muted">{sumIndustry || "Chưa thiết lập"}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface-2 h-100">
                    <div className="fw-bold small text-primary mb-1">📐 Kỹ năng cần có</div>
                    <div className="small text-muted">{sumRequired || "Chưa thiết lập"}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-surface-2 h-100">
                    <div className="fw-bold small text-success mb-1">✏️ Kỹ năng nên có</div>
                    <div className="small text-muted">{sumPreferred || "Chưa thiết lập"}</div>
                  </div>
                </div>
              </div>

              {/* Skills tags */}
              {(reqTags.length > 0 || specTags.length > 0) && (
                <div className="p-3 rounded-3 mb-4 bg-surface-2 border">
                  <strong className="d-block small mb-2 text-muted">TIÊU CHÍ VÀ CHUYÊN MÔN:</strong>
                  <div className="d-flex flex-wrap gap-2">
                    {reqTags.map((t) => (
                      <Badge bg="success" className="bg-opacity-10 text-success p-2" key={t}>
                        {t}
                      </Badge>
                    ))}
                    {specTags.map((t) => (
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
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: descHtml }}
                />

                <h5 className="fw-bold mt-4 mb-3 text-body">Yêu cầu ứng viên</h5>
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: reqHtml }}
                />

                <h5 className="fw-bold mt-4 mb-3 text-body">Quyền lợi & Đãi ngộ</h5>
                <div
                  className="text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: benefitsHtml }}
                />

                {/* Schedule & Location */}
                <div className="mt-4">
                  <h5 className="fw-bold mb-3 text-body">Thời gian & Địa điểm làm việc</h5>
                  <div
                    className="text-muted leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: scheduleHtml }}
                  />
                  {mapLink && (
                    <div className="mt-2">
                      <a href={mapLink} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm">
                        <i className="bi bi-map me-1"></i>Chỉ đường qua Google Maps ↗
                      </a>
                    </div>
                  )}
                </div>

                {/* THÔNG TIN LIÊN HỆ HR */}
                <div className="mt-4">
                  <HRContactCard
                    contact={hrProfile}
                    title="Thông tin liên hệ HR phụ trách"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top d-flex justify-content-between pe-4">
        <span className="text-muted small">
          {activeTab === "edit"
            ? hasDraft
              ? "Đang áp dụng bản nháp đã lưu (ngoại trừ thông tin HR)"
              : "Bản nháp tự động lưu trên trình duyệt"
            : ""}
        </span>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={handleRequestClose}>
            Hủy bỏ
          </Button>
          <Button variant="success" className="fw-bold" onClick={handlePublish}>
            ✓ Đăng tin tuyển dụng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>

    {/* Modal xác nhận rời đi khi tin chưa hoàn thành */}
    <Modal
      show={showExitConfirmModal}
      onHide={handleCancelExit}
      centered
      backdrop="static"
      size="md"
    >
      <Modal.Header closeButton className="border-bottom">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning"
            style={{ width: 36, height: 36 }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          </div>
          <Modal.Title className="fw-bold fs-6 mb-0">Xác nhận rời khỏi trình tạo tin</Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="py-3 px-4">
        <h6 className="fw-bold text-body mb-2">
          Tin đăng của bạn chưa được hoàn thành, bạn có muốn rời đi không?
        </h6>
        <p className="text-muted small mb-3">
          {exitTarget === "profile"
            ? "Hệ thống sẽ lưu lại bản nháp các thông tin vừa nhập để bạn có thể tiếp tục sau khi cập nhật thông tin HR."
            : "Hệ thống sẽ lưu lại bản nháp các thông tin vừa nhập trên trình duyệt để bạn có thể quay lại tiếp tục bất kỳ lúc nào."}
        </p>
        <div className="p-2.5 px-3 rounded-3 bg-surface-2 border small text-muted d-flex align-items-center gap-2">
          <i className="bi bi-info-circle-fill text-success flex-shrink-0"></i>
          <span>Toàn bộ nội dung đang nhập sẽ được lưu nháp. Thông tin HR sẽ luôn tự động áp dụng hồ sơ mới nhất.</span>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top d-flex justify-content-end gap-2">
        <Button variant="outline-secondary" size="md" onClick={handleCancelExit}>
          Không, ở lại làm tiếp
        </Button>
        <Button variant="success" size="md" className="fw-bold" onClick={handleConfirmExit}>
          <i className="bi bi-floppy2 me-1"></i>Có, để sau làm tiếp
        </Button>
      </Modal.Footer>
    </Modal>

    {/* Modal xác nhận khôi phục bản nháp */}
    <Modal
      show={showRestoreConfirmModal}
      onHide={() => setShowRestoreConfirmModal(false)}
      centered
      backdrop="static"
      size="md"
    >
      <Modal.Header closeButton className="border-bottom">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary"
            style={{ width: 36, height: 36 }}
          >
            <i className="bi bi-arrow-counterclockwise fs-5"></i>
          </div>
          <Modal.Title className="fw-bold fs-6 mb-0">Xác nhận khôi phục bản nháp</Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="py-3 px-4">
        <p className="mb-2 text-body">
          Bạn có chắc chắn muốn khôi phục lại nội dung bản nháp đã lưu gần nhất?
        </p>
        <p className="mb-3 text-muted small">
          Tất cả các thông tin đang nhập trên form hiện tại sẽ được thay thế bằng dữ liệu từ bản nháp đã lưu trước đó.
        </p>
        <div className="p-2.5 px-3 rounded-3 bg-surface-2 border small text-muted d-flex align-items-center gap-2">
          <i className="bi bi-info-circle text-primary flex-shrink-0"></i>
          <span>Thông tin HR phụ trách vẫn sẽ luôn tự động áp dụng theo hồ sơ HR mới nhất.</span>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top d-flex justify-content-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowRestoreConfirmModal(false)}>
          Hủy bỏ
        </Button>
        <Button variant="primary" size="sm" className="fw-bold" onClick={handleRestoreDraft}>
          <i className="bi bi-arrow-counterclockwise me-1"></i>Khôi phục bản nháp
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
}
