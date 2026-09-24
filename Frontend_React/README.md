# MAT военных & MatchaJob — React Frontend Application (`Frontend_React`)

> **Phiên bản chuyển đổi công nghệ**: React.js SPA (Vite)  
> **Bộ công nghệ**: React.js 19, Bootstrap 5, Chart.js (`react-chartjs-2`), AOS (Animate On Scroll), React Router DOM v7  
> **Trạng thái**: Đã khởi tạo hoàn tất cấu trúc SPA, tích hợp sẵn Design Tokens Matcha, các Contexts toàn cục, 4 biểu đồ Chart.js, hiệu ứng AOS và hệ thống định tuyến cho toàn bộ 13 màn hình.

---

## 1. HƯỚNG DẪN KHỞI CHẠY (QUICK START DÀNH CHO TEAMMATES)

### Yêu cầu môi trường
- **Node.js**: Phiên bản 18+ (khuyến nghị 20+ hoặc 24+)
- **NPM**: Phiên bản 9+

### Các bước cài đặt và chạy
```bash
# 1. Di chuyển vào thư mục React
cd Frontend_React

# 2. Cài đặt các gói phụ thuộc (nếu chưa cài)
npm install

# 3. Khởi chạy máy chủ phát triển (Dev Server)
npm run dev

# 4. Truy cập trình duyệt tại địa chỉ:
# http://localhost:5173/
```

### Các lệnh hữu ích khác
```bash
npm run build      # Biên dịch mã nguồn kiểm tra lỗi cú pháp và đóng gói bản phát hành
npm run preview    # Xem thử bản đóng gói production trên máy cục bộ
```

---

## 2. KIẾN TRÚC & PHÂN CÔNG TÀI NGUYÊN (`src/`)

