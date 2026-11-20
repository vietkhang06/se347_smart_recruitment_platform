# SE347 - Week 5 - Recruiter/Admin Regression & Dashboard Demo

## 1. Phạm vi & Môi trường Kiểm thử
- **Người thực hiện:** Bảo Khanh (`Zelrious`)
- **Mốc công việc (Tuần 16/11–21/11):**
  1. Regression toàn bộ luồng Recruiter & Admin: công ty, CRUD/lifecycle job, ứng viên, pipeline, ranking AI, phỏng vấn, dashboard, quản trị người dùng & danh mục.
  2. Chuẩn bị dữ liệu mẫu đa trạng thái (`scripts/seed-data.sql`), đảm bảo dashboard/biểu đồ hiển thị số liệu thực từ PostgreSQL.
  3. Kiểm tra phân quyền (RBAC/ownership), trạng thái rỗng/lỗi, responsive (`1366x768`, `768x1024`, `360x800`); sửa lỗi P0/P1 và retest.
  4. Xử lý yêu cầu trong bảng `Lỗi & Ghi Chú`: ẩn vai trò **Quản trị viên hệ thống** khỏi giao diện chọn vai trò / đăng nhập công khai.
  5. Bàn giao checklist, request mẫu, minh chứng chạy thực tế và kịch bản kiểm thử thủ công.
- **Môi trường kiểm thử thực tế (Full-stack Docker Compose — API Mode):**
  - `database`: `pgvector/pgvector:pg16` (Flyway `V1`–`V7`, healthy)
  - `ai-worker`: FastAPI `AI_PROVIDER=deterministic` (healthy)
  - `backend`: Spring Boot 3.3.4 / Java 21 tại `http://localhost:8081/api` (healthy)
  - `frontend`: React + Vite (`VITE_DATA_SOURCE=api`) tại `http://localhost:5173` (healthy)
  - Kết quả `scripts/smoke-demo.ps1`: **PASS 10/10** (`PASS smoke demo`).

---

## 2. Dữ liệu Demo Đa Trạng Thái & Tài khoản Mẫu
Dữ liệu được nạp idempotent bằng lệnh:
```powershell
powershell -File .\scripts\seed-data.ps1
```
**Tổng bản ghi sau seed:** `11` users, `2` companies (`FPT Digital Talent`, `VNG Corporation`), `6` categories, `16` skills, `7` jobs (`3 active`, `1 paused`, `1 closed`, `1 draft`, `1 pending`), `9` applications phủ đủ **7 giai đoạn** (`new`, `screening`, `testing`, `interview`, `offer`, `hired`, `rejected`) + `9` `match_results` (kèm `requiredSkills`, `matchedSkills`, `missingSkills` JSONB cho Top 3 Ranking trên Job 1 & Job 2) + `2` interviews (`scheduled`, `completed`).

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | `admin@matchajob.com` | `Password123!` | Tự điều hướng sang `/admin` sau đăng nhập |
| Employer (FPT Owner) | `employer@fpt.com` | `Password123!` | 6 tin tuyển dụng, 9 hồ sơ ứng viên, 2 lịch phỏng vấn |
| Employer (FPT HR Admin) | `recruiter@fpt.com` | `Password123!` | Thành viên công ty FPT Digital Talent |
| Employer (VNG Owner) | `talent@vng.com.vn` | `Password123!` | Dùng kiểm thử ownership cross-company (`403`) |
| Candidate (Clean) | `ankhang@example.com` | `Password123!` | Tài khoản sạch (0 hồ sơ), dùng test RBAC & khóa/mở khóa |
| Candidate 1–4 | `khanh.candidate@gmail.com`, `thong.candidate@gmail.com`, `hung.candidate@gmail.com`, `mai.candidate@gmail.com` | `Password123!` | Có CV snapshot & điểm AI Matching |

---

## 3. Lỗi P0/P1 Đã Phát Hiện, Sửa và Retest

