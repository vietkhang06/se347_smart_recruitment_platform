# MatchaJob - Nền Tảng Tuyển Dụng Thông Minh

Dự án nền tảng kết nối ứng viên và nhà tuyển dụng thông minh **MatchaJob** (SE347).

---

## 📁 Cấu Trúc Dự Án

```text
se347_smart_recruitment_platform/
├── .gitignore              # Cấu hình loại trừ file nhạy cảm và file tạm
├── index.html              # Entry point điều hướng tự động sang Frontend
├── README.md               # Tài liệu tổng quan dự án
└── Frontend/               # Phân hệ giao diện người dùng (HTML/CSS/JavaScript)
    ├── index.html          # Trang chủ chính
    ├── jobs.html           # Tìm kiếm và lọc việc làm
    ├── job-detail.html     # Chi tiết công việc & popup ứng tuyển
    ├── companies.html      # Danh sách doanh nghiệp
    ├── guides.html         # Cẩm nang nghề nghiệp
    ├── role.html           # Điều hướng chọn vai trò
    ├── login.html          # Đăng nhập (Ứng viên / Nhà tuyển dụng / Admin)
    ├── register.html       # Đăng ký tài khoản
    ├── forgot-password.html# Luồng khôi phục mật khẩu & OTP
    ├── saved.html          # Danh sách việc làm đã lưu
    ├── applications.html   # Quản lý tiến trình đơn ứng tuyển
    ├── profile.html        # Quản lý hồ sơ cá nhân & CV
    ├── employer.html       # Cổng Nhà tuyển dụng (9 phân hệ quản lý)
    ├── admin.html          # Cổng Quản trị viên (9 phân hệ điều hành)
    ├── css/                # Hệ thống stylesheet, CSS variables, Dark/Light mode
    ├── js/                 # Logic tương tác, state, mock-data & validation
    ├── assets/             # Logo, icon SVG và hình ảnh giao diện
    └── .env.example        # Mẫu biến môi trường cho Frontend
```

---

## 🚀 Cách Chạy Dự Án

### Cách 1: Khởi chạy từ thư mục gốc (Khuyên dùng)
1. Mở thư mục gốc của dự án bằng **VS Code**.
2. Cài đặt extension **Live Server** (nếu chưa có).
3. Chuột phải vào `index.html` (ở thư mục gốc) hoặc `Frontend/index.html` → chọn **Open with Live Server**.
4. Trình duyệt sẽ tự động mở trang chủ tại `http://localhost:5500/`.

### Cách 2: Mở trực tiếp thư mục `Frontend/`
1. Mở riêng thư mục `Frontend/` bằng **VS Code**.
2. Chuột phải vào `index.html` → chọn **Open with Live Server**.

---

## 💻 Công Nghệ Sử Dụng
- **Giao diện:** HTML5 Semantic, CSS3 hiện đại (CSS Variables, Flexbox/Grid, Glassmorphism).
- **Hành vi & Tương tác:** JavaScript (ES6+), `localStorage` lưu trữ trạng thái phiên, Dark/Light mode.
- **Tính năng nổi bật:**
  - Lọc và tìm kiếm công việc theo từ khóa, địa điểm, mức lương, hình thức làm việc.
  - Phân quyền theo 3 nhóm người dùng: Ứng viên (Candidate), Nhà tuyển dụng (Employer), Quản trị viên (Admin).
  - Cổng Quản lý tuyển dụng và Bảng điều khiển Quản trị viên chuyên sâu với đầy đủ modal và luồng tương tác.
