# MatchaJob - Nền Tảng Tuyển Dụng Thông Minh (SE347)

Dự án nền tảng kết nối ứng viên và nhà tuyển dụng thông minh **MatchaJob** (SE347), được xây dựng bằng **React.js 19 + Bootstrap 5 + Chart.js + AOS** với cấu trúc module hóa sạch sẽ, khả năng mở rộng cao và trải nghiệm người dùng hiện đại.

---

## 📌 THÔNG BÁO CHUYỂN ĐỔI CÔNG NGHỆ (MIGRATION UPDATE)

Dự án hiện đã hoàn tất khởi tạo và chuyển đổi nền tảng sang stack công nghệ hiện đại tại thư mục **[`Frontend_React/`](./Frontend_React)**:
* **React.js 19 + Vite**: SPA hoàn chỉnh, chuyển trang tức thời không reload.
* **Bootstrap 5 & Icons**: Thiết kế giao diện responsive toàn diện trên Mobile / Tablet / Desktop.
* **Chart.js (`react-chartjs-2`)**: Trực quan hóa dữ liệu thống kê, hiệu suất tuyển dụng 7 ngày, phễu ứng viên và biểu đồ tăng trưởng Admin.
* **AOS (Animate On Scroll)**: Hiệu ứng chuyển động trực quan khi cuộn trang.
* **React Router v6/v7**: Quản lý định tuyến 13 màn hình chức năng.
* **Module hóa 18 Sub-views & Modals**: Cổng Nhà tuyển dụng (HR) và Quản trị viên (Admin) được chia tách thành các sub-view độc lập.

> 💡 **Tài liệu chuyển đổi chi tiết cho Teammates:**
> * [Xem hướng dẫn phát triển React chi tiết tại Frontend_React/README.md](./Frontend_React/README.md)

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án

### Lựa chọn 1: Khởi chạy phiên bản React Mới (Khuyên dùng)
```bash
# 1. Chuyển vào thư mục Frontend_React
cd Frontend_React

# 2. Cài đặt các thư viện (chỉ cần chạy lần đầu)
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev

# 4. Mở trình duyệt tại: http://localhost:5173/ (hoặc port hiển thị trên terminal)
```

### Lựa chọn 2: Khởi chạy phiên bản Vanilla HTML tĩnh cũ
1. Mở thư mục `Frontend/` bằng **VS Code**.
2. Chuột phải vào `index.html` → chọn **Open with Live Server**.
3. Trình duyệt sẽ mở tại: `http://localhost:5500/`.

---

## 📁 Cấu Trúc Dự Án

```text
se347_smart_recruitment_platform/
├── .gitignore              # Cấu hình loại trừ node_modules, dist, env, tài liệu nháp
├── index.html              # Entry point điều hướng
├── README.md               # Tài liệu tổng quan dự án (Tệp này)
│
├── Frontend_React/         # 🚀 PHÂN HỆ REACT.JS + BOOTSTRAP 5 + CHART.JS + AOS
│   ├── package.json        # Dependencies: react 19, bootstrap 5, chart.js, aos, react-router-dom
│   ├── vite.config.js      # Cấu hình Vite bundler
│   ├── public/assets/      # Logo SVG và ảnh nền minh họa vai trò
│   └── src/
│       ├── main.jsx        # Điểm khởi chạy: nạp Bootstrap 5, AOS, Theme & Auth Contexts
│       ├── App.jsx         # Cấu hình Routes cho toàn bộ 13 màn hình
│       ├── components/     # Header, Footer, JobCard, 4 Biểu đồ Chart.js (HR & Admin)
│       ├── context/        # ThemeContext (Dark/Light), AuthContext, FavoritesContext, ToastContext
│       ├── hooks/          # useAOS, useTheme...
│       ├── pages/          # Public (Home, Jobs, Detail), Auth, Candidate, Employer, Admin
│       ├── services/       # data.js, mockData.js, storage.js (ES6)
│       └── styles/         # tokens.css (Bảng màu xanh Matcha chuẩn #2d8653)
│
└── Frontend/               # 📦 PHÂN HỆ GỐC: HTML5/CSS3/Vanilla JS (MPA)
    ├── index.html          # Trang chủ
    ├── jobs.html           # Tìm kiếm việc làm
    ├── employer.html       # Cổng Nhà tuyển dụng
    ├── admin.html          # Cổng Quản trị viên
    ├── css/                # CSS gốc
    └── js/                 # JS gốc
```

