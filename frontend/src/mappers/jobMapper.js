import { createDefaultJob } from "../models/JobViewModel";

// Bảng tra cứu trạng thái tin tuyển dụng
export const JOB_STATUS_MAP = {
  active: { text: "Đang tuyển", variant: "success" },
  pending: { text: "Chờ duyệt", variant: "warning" },
  paused: { text: "Tạm dừng", variant: "secondary" },
  closed: { text: "Đã đóng", variant: "dark" },
  draft: { text: "Bản nháp", variant: "light" }
};

export const WORK_TYPE_MAP = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  hybrid: "Hybrid",
  remote: "Từ xa",
  contract: "Hợp đồng"
};

export const JOB_LEVEL_MAP = {
  intern: "Thực tập",
  fresher: "Fresher",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
  lead: "Trưởng nhóm",
  director: "Giám đốc"
};

/**
 * Format số tiền sang dạng triệu VNĐ
 */
export function formatSalaryNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return null;
  const n = Number(num);
  if (n >= 1000000) {
    const mil = n / 1000000;
    return Number.isInteger(mil) ? String(mil) : mil.toFixed(1);
  }
  return String(n);
}

/**
 * Format chuỗi lương hiển thị
 */
export function formatSalaryDisplay(salaryMode, min, max, customSalary) {
  if (customSalary && typeof customSalary === "string" && customSalary.trim()) {
    return customSalary;
  }
  if (salaryMode === "negotiable") return "Thỏa thuận";

  const minStr = formatSalaryNumber(min);
  const maxStr = formatSalaryNumber(max);

  if (salaryMode === "range" && minStr && maxStr) {
    return `${minStr} – ${maxStr} Triệu VNĐ`;
  }
  if (salaryMode === "single" && minStr) {
    return `${minStr} Triệu VNĐ`;
  }
  return "Thỏa thuận";
}

/**
 * Chuẩn hóa ngày sang định dạng DD/MM/YYYY
 */
export function formatDate(input) {
  if (!input) return "";
  if (typeof input === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(input.trim())) {
    return input.trim();
  }
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return String(input);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(input);
  }
}

/**
 * Chuyển đổi từ Backend DTO hoặc mock object sang JobViewModel
 */
export function toJobViewModel(dto) {
  if (!dto) return createDefaultJob();

  // Chuẩn hóa status code & text
  let statusCode = (dto.status || dto.statusCode || "active").toLowerCase();
  if (statusCode === "đang tuyển") statusCode = "active";
  else if (statusCode === "chờ duyệt") statusCode = "pending";
  else if (statusCode === "tạm dừng") statusCode = "paused";
  else if (statusCode === "đã đóng") statusCode = "closed";
  else if (statusCode === "bản nháp") statusCode = "draft";

  const statusMeta = JOB_STATUS_MAP[statusCode] || { text: dto.status || "Đang tuyển", variant: "secondary" };

  // Chuẩn hóa workType code & text
  let workTypeCode = (dto.workType || dto.workTypeCode || dto.type || "full_time").toLowerCase();
  if (workTypeCode === "toàn thời gian") workTypeCode = "full_time";
  else if (workTypeCode === "bán thời gian") workTypeCode = "part_time";
  else if (workTypeCode === "từ xa") workTypeCode = "remote";

  const workTypeText = WORK_TYPE_MAP[workTypeCode] || dto.workType || dto.type || "Toàn thời gian";

  // Chuẩn hóa level code & text
  let levelCode = (dto.level || dto.levelCode || "middle").toLowerCase();
  const levelText = JOB_LEVEL_MAP[levelCode] || dto.level || "Middle";

  // Chuẩn hóa lương
  const salaryMode = (dto.salaryMode || "range").toLowerCase();
  const rawMin = dto.salaryMin !== undefined ? Number(String(dto.salaryMin).replace(/,/g, "")) : null;
  const rawMax = dto.salaryMax !== undefined ? Number(String(dto.salaryMax).replace(/,/g, "")) : null;
  const salaryDisplay = formatSalaryDisplay(salaryMode, rawMin, rawMax, dto.salary);

  // Kỹ năng & Yêu cầu bắt buộc
  let skills = [];
  let skillsWithRequirement = [];

  if (Array.isArray(dto.skillsWithRequirement)) {
    skillsWithRequirement = dto.skillsWithRequirement;
    skills = dto.skillsWithRequirement.map((s) => s.name || s.skillName || "");
  } else if (Array.isArray(dto.skills)) {
    dto.skills.forEach((s) => {
      if (typeof s === "string") {
        skills.push(s);
        skillsWithRequirement.push({
          skillId: s,
          name: s,
          isRequired: true
        });
      } else if (s && typeof s === "object") {
        const name = s.skillName || s.name || "";
        skills.push(name);
        skillsWithRequirement.push({
          skillId: s.skillId || s.id || name,
          name,
          isRequired: s.isRequired !== undefined ? Boolean(s.isRequired) : true
        });
      }
    });
  } else if (Array.isArray(dto.specTags)) {
    skills = dto.specTags;
    skillsWithRequirement = dto.specTags.map((tag) => ({
      skillId: tag,
      name: tag,
      isRequired: true
    }));
  }

  // Danh mục
  const categoryName = dto.category?.name || dto.categoryName || dto.category || "Công nghệ thông tin";
  const categoryId = dto.category?.id ? String(dto.category.id) : dto.categoryId || "";

  return {
    id: String(dto.id || ""),
    title: dto.title || "Tin tuyển dụng",
    companyId: String(dto.companyId || dto.company_id || "COMP-01"),
    companyName: dto.companyName || dto.company || "MatchaJob Enterprise",
    companyLogo: dto.companyLogo || dto.logo || "MJ",
    salary: salaryDisplay,
    salaryMode,
    salaryMin: rawMin,
    salaryMax: rawMax,
    salaryCurrency: dto.salaryCurrency || "VND",
    location: dto.location || "TP. Hồ Chí Minh",
    address: dto.address || "",
    department: dto.department || dto.team || "Engineering",
    workType: workTypeText,
    workTypeCode,
    categoryName,
    categoryId,
    level: levelText,
    levelCode,
    experience: dto.experience || dto.exp || "1-3 năm",
    applicantCount: Number(dto.applicantCount ?? dto.applicants ?? 0),
    viewCount: Number(dto.viewCount ?? dto.views ?? 0),
    status: statusMeta.text,
    statusCode,
    statusBadgeVariant: statusMeta.variant,
    postedDate: formatDate(dto.postedAt || dto.posted || dto.createdAt),
    deadline: formatDate(dto.deadline),
    isExpired: dto.deadline ? new Date(dto.deadline) < new Date() : false,
    description: dto.description || dto.desc || "",
    requirements: dto.requirements || "",
    benefits: dto.benefits || "",
    schedule: dto.schedule || "",
    skills: skills.filter(Boolean),
    skillsWithRequirement,
    summaryIndustry: dto.summaryIndustry || dto.summary?.industry || "",
    summaryRequired: dto.summaryRequired || dto.summary?.required || "",
    summaryPreferred: dto.summaryPreferred || dto.summary?.preferred || "",
    mapLink: dto.mapLink || ""
  };
}

