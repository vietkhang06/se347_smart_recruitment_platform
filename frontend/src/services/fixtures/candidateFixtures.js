// Shape bám JobSummaryResponse/JobDetailResponse và Auth_API_Contract_v2.
// Dữ liệu minh họa độc lập, không sử dụng danh tính/doanh nghiệp của mockStore.
export const fixtureCategories = [
  { id: "44444444-4444-4444-8444-444444444441", name: "Software Engineering", icon: null, status: "active", sortOrder: 1 },
  { id: "44444444-4444-4444-8444-444444444442", name: "Data & AI", icon: null, status: "active", sortOrder: 2 },
  { id: "44444444-4444-4444-8444-444444444443", name: "Quality Assurance", icon: null, status: "active", sortOrder: 3 }
];
const names = ["React Developer", "Java Backend Developer", "Data Engineer", "QA Engineer", "Frontend Intern", "Python Developer"];
export const fixtureJobs = Array.from({ length: 18 }, (_, index) => ({
  id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
  companyId: "33333333-3333-4333-8333-333333333333",
  category: fixtureCategories[index % 3],
  title: `${names[index % names.length]} ${index + 1}`,
  slug: `fixture-job-${index + 1}`, department: "Engineering",
  level: ["intern", "junior", "middle", "senior"][index % 4],
  workType: ["full_time", "remote", "hybrid", "part_time", "contract"][index % 5],
  location: ["Ho Chi Minh City", "Ha Noi", "Dong Nai"][index % 3],
  salaryMode: "range", salaryMin: (10 + index) * 1000000,
  salaryMax: (20 + index) * 1000000, salaryCurrency: "VND",
  experience: `${index % 4}–${index % 4 + 2} năm`,
  applicantCount: 0, viewCount: 0, status: "active",
  postedAt: new Date(Date.UTC(2026, 9, 18 - index)).toISOString(),
  deadline: "2030-12-31", skills: ["JavaScript", "React", "SQL"]
}));
fixtureJobs.push({ ...fixtureJobs[0], id: "22222222-2222-4222-8222-000000000099", title: "Tin đã đóng — fixture", status: "closed" });
export function fixtureJobDetail(job) {
  return { ...job, createdBy: "11111111-1111-4111-8111-111111111112",
    address: job.location, mapLink: null,
    description: `Tham gia phát triển và bảo trì sản phẩm ở vị trí ${job.title}.\nPhối hợp cùng nhóm để triển khai các tính năng và kiểm tra chất lượng.`,
    requirements: "Có kiến thức lập trình, Git và tư duy giải quyết vấn đề.\nCó khả năng giao tiếp và làm việc nhóm.",
    benefits: "Được hướng dẫn kỹ thuật và tham gia các buổi chia sẻ kiến thức.",
    schedule: "Thứ Hai đến thứ Sáu", summaryIndustry: "Công nghệ thông tin",
    summaryRequired: "Lập trình và làm việc nhóm", summaryPreferred: "Có dự án cá nhân",
    createdAt: job.postedAt, updatedAt: job.postedAt,
    skills: job.skills.map((name, index) => ({ skillId: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`, skillName: name, isRequired: true })) };
}
export const fixtureCandidate = {
  id: "11111111-1111-4111-8111-111111111111", email: "thong.fixture@example.com",
  full_name: "Nguyễn Thông", role: "candidate", status: "active", is_verified: true, companies: []
};
export function emptyFixtureProfile(userId) {
  return { id: crypto.randomUUID(), user_id: userId, headline: null, bio: null,
    experience_years: null, education: null, location: null, address: null,
    cv_url: null, ai_cv_score: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}