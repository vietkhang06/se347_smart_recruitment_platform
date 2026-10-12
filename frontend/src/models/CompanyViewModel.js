/**
 * CompanyViewModel
 * Đối tượng View Model chuẩn hóa cho hồ sơ Doanh nghiệp (Company Profile)
 */

export function createDefaultCompany() {
  return {
    id: "COMP-01",
    name: "MatchaJob Enterprise",
    shortName: "MatchaJob",
    logo: "MJ",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    industry: "Công nghệ thông tin & Phần mềm",
    size: "150-500 nhân sự",
    location: "TP. Hồ Chí Minh",
    address: "Tòa nhà Innovation, Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM",
    website: "https://matchajob.vn",
    email: "contact@matchajob.vn",
    phone: "028 3888 9999",
    taxCode: "0316888999",
    established: "2020",
    verified: true,
    about: "MatchaJob là nền tảng kết nối nhân tài công nghệ và tuyển dụng thông minh được định hướng bởi AI.",
    perks: [
      "Chế độ làm việc Hybrid (2 ngày remote/tuần)",
      "Bảo hiểm sức khỏe cao cấp toàn diện",
      "Thưởng hiệu suất & Lương tháng 13",
      "Ngân sách tài trợ phát triển nghề nghiệp định kỳ"
    ]
  };
}