/**
 * Helper format deadline sang YYYY-MM-DD
 */
function toIsoDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str.split("/").reverse().join("-");
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return null;
}

/**
 * Chuyển đổi từ JobViewModel hoặc form data sang JobCreateRequest DTO (POST /api/v1/employer/jobs)
 */
export function toJobCreateRequest(vm, companyId = "COMP-01") {
  // Map skills sang List<JobSkillItem>
  const skillsPayload = (vm.skillsWithRequirement || []).map((s) => ({
    skillId: s.skillId || s.id || (typeof s === "string" ? s : null),
    skillName: s.name || s.skillName || (typeof s === "string" ? s : ""),
    isRequired: s.isRequired !== undefined ? Boolean(s.isRequired) : true
  })).filter((s) => s.skillId || s.skillName);

  let statusCode = (vm.status || vm.statusCode || "active").toLowerCase();
  if (statusCode === "bản nháp" || statusCode === "draft") statusCode = "draft";
  else if (statusCode === "đang tuyển" || statusCode === "active") statusCode = "active";
  else if (statusCode === "tạm dừng" || statusCode === "paused") statusCode = "paused";
  else if (statusCode === "đã đóng" || statusCode === "closed") statusCode = "closed";

  return {
    companyId: vm.companyId || companyId,
    categoryId: vm.categoryId || null,
    title: vm.title,
    department: vm.department || vm.team || "Engineering",
    level: vm.levelCode || "middle",
    workType: vm.workTypeCode || "full_time",
    location: vm.location || "TP. Hồ Chí Minh",
    address: vm.address || "",
    mapLink: vm.mapLink || "",
    salaryMode: vm.salaryMode || "range",
    salaryMin: vm.salaryMin,
    salaryMax: vm.salaryMax,
    salaryCurrency: vm.salaryCurrency || "VND",
    experience: vm.experience || "1-3 năm",
    description: vm.description || "",
    requirements: vm.requirements || "",
    benefits: vm.benefits || "",
    schedule: vm.schedule || "",
    summaryIndustry: vm.summaryIndustry || "",
    summaryRequired: vm.summaryRequired || "",
    summaryPreferred: vm.summaryPreferred || "",
    status: statusCode,
    deadline: toIsoDate(vm.deadline),
    skills: skillsPayload
  };
}

/**
 * Chuyển đổi từ JobViewModel sang JobUpdateRequest DTO (PUT /api/v1/employer/jobs/{id})
 */
export function toJobUpdateRequest(vm) {
  const skillsPayload = (vm.skillsWithRequirement || []).map((s) => ({
    skillId: s.skillId || s.id || (typeof s === "string" ? s : null),
    skillName: s.name || s.skillName || (typeof s === "string" ? s : ""),
    isRequired: s.isRequired !== undefined ? Boolean(s.isRequired) : true
  })).filter((s) => s.skillId || s.skillName);

  return {
    categoryId: vm.categoryId || null,
    title: vm.title,
    department: vm.department || vm.team,
    level: vm.levelCode,
    workType: vm.workTypeCode,
    location: vm.location,
    address: vm.address,
    mapLink: vm.mapLink,
    salaryMode: vm.salaryMode,
    salaryMin: vm.salaryMin,
    salaryMax: vm.salaryMax,
    salaryCurrency: vm.salaryCurrency || "VND",
    experience: vm.experience,
    description: vm.description,
    requirements: vm.requirements,
    benefits: vm.benefits,
    schedule: vm.schedule,
    summaryIndustry: vm.summaryIndustry,
    summaryRequired: vm.summaryRequired,
    summaryPreferred: vm.summaryPreferred,
    deadline: toIsoDate(vm.deadline),
    skills: skillsPayload
  };
}
