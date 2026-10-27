# MatchaJob — React Frontend Application (`frontend/`)

> **Phiên bản nền tảng**: React.js 19 SPA (Vite v8)  
> **Bộ công nghệ**: React 19, Bootstrap 5, Chart.js (`react-chartjs-2`), AOS (Animate On Scroll), React Router DOM v7, Native Fetch Client  
> **Kiến trúc dữ liệu**: **Ports & Adapters (Hexagonal Architecture)** với 5 View Models chuẩn hóa, Bộ chuyển đổi Mapper hai chiều, Fixtures độc lập và Service Adapter hỗ trợ chuyển đổi linh hoạt giữa Mock offline và Spring Boot REST API.

---

## 1. HƯỚNG DẪN KHỞI CHẠY (QUICK START)

### Yêu cầu môi trường
* **Node.js**: Phiên bản 18+ (khuyên dùng Node 20+ hoặc 22+)
* **NPM**: Phiên bản 9+

### Khởi chạy môi trường phát triển (Development)
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các thư viện phụ thuộc (nếu chưa cài)
npm install

# 3. Khởi chạy máy chủ phát triển Vite
npm run dev

# 4. Mở trình duyệt tại: http://localhost:5173/
```

### Các lệnh kiểm tra & đóng gói
```bash
npm run lint       # Kiểm tra quy chuẩn mã nguồn với Oxlint (0 errors)
npm run build      # Biên dịch kiểm tra lỗi cú pháp và đóng gói bản phát hành dist/
npm run preview    # Xem trước bản đóng gói production trên cổng cục bộ
```

### Chuyển đổi nguồn dữ liệu Mock / API
Hệ thống hỗ trợ chuyển đổi chế độ dữ liệu tức thời tại tệp [`.env`](../.env) ở thư mục gốc:
```ini
# Chạy Offline độc lập 100% bằng Fixtures (không cần Backend):
VITE_DATA_SOURCE=mock

