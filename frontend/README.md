# MatchaJob Frontend (React.js + Vite)

Phân hệ giao diện người dùng của nền tảng tuyển dụng thông minh **MatchaJob** (SE347), được xây dựng hoàn toàn bằng **React.js** với cấu trúc module hóa sạch sẽ, khả năng mở rộng cao và tích hợp các tính năng AI hỗ trợ tuyển dụng.

---

## 🚀 Khởi Chạy Nhanh Cho Thành Viên Nhóm

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Chạy server phát triển (Dev server)
```bash
npm run dev
```
Trình duyệt sẽ mở tại `http://localhost:5173/`.

### 3. Đóng gói kiểm tra bản build (Production build)
```bash
npm run build
npm run preview
```

---

## 📁 Cấu Trúc Mã Nguồn `src/`

```text
src/
├── assets/
│   ├── images/                 # Ảnh minh họa xác thực, ảnh nền
│   ├── icons/                  # Logo SVG và các icon tĩnh
│   └── fonts/                  # Phông chữ tùy biến
├── components/
│   ├── common/                 # Badge, Button, Card, EmptyState, Toast
│   ├── navbar/                 # Thanh điều hướng trên cùng, đổi vai trò, theme toggle
│   ├── sidebar/                # Menu thanh bên cho HR và Ứng viên
│   ├── modal/                  # Hộp thoại popup dùng chung
│   ├── form/                   # FormField wrapper và SearchInput
│   ├── job/                    # JobCard, JobFilter
│   ├── candidate/              # CandidateCard, CandidateRow
│   ├── matching/               # MatchScoreBadge, MatchBreakdown
│   └── chart/                  # BarChart, FunnelChart
├── layouts/
│   ├── MainLayout.jsx          # Layout chung cho trang công khai & đăng nhập
│   ├── HRLayout.jsx            # Layout chuyên dụng cho Nhà tuyển dụng
│   └── CandidateLayout.jsx     # Layout chuyên dụng cho Ứng viên
├── pages/
│   ├── auth/                   # Login, Register
│   ├── candidate/              # Dashboard, Profile, MyCV, Jobs, Applications
│   └── hr/                     # Dashboard, Jobs, Candidates, Screening, Ranking, Analytics
├── routes/
│   ├── AppRoutes.jsx           # Bản đồ điều hướng trung tâm
│   ├── ProtectedRoute.jsx      # Chặn truy cập khi chưa đăng nhập
│   └── RoleRoute.jsx           # Phân quyền theo vai trò (Candidate / Employer / Admin)
├── services/
│   ├── authService.js          # Xác thực & tài khoản demo
│   ├── candidateService.js     # Hồ sơ cá nhân, việc đã lưu, phân tích CV
│   ├── jobService.js           # Quản lý tin tuyển dụng & bộ lọc
│   ├── applicationService.js   # Quản lý đơn ứng tuyển
│   ├── matchingService.js      # Thuật toán MatchAI chấm điểm phù hợp
│   └── screeningService.js     # Quy trình sàng lọc hồ sơ
├── contexts/
│   └── AuthContext.jsx         # Quản lý trạng thái đăng nhập toàn ứng dụng
├── hooks/
│   ├── useAuth.js              # Hook tiện ích tài khoản
│   ├── useTheme.js             # Hook đổi Dark / Light mode
│   └── useToast.js             # Hook hiển thị thông báo popup
├── types/
│   └── index.js                # JSDoc type definitions
├── utils/
│   ├── formatters.js           # Định dạng tiền tệ, ngày tháng, tone trạng thái
│   └── storage.js              # Tiện ích tương tác an toàn với localStorage
└── constants/
    └── index.js                # Hằng số cấu hình vai trò, giai đoạn, danh mục
```

---

## 🔑 Tài Khoản Demo Để Kiểm Thử Nhanh

Tại trang đăng nhập (`/auth/login`), sử dụng các nút **Dùng thử nhanh** ở cuối form:
- **Ứng viên Demo:** Truy cập cổng tìm việc, theo dõi đơn nộp, scan CV.
- **HR Demo:** Truy cập bảng điều khiển tuyển dụng, đăng tin mới, sàng lọc Kanban, xem bảng xếp hạng MatchAI.
- **Admin Demo:** Quyền điều phối hệ thống.
