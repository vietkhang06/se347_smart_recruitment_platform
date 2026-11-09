# API Convention & Integration Contract — MatchaJob (SE347, Nhóm 7)
 
- **Phiên bản tài liệu:** Draft 0.1
- **Ngày lập:** 2026-10-12
- **Người tổng hợp:** Việt Khang — MVP Scope + API Convention + Integration Contract
- **Trạng thái:** **CHỜ REVIEW — CHƯA FREEZE**
- **Nguồn đối chiếu:** `docs/API_INVENTORY.md`, `docs/MVP_SCOPE.md`, các controller/DTO/service hiện có, `ai-worker/app` và `database/design/schema.sql`.

> Tài liệu này phân biệt ba trạng thái: **Hiện có trong source** (đã tìm thấy route/code nhưng chưa đồng nghĩa đã smoke-test), **Contract mục tiêu đề xuất** (đề xuất để nhóm review trước khi triển khai), và **Cần sửa** (implementation hiện tại lệch convention mục tiêu). Ví dụ request/response chỉ là fixture minh họa cho contract, không phải dữ liệu seed của dự án.

## 1. Mục tiêu và nguyên tắc

Tài liệu thống nhất cách Frontend, Backend và AI Worker trao đổi dữ liệu để cùng triển khai ba luồng MVP: ứng viên tìm việc/ứng tuyển; nhà tuyển dụng quản lý tin và ứng viên; CV/JD matching và xếp hạng.

1. Một endpoint chỉ có **một contract chuẩn** về method, path, auth, request, response và lỗi.
2. DTO công khai là hợp đồng; không trả trực tiếp JPA entity/model lưu trữ.
3. Identity dùng cho thao tác có quyền phải suy ra từ JWT/principal ở Backend. Không tin `candidateId`, `companyId`, `createdBy` do trình duyệt tự gửi mà không kiểm tra quyền sở hữu. Theo SQL, `users.id`, `candidate_profiles.id` và `companies.id` là các ID khác nhau: Backend phải map `JWT sub` (user ID) sang Candidate Profile/Company mà user được phép quản lý, không mặc định các ID này bằng nhau.
4. Frontend gọi Backend; Backend gọi AI Worker. Trình duyệt không gọi AI Worker để thực hiện chức năng nghiệp vụ và không được nhận AI provider API key.
5. Không coi endpoint đề xuất là đã implement hoặc đã chạy thành công. Trước khi freeze phải review theo owner và chạy smoke test.

## 2. Các quyết định nền tảng đề xuất

| ID | Quyết định đề xuất | Lý do/bằng chứng | Trạng thái |
|---|---|---|---|
| C-01 | Giữ `server.servlet.context-path=/api` và `VITE_API_BASE_URL=http://localhost:8081/api`; mọi controller Backend khai báo mapping bắt đầu bằng `/v1/...` | Context path đang là `/api`; env/Compose đặt base URL là `http://localhost:8081/api`. Bốn controller Recruitment hiện khai báo `/api/v1/...`, làm URL suy ra lặp `/api`. | **Cần owner Job xác nhận và sửa** |
| C-02 | Version API công khai bằng `/v1` | Có trong các controller CV/Processing/Matching và URL cấu hình hiện tại. | Đề xuất thống nhất |
| C-03 | JSON công khai Frontend ↔ Backend dùng `camelCase`; Backend ↔ AI Worker giữ schema `snake_case` hiện có | DTO Job đã dùng `camelCase`; CV upload hiện trả `snake_case`; Pydantic AI schema dùng `snake_case`. | **Cần chuẩn hóa CV response** |
| C-04 | Public response dùng DTO/schema API riêng; không trả entity `CvVersion`, `ProcessingJob` hoặc `MatchResult` trực tiếp | Controller hiện trả trực tiếp các entity này, có field nội bộ như `filePath`, `leaseToken`, `lastError`, và `breakdown` đang là chuỗi JSON. | Cần sửa theo contract |
| C-05 | Dùng Problem Details cho lỗi Backend/Frontend-facing; không lộ stack trace, đường dẫn lưu file, lease token, API key hoặc lỗi upstream thô | Backend hiện đặt `server.error.include-message: always` và generic handler dùng `ex.getMessage()`; cần siết lại trước tích hợp. | Cần sửa |
| C-06 | Upload CV và trích xuất CV là luồng bất đồng bộ ở Backend: `202 Accepted` + `processingJobId`; theo dõi qua processing endpoint | Upload hiện tạo `ProcessingJob` và trả `202`; trạng thái job gồm `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` trong service. | Phù hợp source, cần DTO công khai |
| C-07 | Matching hiện được thực hiện đồng bộ trong `MatchingService`; không trả `202` trừ khi đã đưa công việc vào queue và có resource trạng thái thực sự | POST trả 200 sau khi gọi Worker và lưu kết quả; xem mục 6.5. | Đã triển khai đồng bộ |
| C-08 | Auth/JWT là yêu cầu của contract mục tiêu nhưng hiện chưa tìm thấy Auth Controller/Spring Security trong source đã rà | API cần xác thực cho Candidate/Employer nhưng chưa được triển khai trong source được kiểm kê. | Chưa triển khai |