### 3.1. Backend & Hạ tầng (P0)
| # | Mức độ | File | Mô tả lỗi | Cách sửa & Retest |
|---|---|---|---|---|
| 1 | **P0** | `backend/src/main/java/com/matchajob/matching/service/MatchingService.java` | Còn sót ký tự xung đột Git (`<<<<<<< Updated upstream`, `=======`, `>>>>>>> Stashed changes`) từ PR trước làm `mvn compile` thất bại hoàn toàn. | Dọn sạch conflict markers giữ đúng `evaluateApplicationMatch(UUID)` & overload `(UUID, String)`. Retest: `mvn package` **PASS**. |
| 2 | **P0** | `backend/src/test/java/com/matchajob/api/recruitment/controller/JobControllerTest.java` | Trùng dòng khai báo `package` khiến `testCompile` báo 25 lỗi. | Xóa dòng `package` thừa. Retest: **PASS**. |
| 3 | **P0** | `backend/src/test/java/com/matchajob/matching/service/MatchingSchedulerTest.java` & `HybridMatchingScoreTest.java` | Trùng method test + lời gọi `evaluateApplicationMatch(any())` mơ hồ + truyền sai mock `ProcessingJobService` thay vì `MatchingPersistenceService`. | Xóa method trùng và truyền đúng `mock(MatchingPersistenceService.class)`. Retest: `mvn package` **PASS**. |
| 4 | **P0** | `backend/src/main/resources/db/migration/V7__job_performance_and_stats_indexes.sql` | `CREATE INDEX idx_job_skills_skill_id` không có `IF NOT EXISTS` gây trùng với `V4__job_category_skill_level.sql`, khiến Backend crash khi khởi động từ DB sạch. | Bổ sung `IF NOT EXISTS` cho toàn bộ 6 chỉ mục trong `V7`. Retest: khởi động sạch DB + Flyway `V1`–`V7` **PASS**. |
| 5 | **P1** | `scripts/smoke-demo.ps1` & `scripts/seed-data.ps1` | `Invoke-WebRequest` thiếu `-UseBasicParsing` treo trên Windows PowerShell 5.1; `seed-data.ps1` chưa tự dò container Compose `database` khi tên khác `matchajob-postgres-pgvector`. | Bổ sung `-UseBasicParsing` và auto-detect `docker compose ps -q database`. Retest: cả 2 script **PASS** tức thì. |