# Chạy kết nối với Backend Spring Boot thật (Cổng 8081):
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8081/api
```

---

## 2. KIẾN TRÚC THƯ MỤC & PHÂN TẦNG DỮ LIỆU (`src/`)

```text
frontend/src/
├── fixtures/                           # 📦 DỮ LIỆU MẪU ĐỘC LẬP (FIXTURES)
│   ├── companies.fixture.js            # Hồ sơ doanh nghiệp mẫu
│   ├── jobs.fixture.js                 # Danh sách việc làm mẫu đầy đủ các trạng thái
│   ├── applications.fixture.js         # Ứng viên mẫu phủ khắp 5 giai đoạn tuyển dụng
│   ├── rankings.fixture.js             # Bảng xếp hạng AI ranking mẫu
│   ├── admin.fixture.js                # Danh mục, kiểm duyệt, user, báo cáo, logs mẫu
│   └── statistics.fixture.js           # Chỉ số KPI và biểu đồ Chart.js mẫu
│
├── models/                             # 📋 5 VIEW MODELS CHUẨN HÓA
│   ├── CompanyViewModel.js             # Model hồ sơ doanh nghiệp & tiện ích phúc lợi
│   ├── JobViewModel.js                 # Model việc làm, format lương, status badge
│   ├── ApplicationViewModel.js         # Model ứng viên & 7 giai đoạn tuyển dụng
│   ├── RankingViewModel.js             # Model thứ hạng AI, điểm match, lý do đánh giá
│   └── StatisticsViewModel.js          # Model thẻ KPI và biểu đồ cho HR & Admin
│
├── mappers/                            # 🔄 BỘ CHUYỂN ĐỔI HAI CHIỀU (DTO <-> VIEWMODEL)
│   ├── companyMapper.js                # Chuyển đổi Company entity/DTO <-> CompanyViewModel
│   ├── jobMapper.js                    # Chuyển đổi Job DTOs <-> JobViewModel (Format lương, ngày, status)
│   ├── applicationMapper.js            # Chuyển đổi 7 giai đoạn ApplicationStage <-> ViewModel
│   ├── rankingMapper.js                # Chuyển đổi AI Ranking DTOs <-> RankingViewModel
│   └── statisticsMapper.js             # Tính toán số liệu tổng hợp (Client-side aggregation fallback)
│
├── services/                           # 🔌 SERVICE ADAPTER ARCHITECTURE
│   ├── httpClient.js                   # Client HTTP native fetch, tự động đính kèm X-Candidate-Id/X-User-Id
│   ├── contracts/                      # Khai báo Interface JSDoc cho các service
│   ├── mock/                           # Triển khai Mock Adapter qua Fixtures & LocalStorage
│   │   ├── mockJobService.js           # CRUD việc làm, danh mục, kỹ năng, lưu nháp
│   │   ├── mockApplicationService.js   # Phễu tuyển dụng, chuyển stage, ranking AI
│   │   ├── mockCompanyService.js       # Hồ sơ doanh nghiệp
│   │   ├── mockAdminService.js         # Kiểm duyệt tin, quản lý user, báo cáo vi phạm
│   │   └── mockStatisticsService.js    # Tính toán thẻ chỉ số và biểu đồ
│   ├── api/                            # Triển khai API Adapter gọi Spring Boot Backend
│   │   ├── apiJobService.js            # Gọi /v1/employer/jobs, /v1/categories, /v1/skills
│   │   ├── apiApplicationService.js    # Gọi /v1/jobs/{id}/ranking, /v1/applications/{id}/stage...
│   │   ├── apiCompanyService.js        # Mapper và fallback an toàn cho hồ sơ công ty
│   │   ├── apiAdminService.js          # Gọi Category API và fallback cho Admin
│   │   └── apiStatisticsService.js     # Tổng hợp KPI và biểu đồ từ API thực
│   ├── serviceFactory.js               # Factory tự động inject Mock/API theo VITE_DATA_SOURCE
│   ├── index.js                        # Điểm nạp tập trung duy nhất cho toàn bộ Component
│   ├── mockStore.js                    # Bộ nhớ LocalStorage tương thích ngược (Backward-compatible)
│   └── mockData.js                     # Dữ liệu tĩnh bổ trợ
│
├── components/                         # GIAO DIỆN DÙNG CHUNG
│   ├── common/
│   │   ├── Header.jsx                  # Navbar đa vai trò, Dark/Light Mode, Logout
│   │   ├── Footer.jsx                  # Chân trang MatchaJob
│   │   └── HRContactCard.jsx           # Thẻ liên hệ HR đồng bộ thời gian thực từ Profile
│   ├── charts/                         # 4 Biểu đồ Chart.js (Trend, Funnel, Source, Growth)
│   └── jobs/                           # Thẻ JobCard, Search Bar
│
└── pages/                              # CÁC MÀN HÌNH CHỨC NĂNG (13 MÀN HÌNH CHÍNH)
    ├── public/                         # Home, Jobs, JobDetail, Companies, Guides
    ├── auth/                           # RoleSelect, Login, Register, ForgotPassword
    ├── candidate/                      # Profile (scan CV), SavedJobs, Applications
    ├── employer/                       # CỔNG NHÀ TUYỂN DỤNG (9 Views + 5 Modals)
    │   ├── EmployerPortal.jsx          # Điều phối chính kết nối Service Adapter
    │   ├── components/                 # Modals: JobComposer, CandidateDetail, Interview, Plan
    │   └── views/                      # Overview, Jobs, Candidates, Pipeline, Interviews,
    │                                   # Analytics, Company, Billing, Profile
    └── admin/                          # CỔNG QUẢN TRỊ VIÊN (9 Views + 5 Modals)
        ├── AdminPortal.jsx             # Điều phối chính kết nối Admin Service Adapter
        ├── components/                 # Modals: Category, Moderation, ReportDetail, UserDetail
        └── views/                      # AdminOverview, Moderation, Users, Categories,
                                        # Reports, System, Logs, Notifications, AdminProfile