## 3. URL, service và môi trường

### 3.1. Địa chỉ chuẩn

| Gọi từ | Base URL | Ghi chú |
|---|---|---|
| Browser/Frontend → Backend khi chạy local Compose | `http://localhost:8081/api` | Được nêu trong `.env.example`/Compose; hiện chưa tìm thấy `VITE_API_BASE_URL` được sử dụng trong `frontend/src`. |
| Backend API version | `/v1` dưới context path `/api` | URL công khai dự kiến: `http://localhost:8081/api/v1/...`. |
| Backend container → AI Worker | `http://ai-worker:8000` | Địa chỉ service nội bộ Compose, không dùng từ browser. |
| Host → AI Worker để debug | `http://localhost:8001` | Host port mapping trong Compose; chỉ dùng để kiểm tra local. |
| Backend container → PostgreSQL | `jdbc:postgresql://database:5432/matchajob_db` | Từ network Compose dùng service name `database`, không dùng host port `5433`. |

### 3.2. Base-path correction bắt buộc trước khi FE tích hợp

Các controller `JobController`, `EmployerJobController`, `CategoryController`, `SkillController` hiện khai báo `/api/v1/...`. Vì Spring Boot đã thêm context path `/api`, URL suy ra thành `/api/api/v1/...`.

**Contract chuẩn sau khi được duyệt:** mapping trong các controller này đổi thành `/v1/jobs`, `/v1/employer/jobs`, `/v1/categories`, `/v1/skills`; URL bên ngoài giữ dạng `/api/v1/...`. Không đồng thời đổi cả context path và controller mapping.

### 3.3. CORS và client

- Frontend nên có một API client dùng chung, lấy base URL từ `import.meta.env.VITE_API_BASE_URL`; việc này chưa được xác nhận trong source Frontend hiện tại.
- Backend cần chỉ cho phép origin Frontend đã cấu hình (local hiện dùng `http://localhost:5173`) thay vì wildcard trong môi trường có credential. Cấu hình CORS chưa được xác minh trong source audit.
- Không để các component tự ghép base path hoặc tự định nghĩa error handling riêng từng màn hình.

## 4. Quy ước HTTP và dữ liệu

### 4.1. Header

| Tình huống | Header/format |
|---|---|
| JSON request | `Content-Type: application/json` |
| JSON response | `Content-Type: application/json` |
| Lỗi theo Problem Details | `Content-Type: application/problem+json` |
| Upload CV | `Content-Type: multipart/form-data; boundary=...` do HTTP client tự tạo |
| API có xác thực | `Authorization: Bearer <accessToken>` |
| Charset | UTF-8 |

Frontend không tự set `Content-Type: multipart/form-data` thủ công nếu browser/client cần tự thêm `boundary`.

### 4.2. Naming, ID và thời gian

- Path/query/body public dùng `camelCase`: `jobId`, `cvVersionId`, `appliedAt`.
- ID dùng UUID dạng chuỗi chuẩn; Backend cần trả lỗi input khi UUID sai định dạng.
- Date không có giờ dùng `YYYY-MM-DD` (ví dụ `deadline`).
- Timestamp dùng ISO 8601 có timezone/UTC, ví dụ `2026-10-12T02:30:00Z`. Không trả timestamp local thiếu timezone.
- Boolean dùng `true`/`false`; số điểm matching là số nguyên trong khoảng `0–100` theo AI schema hiện có.
- Tiền lương hiện lưu số theo VND trong database; response giữ số, FE chịu trách nhiệm định dạng hiển thị. `salaryCurrency` mặc định hiện là `VND` trong service.
- Trường nullable có thể là `null`; contract phải phân biệt `null`, vắng mặt và chuỗi rỗng. Không dùng chuỗi rỗng làm ID hay trạng thái.

### 4.3. Phân biệt User ID, Candidate ID và Company ID

Database schema xác định `candidate_profiles.user_id` tham chiếu `users.id`, còn `applications.candidate_id` và quan hệ CV dùng Candidate Profile ID. Vì thế:

- `user.id`/JWT subject là ID trong bảng `users`.
- `candidateId` trong Application/CV là ID của `candidate_profiles`, không được mặc định bằng `user.id`. Backend cần lookup profile theo user đã xác thực.
- `companyId` là ID trong bảng `companies`; Employer chỉ được thao tác trong Company có owner/membership hợp lệ.
- `createdBy` là user ID và nên do Backend thiết lập từ principal, không lấy làm nguồn tin cậy từ request body.

### 4.4. Enums có căn cứ trong source/schema