---

## 🔑 Tài Khoản Demo Để Kiểm Thử Nhanh

Tại trang đăng nhập (`/auth/login`), sử dụng các nút **Dùng thử nhanh** ở cuối form:
- **Ứng viên Demo:** Truy cập cổng tìm việc, theo dõi đơn nộp, scan CV.
- **HR Demo:** Truy cập bảng điều khiển tuyển dụng, đăng tin mới, sàng lọc Kanban, xem thống kê hiệu suất.
- **Admin Demo:** Quyền điều phối toàn hệ thống, kiểm duyệt tin, xem nhật ký logs.

---

## 👥 BẢNG PHÂN CHIA NHIỆM VỤ DÀNH CHO TEAMMATES (TASK BOARD)

Bảng phân chia công việc để các thành viên trong nhóm có thể tiếp nhận và tiếp tục hoàn thiện dự án:

| STT | Phân hệ / Nhiệm vụ | Trạng thái | Teammate đảm nhiệm | Mô tả chi tiết |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Khởi tạo React + Bootstrap 5 + AOS + Chart.js** | ✅ **Hoàn thành** | Core Setup | Đã thiết lập khung Vite, Bootstrap, AOS, React Router và 4 biểu đồ Chart.js. |
| **2** | **Chuyển đổi 13 trang HTML sang React** | ✅ **Hoàn thành** | Core Setup | Đã chuyển đổi Public, Auth, Candidate, Employer và Admin Portals. |
| **3** | **Quản lý trạng thái Context API & Theme** | ✅ **Hoàn thành** | Core Setup | Theme Dark/Light, Auth phân quyền 3 vai trò, Toast, Favorites. |
| **4** | **Module hóa 18 Sub-views & Modals trong Portals** | ✅ **Hoàn thành** | Core Setup | Đã chia nhỏ toàn bộ các tab và modal trong `EmployerPortal` và `AdminPortal` thành các component độc lập (`views/`, `components/`). |
| **5** | **Nâng cấp Bộ soạn thảo tin đăng (JobComposer)** | ✅ **Hoàn thành** | Core Setup | Lịch custom dark/light hạn nộp > 7 ngày, format tiền tệ, animation tag, kéo giãn modal (resizable), validation bắt buộc điền. |
| **6** | **Kết nối Backend REST API** | ⏳ **Chờ tiếp nhận** | Teammate A | Thay thế mock data trong `src/services/` bằng các hàm gọi API thật qua `axios`/`fetch` tới `http://localhost:3000/api`. |
| **7** | **Tương tác Kéo-Thả (Drag & Drop) Kanban** | ⏳ **Chờ tiếp nhận** | Teammate B | Thêm tính năng kéo thả thẻ ứng viên giữa 5 cột giai đoạn tuyển dụng bằng `@hello-pangea/dnd` trong `PipelineView.jsx`. |
| **8** | **Bộ tải lên tệp CV thực tế (File Upload)** | ⏳ **Chờ tiếp nhận** | Teammate C | Bổ sung khung chọn tệp PDF và kiểm tra định dạng/dung lượng file CV ở trang Profile và Modal Ứng tuyển. |
| **9** | **Viết Unit Test & Kiểm thử Tự động** | ⏳ **Chờ tiếp nhận** | Teammate D | Cài đặt Vitest/React Testing Library để viết test cho Auth và Forms. |

---

## 💻 Công Nghệ Sử Dụng Toàn Dự Án
- **Framework & Libraries:** React.js 19, Vite, Bootstrap 5, Bootstrap Icons.
- **Biểu đồ & Phân tích:** Chart.js, `react-chartjs-2`.
- **Hiệu ứng chuyển động:** AOS (Animate On Scroll).
- **Điều hướng:** React Router DOM v7.
- **Lưu trữ phiên & Dữ liệu:** `localStorage` đồng bộ hai chiều có cơ chế fallback.