### 3.2. Frontend Recruiter / Admin & UI (P0/P1)
| # | Mức độ | File | Mô tả lỗi | Cách sửa & Retest |
|---|---|---|---|---|
| 6 | **P0** | `frontend/src/mappers/jobMapper.js`, `JobComposerModal.jsx`, `apiJobService.js` | Gửi `categoryId`/`skillId` không phải UUID, gửi `salaryCurrency: "Triệu VNĐ"` vượt quá `VARCHAR(3)` DB gây **HTTP 409 Conflict**, đồng thời `apiJobService` rơi về `mockJobService` báo sai lỗi `"Bạn không có quyền quản lý doanh nghiệp này"`. | Chuẩn hóa UUID (`toValidUuid`), chuẩn hóa `salaryCurrency` về ISO 3 ký tự (`VND`/`USD`), tự quy đổi đơn vị `Triệu VNĐ` (`* 1_000_000`), map `salaryMode` về `range`/`single`/`negotiable` khớp `chk_salary_range`, re-throw HTTP `409`. Retest trình duyệt: `POST /v1/employer/jobs` **HTTP 201 Created** + xóa **HTTP 204**. |
| 7 | **P0** | `frontend/src/pages/admin/AdminPortal.jsx`, `apiAdminService.js`, `apiStatisticsService.js`, `UsersView.jsx`, `CategoriesView.jsx`, `AdminProfileView.jsx`, `PlatformGrowthChart.jsx` | Admin Portal ở chế độ API đọc dữ liệu tĩnh `mockStore`, cộng số ảo `+18.200` người dùng / `1.280` tin, không gọi `/v1/admin/users`, `/v1/admin/stats/jobs`, `/api/v1/recruitment/taxonomies/categories`, và crash/rỗng ở trang hồ sơ Admin. | Tích hợp hoàn chỉnh API thật cho Users (phân trang, lọc, khóa/mở khóa), Stats (KPI & biểu đồ cột `Dữ liệu hệ thống`), Categories (tạo/xóa + bắt lỗi 400 danh mục đang dùng), và hồ sơ từ `useAuth()`. Retest live trình duyệt **PASS**. |
| 8 | **P1** | `frontend/src/pages/auth/RoleSelectPage.jsx`, `LoginPage.jsx` | Yêu cầu `Lỗi & Ghi Chú`: vẫn hiển thị thẻ `"Quản trị viên hệ thống"` và nút `"Admin"` ở UI công khai. | Gỡ thẻ & nút Admin công khai (vẫn giữ cơ chế đăng nhập tự điều hướng `/admin` theo role từ `/v1/users/me`). Retest **PASS**. |
| 9 | **P1** | `frontend/src/pages/employer/EmployerPortal.jsx`, `OverviewView.jsx`, `AnalyticsView.jsx`, `RankingView.jsx`, `CandidateDetailModal.jsx` | Overview/Analytics hardcode hoạt động mẫu, điểm `88%` giả, `"18 ngày"`, `"284.000 đ"`; Job Preview hiện `"MatchaJob Enterprise"`; `RankingView` import thẳng `apiApplicationService` và mặc định chọn tin Bản nháp 0 ứng viên; mở CV bằng đường dẫn server nội bộ `/data/cv/...` gây tab 404. | Thay toàn bộ bằng số liệu tính từ dữ liệu thật; gắn tên công ty `FPT Digital Talent` cho Job Preview; chuyển `RankingView` sang `applicationService` và ưu tiên chọn tin `active` có ứng viên; vô hiệu hóa mở URL nội bộ và hỗ trợ tải blob theo `cvVersionId`. Retest **PASS**. |
| 10 | **P1** | `frontend/src/context/ToastContext.jsx`, `JobComposerModal.jsx`, `AdminPortal.jsx`, `UsersView.jsx`, `tokens.css` | Toast `top-0` che thanh navbar góc phải; tab `Xem trước tin đăng` khó đọc chữ; mobile `360px` bị sticky navbar che tiêu đề hash; dropdown `Thao tác` bảng Users bị cắt khi chỉ còn 1 dòng. | Đẩy Toast xuống `top: 72px` (bỏ `top-0`), thêm `text-white` cho nút tab active, thêm `scroll-margin-top: 96px` & `window.scrollTo(0, 0)`, thêm `popperConfig={{ strategy: "fixed" }}` cho menu `Dropdown`. |

---

## 4. Checklist Kết quả Regression

### 4.1. Live API & RBAC Regression (`45/45 PASS`)
| Nhóm | Kiểm thử đã thực hiện | Kết quả |
|---|---|---|
| Auth (`5/5`) | Login `employer@fpt.com`, `talent@vng.com.vn`, `admin@matchajob.com`, `ankhang@example.com`, `GET /v1/users/me` | **PASS** (`200`) |
| Company (`2/2`) | `GET /v1/companies/me`, `PUT /v1/companies/{id}` | **PASS** (`200`) |
| Job CRUD & Lifecycle (`7/7`) | `GET /v1/employer/jobs`, `POST` (UUID + custom skill), `PUT`, `PATCH` (`paused` -> `active` -> `closed`), `DELETE` | **PASS** (`200/201/204`) |
| Applications & Pipeline (`4/4`) | `GET /v1/employer/applications` (9 hồ sơ), `PATCH /v1/applications/{id}/stage` (`new -> screening -> new`), `GET .../history` | **PASS** (`200`) |
| Ranking & AI Matching (`3/3`) | `GET /v1/jobs/{job1}/applications/ranking` (3 ứng viên, top 86%), `job2?minScore=80` (2 ứng viên), `GET /v1/applications/{id}/match` (94%) | **PASS** (`200`) |
| Interviews (`4/4`) | `GET /v1/interviews` (2 lịch), `POST /v1/interviews` (`201`), `PATCH .../status` (`confirmed`), `DELETE` (`cancelled`) | **PASS** (`200/201`) |
| Admin (`10/10`) | `GET /v1/admin/users` (11), lọc `role=employer&status=active` (4), `PATCH .../status` (khóa & mở khóa), chặn tự khóa (`400`), `GET /v1/admin/stats/jobs` (7 tin / 3 active / 1 pending), Taxonomy `GET` (6) / `POST` (`200`) / `DELETE` rỗng (`204`) / `DELETE` đang dùng (`400`) | **PASS** |
| RBAC & Ownership (`10/10`) | Anonymous -> `401`; Candidate -> `/v1/employer/jobs`, `/v1/admin/users` -> `403`; Employer -> `/v1/admin/users`, `/v1/admin/stats/jobs`, `POST` taxonomy -> `403`; VNG -> ranking/job/application của FPT -> `403` | **PASS** |