| Field | Tập giá trị tìm thấy | Ghi chú |
|---|---|---|
| `role` (DB) | `candidate`, `employer`, `admin` | Đăng ký công khai **không được tự cho phép** client tạo `admin`; Auth owner phải chốt quy tắc đăng ký Employer. |
| `job.status` | `draft`, `pending`, `active`, `paused`, `closed` | Có trong Java enum và schema. Public search mặc định lọc `active`. |
| `job.level` | `intern`, `fresher`, `junior`, `middle`, `senior`, `lead`, `director` | Có trong Java enum/schema. |
| `job.workType` | `full_time`, `part_time`, `hybrid`, `remote`, `contract` | Có trong Java enum/schema. |
| `job.salaryMode` | `range`, `single`, `negotiable` | SQL có ràng buộc salary theo mode. |
| `application.stage` | `new`, `screening`, `testing`, `interview`, `offer`, `rejected` | Có trong `database/design/schema.sql`; cần thống nhất transition được phép. |
| `processingJob.status` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` | Các giá trị này xuất hiện trong `ProcessingJobService`; retryable failure có thể quay lại `PENDING`. |
| `cv.status` | `uploaded`, `extracted` | Có trong CV controller/orchestrator; trạng thái lỗi hiện được thể hiện ở processing job, cần chốt cách hiển thị tổng hợp. |

**Không mở rộng enums tùy ý ở Frontend.** Khi thêm giá trị, owner cập nhật contract, Backend validation và FE labels trong cùng PR/nhóm thay đổi.

### 4.5. Pagination, filter và sorting

- `page` bắt đầu từ `0`.
- `size` mặc định `10`; source Job service giới hạn tối đa `50`. Khi `size <= 0`, hiện service quay về `10`.
- Response dùng cấu trúc đang có `PageResponse<T>`: `content`, `page`, `size`, `totalElements`, `totalPages`, `last`.
- Query Job đã tìm thấy trong controller: `keyword`, `categoryId`, `level`, `workType`, `location`, `salaryMin`, `salaryMax`, `skillIds`, `sortBy`, `page`, `size`.
- Các giá trị sort nhận diện trực tiếp trong code: `salary_desc`, `title_asc`, `new`, `postedAt_desc`; nếu `sortBy` khác, implementation hiện rơi về `createdAt DESC`. Đây là hành vi cần chốt: **khuyến nghị từ chối giá trị không hợp lệ bằng `400` hoặc tài liệu hóa đầy đủ**, không để FE tự đoán.
- Với employer job list có query `companyId`, `status`, `page`, `size`; khi Auth được triển khai, `companyId` phải được kiểm tra quyền theo principal.

Ví dụ:

```http
GET /api/v1/jobs?keyword=Java&location=Ho%20Chi%20Minh&page=0&size=10&sortBy=postedAt_desc
```

### 4.6. Status code

| Status | Ý nghĩa contract | Dùng điển hình |
|---|---|---|
| `200 OK` | Đọc/cập nhật thành công hoặc trả kết quả tính đồng bộ | GET, PUT/PATCH, matching đồng bộ |
| `201 Created` | Tạo resource mới đã hoàn tất | Tạo Job, Application, user nếu đăng ký thành công theo quyết định Auth |
| `202 Accepted` | Đã tiếp nhận nhưng xử lý chưa hoàn tất; body nên có resource/status ID để poll | Upload CV và tạo processing job; matching chỉ dùng nếu thực sự queue hóa |
| `204 No Content` | Thành công không có body | Xóa mềm Job theo implementation hiện tại |
| `400 Bad Request` | Request sai cú pháp/field hoặc business validation không hợp lệ | UUID/query/body/file rỗng |
| `401 Unauthorized` | Thiếu/sai/hết hạn token | API được bảo vệ |
| `403 Forbidden` | Có danh tính nhưng không có quyền thao tác resource | Candidate xem CV người khác, Employer sửa Job không thuộc Company |
| `404 Not Found` | Resource không tồn tại hoặc không được phép tiết lộ | Job/CV/Application không tìm thấy |
| `409 Conflict` | Trùng hoặc xung đột nghiệp vụ/trạng thái | Ứng tuyển trùng, chuyển stage không hợp lệ, email đã đăng ký |
| `413 Content Too Large` | File vượt giới hạn | CV trên giới hạn 10 MiB trong code hiện tại |
| `415 Unsupported Media Type` | Định dạng file không hỗ trợ | Chỉ PDF/DOCX cho CV upload hiện có |
| `422 Unprocessable Entity` | Validation schema phía AI Worker/FastAPI nếu giữ mặc định hiện tại | Body thiếu/sai kiểu; cần chuẩn hóa lỗi FastAPI trước khi Frontend phụ thuộc format này |
| `500 Internal Server Error` | Lỗi ngoài dự kiến | Không trả stack trace hoặc thông tin nội bộ |
| `502 Bad Gateway` / `503 Service Unavailable` | Backend không nhận được phản hồi hợp lệ từ AI Worker/worker chưa sẵn sàng | Cần map exception upstream rõ ràng; không trả raw exception |
| `504 Gateway Timeout` | AI Worker vượt timeout của Backend | Timeout processing hiện cấu hình 60 giây; phải ánh xạ lỗi nhất quán |

Ghi chú: hiện `GlobalExceptionHandler` chủ yếu có handler generic `Exception`, nên một số exception như `NoSuchElementException` có thể không ra status 404 như mong đợi. Status trong bảng là **contract mục tiêu**; cần exception mapping và test để bảo đảm implementation khớp.

### 4.7. Error response — Problem Details

Contract lỗi public đề xuất:

```json
{
  "type": "https://matchajob.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more request fields are invalid.",
  "instance": "/api/v1/applications",
  "timestamp": "2026-10-12T02:30:00Z",
  "errors": [
    {
      "field": "jobId",
      "code": "invalid_uuid",
      "message": "jobId must be a valid UUID."
    }
  ]
}
```

`timestamp` và `errors` là extension đề xuất, cần implement thống nhất; chúng chưa được bảo đảm ở mọi handler hiện có. Không trả password/hash/token nội bộ, SQL, stack trace, full filesystem path hoặc exception upstream nguyên văn. Với đăng nhập thất bại, dùng thông báo chung để không tiết lộ email có tồn tại hay không.

## 5. Bảo mật và quyền truy cập mục tiêu

**Lưu ý quan trọng:** bảng dưới đây là contract cần implement sau khi Auth/JWT được bổ sung. API Inventory chưa tìm thấy Spring Security/Auth Controller nên không được hiểu rằng quyền đã hoạt động.

| Nhóm endpoint | Quyền mục tiêu | Kiểm tra tối thiểu |
|---|---|---|
| `GET /v1/jobs`, `GET /v1/jobs/{id}`, categories, skills | Public read | Chỉ trả Job public theo status/visibility đã duyệt; không để truy cập Job đã xóa/không public qua API chi tiết. |
| `/v1/auth/register`, `/v1/auth/login` | Public | Validate input; không echo password; không cho public signup role `admin`. |
| `/v1/users/me` | Authenticated | Trả profile của principal hiện tại và danh sách companies; không nhận user ID tùy ý để đọc người khác. |
| `/v1/employer/**` | Role Employer và quyền sở hữu/membership Company | Lấy user từ JWT; đối chiếu company membership trước CRUD Job/xem ứng viên. |
| `/v1/candidates/{candidateId}/cv/**` | Candidate Profile của chính mình; Employer chỉ theo quan hệ Application/Job được phép | Map principal sang Candidate Profile rồi so sánh với candidate trên path, hoặc chuyển route sang `/me`; không truy vấn CV chỉ bằng `cvVersionId` rồi trả entity. |
| `/v1/applications/me` | Candidate của chính mình | Candidate Profile ID được suy ra qua principal; không nhận candidate ID tùy ý. |
| `/v1/employer/jobs/{jobId}/applications`, `/ranking` | Employer có quyền quản lý Job/Company | Không trả ứng viên thuộc Job/Company khác. |
| `/v1/processing-jobs/{id}` | Người sở hữu luồng xử lý hoặc internal service được ủy quyền | Không để lộ lease token, `lastError` nội bộ hoặc thông tin của candidate khác. |
| `/v1/applications/{applicationId}/match` | Quyền phụ thuộc luồng đã duyệt; Employer sở hữu Job hoặc internal trigger | Backend tự lấy Application, Job/JD và CV snapshot có liên quan; không tin `jobTitle`, requirements hay ID tùy ý do caller cung cấp. |
| AI Worker endpoints | Nội bộ giữa Backend và Worker trong MVP | Không cho browser dùng để lấy scoring/extraction của tùy ý; không chuyển AI API key qua public response. |

## 6. Contract matrix — Backend API

Trong bảng này, **Hiện có** có nghĩa route đã tìm thấy trong source; **Đề xuất** là API cần bổ sung để hoàn tất luồng MVP. Tất cả path trong cột “Path chuẩn” tính sau context path `/api`.

### 6.1. Auth & Current User [CONFIRMED per Auth Contract v2]

Các route Auth và Current User đã được triển khai hoàn chỉnh trong source code (`com.matchajob.auth` và `com.matchajob.user`), tuân thủ đặc tả chính thức tại [`Auth_API_Contract_v2.md`](Auth_API_Contract_v2.md).

| Method + path chuẩn | Auth | Request | Success | Controller / Owner | Ghi chú & Ràng buộc |
|---|---|---|---|---|---|
| `POST /api/v1/auth/register` | Public | `email`, `password`, `role` (`CANDIDATE` hoặc `EMPLOYER`) | `201` + `RegisterResponse` | `AuthController.java`<br>(Phúc Khang) | Mật khẩu hash BCrypt; chuẩn hóa email; tự động tạo `CandidateProfile` trống cho Candidate. Tuyệt đối không cho phép đăng ký role `ADMIN`. |
| `POST /api/v1/auth/login` | Public | `email`, `password` | `200` + `LoginResponse` (`access_token`, `token_type`, `expires_in`, `user`) | `AuthController.java`<br>(Phúc Khang) | Chặn tài khoản `suspended` (403) và chưa kích hoạt nếu bật verification; cập nhật `last_login_at`. Token TTL: 3600s (1 giờ). |
| `GET /api/v1/users/me` | Bearer (Authenticated) | Không có body | `200` + `UserProfileResponse` | `UserController.java`<br>(Phúc Khang) | Lấy danh tính trực tiếp từ authenticated principal trong SecurityContext. Trả về profile và mảng `companies: []` (Candidate trả `[]`, Employer trả danh sách công ty quản lý). |

> **Quy ước mô hình Role:**
> Hệ thống MatchaJob quản lý Role trực tiếp thông qua cột `users.role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'employer', 'admin'))` trên bảng `users` ([`V2__baseline_schema.sql: L33`](../backend/src/main/resources/db/migration/V2__baseline_schema.sql#L33)), không tạo bảng `roles` riêng.
> Access Token JWT chỉ chứa các standard claims (`sub`, `iat`, `exp`). Quyền hạn và trạng thái người dùng (`role`, `status`, `deleted_at`) luôn được nạp trực tiếp từ cơ sở dữ liệu trên mỗi request qua [`JwtAuthenticationFilter`](../backend/src/main/java/com/matchajob/security/JwtAuthenticationFilter.java), bảo đảm role không bị giả mạo và được cập nhật tức thì.

### 6.2. Job, Category, Skill

| Method + path chuẩn | Trạng thái source | Request | Response/status contract | Việc cần xử lý |
|---|---|---|---|---|
| `GET /api/v1/jobs` | Có trong source; path controller hiện sai prefix | Query đã nêu tại mục 4.4 | `200 PageResponse<JobSummaryResponse>` | Sửa mapping; chốt `sortBy`, filter enum và quy tắc Job public. |
| `GET /api/v1/jobs/{id}` | Có trong source; path controller hiện sai prefix | `id` UUID | `200 JobDetailResponse`; `404` khi không có/không public | Sửa mapping và exception mapping 404. |
| `GET /api/v1/categories` | Có trong source; path controller hiện sai prefix | Không | `200 CategoryResponse[]` | Sửa mapping; thống nhất xử lý category inactive. |
| `GET /api/v1/skills` | Có trong source; path controller hiện sai prefix | `categoryId?`, `q?` | `200 SkillResponse[]` | Sửa mapping; chốt ý nghĩa tìm kiếm `q` và sort/limit. |
| `GET /api/v1/employer/jobs` | Có trong source; path controller hiện sai prefix | `companyId` bắt buộc hiện tại; `status?`, `page=0`, `size=10` | `200 PageResponse<JobSummaryResponse>` | Thêm auth/ownership; cân nhắc derive company từ principal thay vì tin query ID. |
| `POST /api/v1/employer/jobs` | Có trong source; path controller hiện sai prefix | `JobCreateRequest` | `201 JobDetailResponse` | Thêm auth/validation; `companyId`/`createdBy` nên lấy/kiểm tra từ principal. |
| `PUT /api/v1/employer/jobs/{id}` | Có trong source; path controller hiện sai prefix | `JobUpdateRequest` | `200 JobDetailResponse` | Thêm auth/ownership; chốt PUT partial/replace semantics vì implementation chỉ cập nhật field non-null. Cân nhắc PATCH nếu giữ semantics đó. |
| `PATCH /api/v1/employer/jobs/{id}/status` | Có trong source; path controller hiện sai prefix | `{ "status": "active" }` | `200 JobDetailResponse` | Auth/ownership; validate enum và state transition. Các status hiện có: `draft`, `pending`, `active`, `paused`, `closed`. |
| `DELETE /api/v1/employer/jobs/{id}` | Có trong source; path controller hiện sai prefix | Path `id` | `204` | Code hiện soft-delete qua `deletedAt`; thêm auth/ownership và chốt hành vi khi Job có Application. |

`JobSummaryResponse` hiện có các field: `id`, `companyId`, `category`, `title`, `slug`, `department`, `level`, `workType`, `location`, `salaryMode`, `salaryMin`, `salaryMax`, `salaryCurrency`, `experience`, `applicantCount`, `viewCount`, `status`, `postedAt`, `deadline`, `skills`. `JobDetailResponse` bổ sung `createdBy`, `address`, `mapLink`, `description`, `requirements`, `benefits`, `schedule`, các trường `summary*`, timestamps và skills chi tiết. Đây là schema có thể xác nhận từ DTO hiện tại.

### 6.3. CV upload và processing

| Method + path chuẩn | Trạng thái source | Request | Contract response mục tiêu | Việc cần xử lý |
|---|---|---|---|---|
| `POST /api/v1/candidates/{candidateId}/cv` | Có trong source | `multipart/form-data` field `file`; query `sync=false` hiện có | `202` `{cvVersionId, candidateId, fileName, fileSizeBytes, status, processingJobId, message}` | Chuẩn hóa snake_case → camelCase; xác thực ownership; không trả file path. Cân nhắc bỏ `sync` khỏi public contract vì chế độ sync là chi tiết thực thi. |
| `GET /api/v1/candidates/{candidateId}/cv` | Có trong source | Path `candidateId` | `200 CvVersionSummary[]` (DTO đề xuất) | Không trả entity; auth/ownership; không expose `filePath`, raw text đầy đủ hoặc metadata nhạy cảm không cần thiết. |
| `GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}` | Có trong source | Path `candidateId`, `cvVersionId` | `200 CvVersionDetail` (DTO đề xuất); `404` nếu không tìm thấy hoặc không thuộc candidate | Code hiện lookup chỉ theo `cvVersionId`, không xác minh CV thuộc path candidate. Cần sửa. |
| `GET /api/v1/processing-jobs/{id}` | Có trong source | Path `id` | `200 ProcessingJobStatus` (DTO đề xuất); `404` nếu không có | Không trả entity vì có `leaseToken`, `leaseExpiresAt`, `lastError`, `idempotencyKey`; auth/ownership. |
| `GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}/file` | Chưa tìm thấy | Path IDs | Download có xác thực hoặc signed URL theo quyết định storage | MVP chỉ cần nếu recruiter phải tải CV bản gốc; chốt authorization/retention trước khi thêm. |

**Giới hạn file xác nhận từ source hiện tại:** PDF/DOCX, tối đa 10 MiB (10 × 1024 × 1024 bytes) trong Backend storage và AI extractor. AI Worker còn giới hạn PDF tối đa 20 trang, text đầu ra tối đa 500.000 ký tự. Backend storage kiểm tra magic bytes theo extension PDF/DOCX.

**Gap chặn tích hợp:** Khi `sync=false` (mặc định), `CvController` lưu file và tạo `ProcessingJob`, nhưng tìm kiếm tĩnh chưa thấy scheduler/queue consumer gọi `claimNextJob()`/`processSingleJob()` để chạy job nền. `processSingleJob()` hiện chỉ được gọi trực tiếp khi `sync=true`. Vì vậy, không được kết luận pipeline async hiện chạy hoàn chỉnh; cần implement worker/poller hoặc chốt cách xử lý khác và kiểm chứng bằng smoke test trước khi demo.

Processing statuses hiện có: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`. Không public `leaseToken`. Chi tiết nội bộ như `lastError` không nên trả trực tiếp; nếu UI cần thông báo lỗi, map sang `errorCode`/`userMessage` an toàn.

### 6.4. Application

Không tìm thấy Application workflow controller trong source audit, mặc dù entity `Application`, bảng SQL `applications` và `application_cv_snapshots` tồn tại. Routes bên dưới là contract đề xuất để đáp ứng MVP và phải được Đại Hưng + Frontend recruiter/candidate review.

| Method + path đề xuất | Auth | Request | Response/status đề xuất | Business rule cần chốt |
|---|---|---|---|---|
| `POST /api/v1/applications` | Candidate | `{jobId, cvVersionId, coverLetter?}` | `201 ApplicationResponse` | Map JWT user ID → `candidate_profiles.id`; Job đang nhận hồ sơ; CV thuộc Candidate Profile đó; tạo `Application` và snapshot liên kết CV version; trùng candidate+job → `409`. SQL hiện có unique constraint `(candidate_id, job_id)`. |
| `GET /api/v1/applications/me` | Candidate | `page?`, `size?`, `stage?` | `200 PageResponse<ApplicationSummary>` | Chỉ đơn của candidate hiện tại. |
| `GET /api/v1/employer/jobs/{jobId}/applications` | Employer có quyền với Job | `page?`, `size?`, `stage?` | `200 PageResponse<EmployerApplicationSummary>` | Chỉ ứng viên của Job/Company đó; chỉ trả field CV/profile cần thiết cho review. |
| `PATCH /api/v1/employer/applications/{applicationId}/stage` | Employer có quyền với Job | `{stage, rejectReason?}` | `200 ApplicationResponse` | Chỉ stage đã được định nghĩa; từ chối transition không hợp lệ; `rejectReason` áp dụng theo quy tắc nhóm chốt. |
| `GET /api/v1/employer/jobs/{jobId}/ranking` | Employer có quyền với Job | `page?`, `size?` | `200 PageResponse<RankedApplication>` | Chỉ xếp hạng application của Job; xác nhận tie-break, thời điểm ranking và dữ liệu nào recruiter được thấy. |

Các trường cơ sở có căn cứ từ entity/SQL: `id`, `candidateId`, `jobId`, `coverLetter`, `stage`, `rejectReason`, `matchScore`, `appliedAt`, `updatedAt`. `application_cv_snapshots` liên kết `applicationId` với `cvVersionId`. Contract response được phép expose `cvVersionId` từ quan hệ snapshot sau khi triển khai; hiện chưa có controller/workflow làm việc đó.

### 6.5. Matching — updated 27/10/2026

Canonical implementation and retry/error tables: `MATCHING_RESULT_API_AND_CV_JD_UI.md`. JSON Schema: `contracts/schemas/matching-result.schema.json`.

- GET `/api/v1/applications/{applicationId}/match`: 200 result or NOT_STARTED/PENDING/PROCESSING/FAILED state; pending scores null.
- POST same URL: synchronous 200 result, server-resolved Job and immutable CV snapshot; repeated POST returns saved result.
- Public fields camelCase; Worker fields snake_case. Queued means PENDING in the canonical enum.
- Response includes retryable, retryAfter, attemptCount and maxAttempts. MatchingPersistenceService manages short transactional claims/completion/failure; no async matching consumer is introduced.
- 409 codes distinguish CV not ready, in progress, backoff, terminal/exhausted retry and state/lease conflict. Worker unavailable/schema errors return safe 502 Problem Details.
- Candidate owner or employer managing the Job can access; other identities receive 403. Missing application 404; no JWT 401.
- Frontend never replaces matching/list errors with demo scores/candidates. Fixtures remain test-only.
- Worker baseline algorithm is unchanged; external LLM/provider integration and scoring-quality approval are not claimed by these API tests.

## 7. Contract AI Worker (Backend → FastAPI)

AI Worker là service nội bộ; public app không được dùng trực tiếp các endpoint này để thay thế Backend business API. Request/response hiện dùng `snake_case` theo Pydantic schema.

| Method + path | Request | Response | Giới hạn/lưu ý từ source |
|---|---|---|---|
| `GET /health` | Không | `{status, service, version, environment, uptime_seconds}` | Trả `status="healthy"` từ handler; readiness riêng biệt. |
| `GET /health/live` | Không | `{status: "alive"}` | Liveness probe. |
| `GET /health/ready` | Không | `{status: "ready"}` hoặc `503 {status: "unready"}` | Dựa vào `app.state.is_ready`. |
| `GET /health/startup` | Không | `{status: "initialized"}` hoặc `503 {status: "initializing"}` | Dựa vào `app.state.is_started`. |
| `POST /api/v1/cv/extract` | Multipart field `file` | `{raw_text, parsed_data, char_count, page_count}` | PDF/DOCX, tối đa 10 MiB; PDF tối đa 20 trang; body invalid hiện có thể là `400` hoặc `413`; validation FastAPI cần chuẩn hóa. |
| `POST /api/v1/embeddings` | `{texts: string[]}` | `{embeddings: number[][], dimension: 1536, model: string}` | Số phần tử `texts` từ 1 đến 100; code response hiện gán `model="text-embedding-3-small"`, cần xác nhận đúng provider/model thực dùng. |
| `POST /api/v1/match/score` | `{job_id?, job_title, job_description?, job_requirements?, cv_text, candidate_skills?}` | `{overall_score: 0..100, skills_score?, experience_score?, breakdown, rationale?}` | `cv_text` không được rỗng; AI schema dùng snake_case. |

### 7.1. AI Worker error format

Worker có handler Problem Detail cho `HTTPException` và lỗi ngoài dự kiến. Tuy nhiên, request validation FastAPI mặc định có thể trả cấu trúc khác nếu chưa cài handler riêng cho `RequestValidationError`. Trước khi Backend/Frontend phụ thuộc vào error body, chuẩn hóa cả lỗi validation thành `application/problem+json` hoặc document chính thức exception cho endpoint nội bộ.

### 7.2. Timeout, retry và idempotency

Cấu hình `AiWorkerConfig` trong Backend hiện đặt connect timeout `3000 ms`, read timeout thông thường `5000 ms`, processing timeout `60000 ms`. Cần xác nhận timeout 5 giây không áp dụng nhầm cho tác vụ extraction/embedding/scoring.

- Với các GET read-only, có thể retry giới hạn khi gặp timeout/5xx theo policy chung, tránh retry liên tục.
- Không tự retry request ghi dữ liệu từ browser nếu không có idempotency contract.
- CV processing hiện có `idempotencyKey` nội bộ dạng `cv_extract_<cvVersionId>`; API public không cần cho browser tự chỉ định key đó.
- Với matching sync, nếu request timeout sau khi service đã lưu kết quả, lần gọi lại nên trả về kết quả hiện có theo `applicationId`, tránh tạo duplicate. `MatchResult` hiện có unique application ID.
- AI Worker cần tiếp tục stateless; trạng thái business/persistence giữ ở Backend/DB.

### 7.3. Giới hạn provider hiện tại cần nói rõ

Trong source hiện tại, `OpenAIProvider` dùng các phương thức fallback `DeterministicTestProvider` cho `generate_embeddings`, `extract_entities` và `calculate_match`, kể cả khi có API key. Vì thế contract response có thể được kiểm tra, nhưng **không được tuyên bố kết quả hiện tại là được OpenAI sinh ra** nếu implementation chưa thực sự gọi provider ngoài. Khải Vạn cần xác nhận provider trước khi demo AI.

## 8. Fixture và quy tắc cập nhật contract

Fixture minh họa nằm trong `docs/contracts/fixtures/`:

- `auth-register-request.json`, `auth-login-response.json`
- `job-search-response.json`
- `cv-upload-accepted-response.json`
- `application-create-request.json`, `application-create-response.json`
- `matching-request.json`, `matching-response.json`
- `ai-match-score-request.json`, `ai-match-score-response.json`

Các fixture là **ví dụ cấu trúc contract**, không phải dữ liệu thật và không được tự động import vào database. Fixture Auth/Application/CV target có thể đề xuất field chưa được endpoint hiện tại hỗ trợ; do đó chỉ dùng làm căn cứ triển khai sau khi owner đồng ý.

Khi thay đổi method/path/field/type/status/error/enum:

1. Owner mở PR nêu rõ thay đổi và lý do.
2. Cập nhật đồng thời controller/DTO, tài liệu contract và fixture liên quan.
3. Backend owner xác nhận implementation; Frontend owner xác nhận adapter/UI; AI Worker owner xác nhận schema nếu có tích hợp AI.
4. Reviewer cross-module kiểm tra ít nhất một luồng end-to-end.
5. Ghi decision vào Decision Log; thay đổi breaking không được merge âm thầm sau freeze.

## 9. Acceptance criteria để freeze API Contract

- [ ] Nhóm đồng ý canonical URL `/api/v1/...` và mapping controller dùng `/v1/...` dưới context path `/api`.
- [x] Auth owner xác nhận register/login/me, token claims, TTL/refresh policy, roles và việc đăng ký Employer (đã xác nhận theo [`Auth_API_Contract_v2.md`](Auth_API_Contract_v2.md) & [`docs/contracts/owner-packets/auth.md`](contracts/owner-packets/auth.md)).
- [ ] Job owner xác nhận DTO, enums, filter/sort, page/size, status transitions, validation và quyền Company.
- [ ] CV/Processing owner xác nhận response DTO, limits, status lifecycle, authorization, file access và error mapping.
- [ ] Application owner xác nhận duplicate policy, `cvVersionId`/snapshot, stage transitions, list/history/ranking endpoints.
- [ ] AI Worker owner xác nhận schemas, model/provider thực tế, scoring semantics, breakdown/rationale, timeout và lỗi.
- [ ] Problem Details nhất quán; không trả entity hoặc dữ liệu nhạy cảm trong response.
- [ ] `VITE_API_BASE_URL` được dùng qua client chung và CORS local được kiểm tra.
- [ ] Các endpoint cần cho ba MVP flow có fixtures; contract chưa triển khai được gắn nhãn rõ.
- [ ] Smoke test HTTP (happy path và lỗi chủ chốt) đã chạy; ghi kết quả, ngày và commit vào tài liệu/PR.
- [ ] Owner và reviewer xác nhận, sau đó mới đổi trạng thái thành **Approved / Frozen**.

## 10. Owner/reviewer đề xuất

Tên owner được lấy theo workbook phân công khi xác định được. Reviewer tích hợp là đề xuất trong task của Việt Khang, cần nhóm xác nhận.

| Module | Owner triển khai | Reviewer tích hợp đề xuất |
|---|---|---|
| API convention, scope, contract matrix | Việt Khang | Các owner module liên quan |
| Auth/JWT/User/Profile/Company | Phúc Khang | Việt Khang + Frontend owner |
| Job/Category/Skill/search | Vua Thanh Hóa (Aka HGK) | Việt Khang + Frontend recruiter/candidate |
| CV upload/storage + snapshot/Application workflow | Tiểu pro + Đại Hưng (theo module) | Việt Khang + Frontend liên quan |
| Matching orchestration/persistence/ranking | Đại Hưng | Khải Vạn + Việt Khang |
| AI Worker extraction/embeddings/scoring | Khải Vạn | Đại Hưng + Việt Khang |
| Frontend Candidate/Recruiter integration | PN Thông / Khanh (theo workbook phân công) | Owner API của module tương ứng |
| Docker/config/environment | Tiểu pro | Các service owner |

## 11. Decision log tối thiểu để buổi review

| Decision ID | Câu hỏi | Người cần xác nhận | Giá trị mặc định đề xuất nếu nhóm đồng ý |
|---|---|---|---|
| API-DEC-01 | Giữ context path `/api` và sửa bốn controller mapping thành `/v1/...`? | Vua Thanh Hóa + Backend | Có |
| API-DEC-02 | Public JSON dùng camelCase; AI Worker contract giữ snake_case? | Việt Khang + Khải Vạn + Đại Hưng | Có |
| API-DEC-03 | Auth trả access token theo header Bearer; policy TTL/refresh thế nào? | Phúc Khang | Token contract trước; TTL phải chốt khi implement |
| API-DEC-04 | Employer register tạo Company ngay hay qua onboarding? | Phúc Khang + nhóm | Chưa chốt |
| API-DEC-05 | Ứng tuyển trùng cùng Job trả 409? Có được nộp lại sau rejected? | Đại Hưng | 409 theo unique constraint hiện tại; reapply policy chưa chốt |
| API-DEC-06 | Matching sync `200` hay async `202` + processing resource? | Đại Hưng + Khải Vạn | Sync `200` theo code hiện tại; async chỉ khi triển khai queue thật |
| API-DEC-07 | Application stage transitions và reject reason bắt buộc lúc nào? | Đại Hưng + recruiter Frontend | Stage values theo schema; transitions cần định nghĩa |
| API-DEC-08 | Candidate được xem bao nhiêu chi tiết của score/rationale? | Product/nhóm + Khải Vạn | Chưa chốt |
| API-DEC-09 | File access: Backend proxy hay signed URL; retention? | Tiểu pro + Đại Hưng | Không expose `filePath`; chốt trước khi có download endpoint |
| API-DEC-10 | Ranking tie-break, ví dụ bằng score thì sort theo applied time? | Đại Hưng + Khải Vạn | Chưa chốt để tránh tự áp quy tắc nghiệp vụ |
| API-DEC-11 | Provider AI nào thực sự được gọi khi demo? | Khải Vạn | Phải xác minh từ implementation/log/test, không chỉ từ `.env` |

## 12. Thay đổi tài liệu

| Phiên bản | Ngày | Nội dung | Trạng thái |
|---|---|---|---|
| 0.1 | 2026-10-12 | Tổng hợp convention, contract mục tiêu cho MVP, current-state gaps, AI Worker integration và fixture list từ source audit | Draft — chờ review, chưa freeze |