```text
Frontend_React/
├── public/
│   └── assets/                     # Ảnh visual vai trò (auth-*.jpg), logo.svg
├── src/
│   ├── main.jsx                    # Entry point: nạp Bootstrap 5, Icons, AOS CSS & Contexts
│   ├── App.jsx                     # Bộ định tuyến React Router v6 cho toàn bộ các màn hình
│   │
│   ├── styles/
│   │   └── tokens.css              # Design tokens chuẩn MatchaJob: bảng màu xanh matcha, dark/light mode
│   │
│   ├── context/                    # QUẢN LÝ TRẠNG THÁI TOÀN CỤC (GLOBAL STATE)
│   │   ├── ThemeContext.jsx        # Quản lý Light/Dark Mode (đồng bộ cả body.dark & data-bs-theme Bootstrap)
│   │   ├── AuthContext.jsx         # Quản lý thông tin đăng nhập, vai trò (candidate/employer/admin)
│   │   ├── FavoritesContext.jsx    # Quản lý danh sách ID việc làm yêu thích (tim đỏ)
│   │   └── ToastContext.jsx        # Hệ thống thông báo Toast React-Bootstrap góc phải
│   │
│   ├── hooks/
│   │   └── useAOS.js               # Tự động làm mới AOS animation mỗi khi chuyển Route
│   │
│   ├── services/                   # DỮ LIỆU & STORAGE
│   │   ├── data.js                 # Danh sách việc làm công khai, công ty, cẩm nang (ES6)
│   │   ├── mockData.js             # Dữ liệu chuyên sâu cho Nhà tuyển dụng và Quản trị viên (ES6)
│   │   └── storage.js              # Helper thao tác localStorage an toàn có fallback
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx          # Thanh điều hướng Navbar Bootstrap chuẩn responsive + dark mode
│   │   │   └── Footer.jsx          # Chân trang thống nhất
│   │   ├── jobs/
│   │   │   └── JobCard.jsx         # Thẻ việc làm (thả tim, hiển thị match %, hiệu ứng AOS)
│   │   └── charts/                 # HỆ THỐNG BIỂU ĐỒ CHART.JS CHO HR & ADMIN
│   │       ├── RecruitmentTrendChart.jsx   # Biểu đồ cột/đường hiệu suất tuyển dụng 7 ngày
│   │       ├── RecruitmentFunnelChart.jsx  # Biểu đồ thanh ngang phễu tuyển dụng 5 giai đoạn
│   │       ├── SourceDistributionChart.jsx # Biểu đồ tròn Doughnut kênh nguồn ứng viên
│   │       └── PlatformGrowthChart.jsx     # Biểu đồ vùng Area Chart tăng trưởng nền tảng Admin
│   │
│   └── pages/                      # CÁC TRANG CHỨC NĂNG THEO MODULE
│       ├── public/                 # Module 2: Khám phá công khai
│       │   ├── HomePage.jsx        # Trang chủ: Hero, Search, Stats Strip, Featured Jobs, AOS
│       │   ├── JobsPage.jsx        # Trang tìm việc: Bộ lọc từ khóa/địa điểm/hình thức realtime
│       │   ├── JobDetailPage.jsx   # Chi tiết công việc & Modal nộp hồ sơ ứng tuyển
│       │   ├── CompaniesPage.jsx   # Danh bạ doanh nghiệp công nghệ tiêu biểu
│       │   └── GuidesPage.jsx      # Cẩm nang nghề nghiệp
│       │
│       ├── auth/                   # Module 3: Xác thực & Định danh
│       │   ├── RoleSelectPage.jsx  # Chọn 3 vai trò (Ứng viên, Nhà tuyển dụng, Admin)
│       │   ├── LoginPage.jsx       # Đăng nhập split-screen đổi hình nền visual theo vai trò
│       │   ├── RegisterPage.jsx    # Đăng ký tài khoản (trường động công ty cho HR)
│       │   └── ForgotPasswordPage.jsx # Quên mật khẩu 3 bước kèm OTP auto-focus
│       │
│       ├── candidate/              # Module 4: Không gian ứng viên
│       │   ├── ProfilePage.jsx     # Hồ sơ cá nhân + Công cụ chấm điểm CV bằng AI trực quan
│       │   ├── SavedJobsPage.jsx   # Danh sách các việc làm đã bấm yêu thích
│       │   └── ApplicationsPage.jsx# Bảng theo dõi tiến trình ứng tuyển với timeline 4 nấc
│       │
│       ├── employer/               # Module 5: Cổng Nhà tuyển dụng (HR)
│       │   ├── EmployerPortal.jsx  # Container điều phối Tab và State dùng chung
│       │   ├── components/         # Modals: CandidateDetail, Interview, JobComposer, Plan
│       │   └── views/              # 9 Sub-views: Overview, Analytics, Jobs, Pipeline, Candidates,
│       │                           # Interviews, Company, Billing, Profile
│       │
│       └── admin/                  # Module 6: Cổng Quản trị viên (Admin)
│           ├── AdminPortal.jsx     # Container điều phối Tab và State kiểm duyệt
│           ├── components/         # Modals: Category, Moderation, ReportDetail, UserDetail
│           └── views/              # 9 Sub-views: AdminOverview, Moderation, Users, Categories,
│                                   # Reports, System, Logs, Notifications, AdminProfile
```

---

## 3. CHECKLIST BÀN GIAO & PHÂN CHIA CÔNG VIỆC CHO TEAMMATES

Các teammate tiếp nhận dự án có thể nhận việc theo các đầu mục được đánh dấu bên dưới:

### ✅ Các hạng mục ĐÃ HOÀN THÀNH (Baseline Completed)
- [x] Khởi tạo dự án React (Vite) tốc độ cao, tích hợp Bootstrap 5, Icons, Chart.js, AOS và React Router DOM.
- [x] Chuyển đổi toàn bộ dữ liệu tĩnh sang ES6 modules (`data.js`, `mockData.js`, `storage.js`).
- [x] Cấu hình 4 React Contexts toàn cục: `ThemeContext` (Dark/Light), `AuthContext`, `FavoritesContext`, `ToastContext`.
- [x] Chuyển đổi toàn bộ 13 màn hình từ HTML tĩnh sang React Components hoàn chỉnh.
- [x] Xây dựng 4 biểu đồ tương tác cao bằng **Chart.js** (`RecruitmentTrendChart`, `RecruitmentFunnelChart`, `SourceDistributionChart`, `PlatformGrowthChart`) tương thích tự động với Dark/Light Mode.
- [x] Tích hợp hiệu ứng cuộn trang sống động bằng **AOS** trên Landing Page, Danh bạ công ty, Cẩm nang nghề nghiệp.
- [x] **Module hóa toàn diện 18 Sub-views & Modals** cho Employer Portal và Admin Portal: cấu trúc code sạch, phân tách rõ ràng trách nhiệm từng view.
- [x] **Nâng cấp Cửa sổ soạn thảo tin đăng (JobComposerModal)**:
  - Tự động định dạng tiền tệ `xxx,yyy,zzz`.
  - Bộ chọn lịch tuỳ chỉnh giao diện riêng (Dark/Light mode) khoá chọn ngày < 7 ngày tới.
  - Tương tác gợi ý Thẻ Tag 2 chiều có hiệu ứng động mượt mà (chọn thì ẩn, xóa thì hoàn trả).
  - Khả năng kéo giãn linh hoạt cửa sổ popup (CSS resize), các ô co giãn theo tỉ lệ.
  - Xác thực (validation) bắt buộc điền toàn bộ dữ liệu trước khi đăng tin (trừ các combobox mặc định).