### 4.2. Live Browser UI & Responsive Regression (`http://localhost:5173`)
| Màn hình / Luồng | Trạng thái | Kết quả quan sát thực tế |
|---|---|---|
| `/role` & `/login` | **PASS** | Chỉ có 2 vai trò (`Ứng viên tìm việc`, `Nhà tuyển dụng (HR)`), không hiện thẻ/nút Admin |
| `/employer#overview` | **PASS** | KPI thực (`3/6` tin, `9` ứng viên, `2` phỏng vấn, `22,2%` chuyển đổi), biểu đồ 7 ngày, Top AI (`94%`, `91%`, `89%`) |
| `/employer#company` | **PASS** | Hiển thị đầy đủ hồ sơ `FPT Digital Talent`, mã số thuế, 5 phúc lợi |
| `/employer#jobs` + Composer | **PASS** | Đủ 4 trạng thái tin; Job Preview hiển thị `FPT Digital Talent`; tạo mới `UI Regression Test Engineer` (`HTTP 201`), tạm dừng/mở lại (`HTTP 200`), xóa bền vững sau reload |
| `/employer#candidates` + Modal | **PASS** | 9 hồ sơ; Modal chi tiết hiện điểm AI `94/100`, `2` kỹ năng khớp, `1` kỹ năng thiếu, 4 mốc lịch sử; nút CV không gây 404 |
| `/employer#ranking` | **PASS** | Top 3 Podium cho Job 1 (`86%`, `79%`, `45%`) & Job 2 (`94%`, `84%`, `76%`); lọc theo giai đoạn & điểm hoạt động chính xác |
| `/employer#pipeline` | **PASS** | Đủ 5 cột giai đoạn; chuyển `Võ Quỳnh Mai` (`Mới` -> `Sàng lọc`) kèm hộp thoại xác nhận và `Hoàn tác` 1-click |
| `/employer#interviews` & `#analytics` | **PASS** | 2 lịch phỏng vấn; Analytics KPI thực (`80,7%` AI TB, `77,8%` qua vòng mới, `4.259` lượt xem, `22,2%` đề nghị/tuyển) + biểu đồ Funnel & Nguồn |
| `/admin#overview` | **PASS** | KPI thực (`11` người dùng, `3` tin hiển thị / `7` tổng, `1` chờ duyệt); biểu đồ cột `Dữ liệu hệ thống` (`CNTT: 6`, `Thiết kế: 1`) |
| `/admin#users` | **PASS** | 11 tài khoản thật; lọc `Nhà tuyển dụng` (4); khóa/reload/mở khóa `Nguyễn An Khang` bền vững trên PostgreSQL |
| `/admin#categories` & `#profile` | **PASS** | 6 danh mục thật; thêm/xóa `Danh mục Test Tuần 5` (`200`/`204`), chặn xóa `Công nghệ thông tin` (`400` + toast lỗi); trang Hồ sơ Admin hiển thị chuẩn |
| Responsive (`1366px`, `768px`, `360px`) | **PASS** | `0px` tràn ngang trang (`html`/`body`/`main`) trên cả 10 tổ hợp viewport của Recruiter (`#overview`, `#pipeline`, `#ranking`) và Admin (`#overview`, `#users`) |

---

## 5. Bộ Request Mẫu (Sample Requests)