```

---

## 3. CHỐT 5 VIEW MODEL CỐT LÕI & QUY TẮC MAPPING

Mọi Component trong giao diện **chỉ tương tác với View Model chuẩn hóa**, không phụ thuộc vào định dạng thô của cơ sở dữ liệu:

1. **`CompanyViewModel`**:
   * Chuẩn hóa: `id`, `name`, `shortName`, `logo`, `coverImage`, `industry`, `size`, `location`, `address`, `website`, `email`, `phone`, `taxCode`, `established`, `verified`, `about`, `perks` (mảng string).
   * Tự động tạo 2 chữ cái viết tắt (`MJ`, `FP`) nếu ảnh logo vắng mặt.
2. **`JobViewModel`**:
   * Chuẩn hóa lương: Tự động chuyển đổi `salaryMode` (`range`, `single`, `negotiable`) thành chuỗi thân thiện (ví dụ: `35 – 50 Triệu VNĐ` hoặc `Thỏa thuận`).
   * Chuẩn hóa trạng thái: `active` <-> "Đang tuyển" (Badge xanh), `pending` <-> "Chờ duyệt" (Badge vàng), `paused` <-> "Tạm dừng", `closed` <-> "Đã đóng", `draft` <-> "Bản nháp".
   * Chuẩn hóa hình thức làm việc: `full_time` <-> "Toàn thời gian", `hybrid` <-> "Hybrid", `remote` <-> "Từ xa".
   * Chuẩn hóa cấp bậc: `senior` <-> "Senior", `middle` <-> "Middle", `junior` <-> "Junior"...
3. **`ApplicationViewModel`**:
   * Chuẩn hóa 7 giai đoạn tuyển dụng theo state machine của Backend:
     * `new` <-> "Mới"
     * `screening` <-> "Sàng lọc"
     * `testing` <-> "Bài kiểm tra"
     * `interview` <-> "Phỏng vấn"
     * `offer` <-> "Đề nghị"
     * `hired` <-> "Đã tuyển dụng"
     * `rejected` <-> "Từ chối"
4. **`RankingViewModel`**:
   * Xếp hạng ứng viên AI: `ranking`, `overallScore`, `skillsScore`, `experienceScore`, `rationale`.
   * Phân nhóm mức độ phù hợp: `>=85%` (Rất phù hợp - Xanh lá), `70–84%` (Phù hợp - Xanh dương), `50–69%` (Cân nhắc - Vàng), `<50%` (Ít phù hợp - Xám).
5. **`StatisticsViewModel`**:
   * Chuẩn hóa 4 thẻ chỉ số KPI (`summaryCards`), phễu tuyển dụng 5 giai đoạn (`recruitmentFunnel`), xu hướng 7 ngày (`trend7Days`), và biểu đồ tăng trưởng nền tảng Admin (`growthChart`).

---

## 4. TỔNG HỢP KHOẢNG TRỐNG TÍCH HỢP BACKEND (BACKEND GAPS)

Frontend đã sẵn sàng toàn diện với bộ Mapper và Adapter. Dưới đây là danh sách các API Backend chưa hỗ trợ để nhóm Backend tiếp tục phát triển:

| STT | Phân hệ / Màn hình | Hành động cần API | Endpoint mong muốn | Trạng thái Backend hiện tại | Giải pháp Adapter tạm thời của Frontend |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Employer CandidatesView** | Xem toàn bộ ứng viên của công ty | `GET /v1/employer/applications?companyId={uuid}` | ❌ Chưa có API gom công ty (chỉ có ranking từng job) | Duyệt qua các Job đang chạy để hợp nhất ranking hoặc dùng Mock Fixture. |
| **2** | **Employer Overview & Analytics** | 4 thẻ KPI & Biểu đồ hiệu suất 7 ngày | `GET /v1/employer/statistics/overview`<br>`GET /v1/employer/statistics/charts` | ❌ Chưa có Controller thống kê | Tính toán tổng hợp (aggregate) client-side từ danh sách Job & Application. |
| **3** | **Employer CompanyView** | Xem & Cập nhật thông tin công ty | `GET /v1/companies/{id}`<br>`PUT /v1/companies/{id}` | ❌ Bảng DB đã có, chưa viết `CompanyController` | Lưu trữ tạm qua LocalStorage của Mock Adapter. |
| **4** | **Employer InterviewsView** | Đặt lịch, đổi lịch phỏng vấn | `GET`, `POST`, `PATCH /v1/employer/interviews` | ❌ Bảng DB đã có, chưa viết `InterviewController` | Quản lý qua Mock Fixture. |
| **5** | **Employer BillingView** | Tra cứu gói cước & hạn ngạch tin | `GET /v1/employer/billing` | ❌ Bảng DB đã có, chưa có Controller | Hiển thị gói cước qua Mock Fixture. |
| **6** | **Admin Overview** | Chỉ số người dùng, tin đăng, biểu đồ | `GET /v1/admin/statistics/overview` | ❌ Chưa có Controller | Tổng hợp số liệu qua Mock Adapter. |
| **7** | **Admin ModerationView** | Duyệt / Từ chối tin tuyển dụng | `GET /v1/admin/moderation/jobs`<br>`PATCH /v1/admin/moderation/jobs/{id}/approve` | ❌ Chưa có API riêng cho Admin duyệt tin | Adapter mô phỏng kiểm duyệt tin. |
| **8** | **Admin UsersView** | Quản lý tài khoản, khóa/mở user | `GET /v1/admin/users`<br>`PATCH /v1/admin/users/{id}/status` | ❌ Chưa có Controller | Quản lý tài khoản qua Mock Fixture. |
| **9** | **Admin ReportsView** | Xử lý khiếu nại báo cáo vi phạm | `GET /v1/admin/reports`<br>`PATCH /v1/admin/reports/{id}/resolve` | ❌ Bảng DB đã có, chưa có Controller | Xử lý báo cáo qua Mock Fixture. |
| **10** | **Admin CategoriesView** | Thêm, sửa, xóa danh mục nghề nghiệp | `POST`, `PUT`, `DELETE /v1/categories` | ⚠️ Backend **chỉ mới có duy nhất GET** | GET gọi Backend thật; các thao tác tạo/sửa/xóa fallback sang Mock. |

---

## 5. CÁCH SỬ DỤNG SERVICE ADAPTER TRONG COMPONENT

Khi phát triển thêm hoặc chỉnh sửa bất kỳ Component nào, **luôn import từ `@/services`**:

```javascript
import {
  jobService,
  applicationService,
  companyService,
  adminService,
  statisticsService
} from "@/services";

