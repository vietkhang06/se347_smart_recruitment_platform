/**
 * JobViewModel
 * Đối tượng View Model chuẩn hóa cho Tin tuyển dụng (Job Posting)
 */

export function createDefaultJob() {
  return {
    id: "",
    title: "",
    companyId: "COMP-01",
    companyName: "MatchaJob Enterprise",
    companyLogo: "MJ",
    salary: "Thỏa thuận",
    salaryMode: "negotiable",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "VND",
    location: "TP. Hồ Chí Minh",
    address: "",
    department: "",
    workType: "Toàn thời gian",
    workTypeCode: "full_time",
    categoryName: "Công nghệ thông tin",
    categoryId: "",
    level: "Middle",
    levelCode: "middle",
    experience: "1-3 năm",
    applicantCount: 0,
    viewCount: 0,
    status: "Đang tuyển",
    statusCode: "active",
    statusBadgeVariant: "success",
    postedDate: "",
    deadline: "",
    isExpired: false,
    description: "",
    requirements: "",
    benefits: "",
    schedule: "",
    skills: [],
    summaryIndustry: "",
    summaryRequired: "",
    summaryPreferred: "",
    mapLink: ""
  };
}