```bash
# 1. Đăng nhập lấy JWT (Recruiter)
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employer@fpt.com","password":"Password123!"}'

# 2. Tạo tin tuyển dụng mới (Recruiter) -> 201 Created
curl -X POST http://localhost:8081/api/v1/employer/jobs \
  -H "Authorization: Bearer <EMPLOYER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "44444444-4444-4444-8444-444444444441",
    "categoryId": "55555555-5555-4555-8555-555555555551",
    "title": "Fullstack Engineer (Demo)",
    "department": "Engineering",
    "level": "middle",
    "workType": "hybrid",
    "location": "TP. Hồ Chí Minh",
    "salaryMode": "range",
    "salaryMin": 25000000,
    "salaryMax": 35000000,
    "salaryCurrency": "VND",
    "deadline": "2026-12-31",
    "status": "active",
    "skills": [{"skillId": "66666666-5555-4555-8555-555555555503", "skillName": "React", "isRequired": true}]
  }'

# 3. Chuyển giai đoạn ứng viên (Pipeline) -> 200 OK
curl -X PATCH http://localhost:8081/api/v1/applications/99999999-9999-4999-8999-999999999993/stage \
  -H "Authorization: Bearer <EMPLOYER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"toStage":"screening","reason":"Đạt yêu cầu portfolio"}'

# 4. Lấy bảng xếp hạng AI Ranking theo tin -> 200 OK
curl -X GET "http://localhost:8081/api/v1/jobs/88888888-8888-4888-8888-888888888882/applications/ranking?minScore=80" \
  -H "Authorization: Bearer <EMPLOYER_TOKEN>"

# 5. Admin: Danh sách người dùng & Khóa/Mở khóa tài khoản
curl -X GET "http://localhost:8081/api/v1/admin/users?page=0&size=20&role=employer" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

curl -X PATCH http://localhost:8081/api/v1/admin/users/33333333-3333-4333-8333-333333333335/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended","reason":"Kiểm thử khóa tài khoản"}'

# 6. Admin: Thống kê hệ thống & Taxonomy danh mục
curl -X GET http://localhost:8081/api/v1/admin/stats/jobs \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

curl -X POST http://localhost:8081/api/api/v1/recruitment/taxonomies/categories \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"AI & Data Science","icon":"bi-cpu","status":"visible","sortOrder":7}'

# 7. Kiểm thử phân quyền âm tính (Negative RBAC)
# Employer gọi API Admin -> 403 Forbidden
curl -i -X GET http://localhost:8081/api/v1/admin/users \
  -H "Authorization: Bearer <EMPLOYER_TOKEN>"
# VNG truy cập Ranking của FPT -> 403 Forbidden
curl -i -X GET http://localhost:8081/api/v1/jobs/88888888-8888-4888-8888-888888888881/applications/ranking \
  -H "Authorization: Bearer <VNG_TOKEN>"
```

---

## 6. Kết quả Kiểm thử Tự động & Build
- `npm run lint` (`oxlint`): **0 errors**, 84 warnings.
- `npm test -- --run` (chế độ `VITE_DATA_SOURCE=api`): **20/20 files, 142/142 tests PASS** (gồm 11 test mới trong `frontend/src/tests/recruiter-admin-week5.test.jsx`).
- `VITE_DATA_SOURCE=mock npm test -- --run`: **20/20 files, 142/142 tests PASS**.
- `npm run build` (`vite build`): **PASS**.
- `git diff --check`: **PASS**.
- `scripts/smoke-demo.ps1`: **PASS**.

## 7. Giới hạn & Ghi chú Cần Nhóm Review
1. **Các tab Admin chưa có Backend REST API trên `main`:** `Moderation` (kiểm duyệt tin/đánh giá), `Reports` (báo cáo vi phạm), `Logs` (đọc audit log), `System Settings`, và tạo/xóa user từ Admin hiện chưa có endpoint đọc/ghi tương ứng trên Backend; giao diện đã giữ fallback an toàn và khóa các nút chỉ dành cho Mock khi chạy chế độ `api`.
2. **Đường dẫn Taxonomy trên Backend:** `TaxonomyController` hiện dùng `@RequestMapping("/api/v1/recruitment/taxonomies")` dưới `context-path: /api`, nên URL thực tế là `/api/api/v1/recruitment/taxonomies/...`. Frontend đã xử lý tương thích, nên thống nhất tiền tố `/v1/...` ở đợt refactor sau.
3. **Tải CV ứng viên phía Recruiter:** `EmployerApplicationItemResponse` hiện trả về đường dẫn lưu cục bộ `/data/cv/...` và chưa trả kèm `cvVersionId`. `CandidateDetailModal` đã chặn mở đường dẫn nội bộ gây lỗi 404 và sẵn sàng tải PDF có xác thực Bearer khi Backend bổ sung `cvVersionId`.
