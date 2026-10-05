export const STAGES_PIPELINE = ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"];

export const CANDIDATE_STEPS = ["Đã nộp hồ sơ", "Sàng lọc hồ sơ", "Phỏng vấn chuyên môn", "Nhận kết quả Offer"];

// Helper to convert Kanban stage to Candidate Step (1-4)
export const mapStageToCandidateStep = (stage) => {
  switch (stage) {
    case "Mới":
      return 1;
    case "Sàng lọc":
      return 2;
    case "Bài kiểm tra":
      return 2;
    case "Phỏng vấn":
      return 3;
    case "Đề nghị":
      return 4;
    default:
      return 1;
  }
};

export const MOCK_APPLICATIONS = [
  {
    id: 101,
    candidateId: 1,
    candidateName: "Nguyễn An Khang",
    jobId: "JOB-2048",
    title: "Senior Product Designer",
    companyId: "COMP-01",
    company: "FPT Digital Talent",
    stage: "Phỏng vấn",
    step: 3,
    statusBadge: "is-success",
    date: "14/09/2026",
    coverLetter: "Tôi có 5 năm kinh nghiệm thiết kế sản phẩm số và rất hào hứng với định hướng phát triển của FPT Digital Talent."
  },
  {
    id: 102,
    candidateId: 1,
    candidateName: "Nguyễn An Khang",
    jobId: "JOB-2038",
    title: "Product Designer (E-commerce Flow)",
    companyId: "COMP-04",
    company: "Tiki Corporation",
    stage: "Bài kiểm tra",
    step: 2,
    statusBadge: "is-warning",
    date: "12/09/2026",
    coverLetter: "Mong muốn đóng góp vào việc tối ưu trải nghiệm mua sắm trên app Tiki."
  },
  {
    id: 103,
    candidateId: 1,
    candidateName: "Nguyễn An Khang",
    jobId: "JOB-2040",
    title: "UI/UX Designer (Game Platform)",
    companyId: "COMP-02",
    company: "VNG Corporation",
    stage: "Sàng lọc",
    step: 2,
    statusBadge: "is-neutral",
    date: "08/09/2026",
    coverLetter: "Có đam mê lớn với lĩnh vực game và trải nghiệm tương tác số."
  }
];