// 1. Lấy danh sách việc làm (tự động theo mock hoặc API):
const jobs = await jobService.getEmployerJobs(companyId, { status: "active", keyword: "React" });

// 2. Chuyển giai đoạn ứng viên Kanban (Optimistic Update):
await applicationService.updateApplicationStage(candidateId, "interview", "Đã qua bài test");

// 3. Lấy bảng xếp hạng AI ranking:
const ranking = await applicationService.getJobRanking(jobId);

// 4. Lấy thống kê KPI và biểu đồ:
const stats = await statisticsService.getEmployerStatistics(companyId);
```

---

## 6. QUY TẮC PHÁT TRIỂN & QUY ƯỚC MÃ NGUỒN

1. **Tokens & Theme**: Luôn dùng biến CSS `var(--primary)`, `var(--surface)`, `var(--text)`, `var(--border)` từ `tokens.css`. Tuyệt đối không hardcode `#fff` hoặc `#000` để đảm bảo Dark/Light Mode đồng bộ.
2. **Định dạng tiền tệ & Ngày tháng**: Luôn dùng helper `formatSalaryDisplay()` và `formatDate()` từ `jobMapper.js`.
3. **Phản hồi tức thì (Optimistic UI)**: Khi cập nhật trạng thái hoặc kéo thả Kanban, cập nhật State giao diện ngay lập tức trước khi chờ API hoàn tất, và rollback kèm Toast báo lỗi nếu API thất bại.
4. **Kiểm tra trước khi Commit**: Luôn chạy `npm run lint` và `npm run build` để đảm bảo 0 lỗi biên dịch.
5. **Quy chuẩn Bảng & Huy hiệu (Tables & Badges Standard)**: Toàn bộ bảng dữ liệu ở cả hai phân hệ **Nhà tuyển dụng (Employer)** và **Quản trị viên (Admin)** áp dụng chuẩn thiết kế đồng nhất `.matcha-table align-middle mb-0` với tiêu đề cột in hoa 11.5px (`font-weight: 600`), nội dung ô 13px, hệ thống huy hiệu trạng thái `.status-badge` (`status-badge-success`, `status-badge-warning`, `status-badge-danger`, `status-badge-info`, `status-badge-purple`, `status-badge-secondary`) và nút hành động viền mảnh bo tròn (`rounded-pill`). Chuẩn hóa danh xưng quản trị sang tiếng Việt **"Quản trị hệ thống"** / **"Quản trị viên"**, loại bỏ hoàn toàn các từ ngữ "Super Admin" trên giao diện.