- [x] Kiểm thử toàn bộ trên trình duyệt thực tế và đóng gói thành công (`npm run build`).

---

### 📌 Các hạng mục TIẾP THEO để Teammates đảm nhiệm (To-Do for Teammates)

| Hạng mục / Module | Mô tả chi tiết công việc | File liên quan | Teammate phụ trách (Gợi ý) |
| :--- | :--- | :--- | :---: |
| **1. Kết nối Backend API** | Thay thế việc đọc/ghi từ `localStorage` sang gọi HTTP REST API thông qua `axios` hoặc `fetch` tới `http://localhost:3000/api`. | `src/services/api.js`, `src/services/storage.js` | Backend/API Integrator |
| **2. Nâng cấp Bảng Kanban kéo thả** | Tích hợp thư viện `@hello-pangea/dnd` hoặc HTML5 Drag & Drop để kéo thả ứng viên giữa 5 cột giai đoạn trong tab Phễu tuyển dụng Kanban. | `src/pages/employer/views/PipelineView.jsx` | Frontend Developer |
| **3. Upload tệp CV thực tế** | Thêm component kéo-thả tệp PDF (Drag-and-Drop file uploader) trong trang `ProfilePage.jsx` và Modal nộp hồ sơ ở `JobDetailPage.jsx`. | `ProfilePage.jsx`, `JobDetailPage.jsx` | UI/UX Developer |
| **4. Viết Unit Test & Component Test** | Viết test case sử dụng Vitest hoặc React Testing Library cho các Contexts (`AuthContext`, `FavoritesContext`) và các Form kiểm tra tính hợp lệ. | `src/__tests__/` | QA / Tester |
| **5. Tối ưu Code Splitting** | Bọc các Route nặng (Employer và Admin) bằng `React.lazy()` và `Suspense` để tối ưu bundle size khi tải trang lần đầu. | `src/App.jsx` | Performance Specialist |

---

## 4. QUY TẮC PHÁT TRIỂN & QUY ƯỚC MÃ NGUỒN (CONVENTIONS)

1. **Sử dụng Bootstrap 5 Utility kết hợp Tokens**:
   - Sử dụng các lớp tiện ích của Bootstrap 5 (`d-flex`, `justify-content-between`, `p-3`, `rounded-3`, `gap-2`).
   - Sử dụng các biến màu CSS từ `tokens.css`: `var(--primary)`, `var(--surface)`, `var(--text)`, `var(--border)`. Tránh hardcode màu sắc `#fff` hoặc `#000` để đảm bảo Dark Mode luôn hiển thị chuẩn.
2. **Khai báo và Tương tác Context**:
   - Lấy trạng thái theme: `const { theme, toggleTheme } = useTheme();`
   - Hiển thị Toast thông báo: `const { showToast } = useToast(); showToast("Thông điệp...");`
   - Quản lý yêu thích: `const { isFavorite, toggleFavorite } = useFavorites();`
   - Quản lý tài khoản: `const { user, role, login, logout } = useAuth();`
3. **Hiệu ứng AOS Animation**:
   - Thêm thuộc tính `data-aos="fade-up"` (hoặc `fade-down`, `zoom-in`, `fade-right`, `fade-left`) và `data-aos-delay="100"` trên các thẻ JSX. Hook `useAOS()` trong `App.jsx` đã tự động xử lý việc làm mới hiệu ứng khi chuyển Route.
4. **Biểu đồ Chart.js**:
   - Khi tạo thêm biểu đồ mới, nhớ đăng ký các thành phần cần thiết qua `ChartJS.register(...)`. Luôn đọc `isDark` từ `useTheme()` để phối màu chữ và đường lưới tương thích.
