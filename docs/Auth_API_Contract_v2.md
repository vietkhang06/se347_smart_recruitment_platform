# MatchaJob – Auth & API Contract Specification v2 (Auth Contract v2)
## Authentication, User, CandidateProfile, and Company/Membership API Endpoints

> **Document Status:** Authoritative Contract Specification (Updated in Batch 2.1 per Approved Decisions)  
> **Target Audience:** Frontend Developers, Backend Developers, QA Engineers  
> **Base URL:** `/api` (hoặc `http://localhost:8080/api`)  
> **Security Protocol:** HTTP Bearer JWT (RFC 6750, RFC 7519)  

---

## 1. Executive Summary & Evidence Classification

Tài liệu này chuẩn hóa toàn bộ hợp đồng giao tiếp API (API Contract v2) cho hệ thống xác thực (Auth), người dùng hiện tại (`/me`), hồ sơ ứng viên (`CandidateProfile`), và doanh nghiệp/thành viên (`Company/Membership`).

### Quy ước phân loại:
- **`[CONFIRMED]`**: Hành vi đã được triển khai, kiểm thử và xác nhận bằng mã nguồn thực tế trong repository.
- **`[APPROVED DECISION]`**: Quyết định thiết kế đã được người dùng chính thức phê duyệt trong Đợt 2.1.
- **`[REQUIRED — Đợt 3]`**: Hạng mục bắt buộc phải triển khai trong Đợt 3.
- **`[OPTIONAL — Chỉ làm khi duyệt riêng]`**: Hạng mục tùy chọn, chỉ thực hiện nếu người dùng duyệt riêng rẽ.
- **`[PROPOSED]`**: Đề xuất thiết kế kỹ thuật, chưa được duyệt triển khai.
- **`[UNRESOLVED]`**: Vấn đề phụ thuộc vào quyết định nghiệp vụ hoặc cần kiểm tra mở rộng.

---

## 2. Cross-Cutting Standards (Tiêu chuẩn Kỹ thuật Dùng chung) [CONFIRMED]

| Hạng mục | Tiêu chuẩn Thống nhất | Bằng chứng Thực tế / Quy tắc |
| :--- | :--- | :--- |
| **API Version & Context Path** | Context path `/api`, tiền tố `/v1` cho toàn bộ tài nguyên. | [`application.yml: L4`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/resources/application.yml#L4) (`context-path: /api`). |
| **ID Format** | UUID v4 dạng chuỗi chuẩn 36 ký tự (8-4-4-4-12, chữ thường). | `java.util.UUID` trên toàn bộ entity và DTO. |
| **Timezone & Timestamps** | ISO-8601 UTC (`yyyy-MM-dd'T'HH:mm:ss'Z'`). Mặc định người dùng: `Asia/Ho_Chi_Minh`. | Cột `TIMESTAMPTZ` trong DB, `java.time.Instant` trong Java. |
| **Email Normalization** | Luôn `trim()` và `toLowerCase(Locale.ROOT)`. | [`AuthService.java: L200-L205`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/auth/service/AuthService.java#L200-L205). |
| **Password Hashing** | BCrypt (cost factor 10, giới hạn tối đa 72 bytes UTF-8). | `BCryptPasswordEncoder` trong `SecurityConfig.java`. |
| **Authentication Header** | `Authorization: Bearer <JWT_ACCESS_TOKEN>`. | [`JwtAuthenticationFilter.java: L108-L114`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/security/JwtAuthenticationFilter.java#L108-L114). |
| **Authoritative Principal** | Principal lấy từ DB qua `userRepository.findById(sub)`, quyền hạn `ROLE_<ROLE_UPPER>`. Không tin cậy claim role trong token. | [`JwtAuthenticationFilter.java: L67-L96`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/security/JwtAuthenticationFilter.java#L67-L96). |
| **Soft-delete Policy** | Kiểm tra `deleted_at IS NULL`. Tài khoản/profile/company bị soft-delete được coi như không tồn tại đối với API đọc. | `deleted_at` trên `users`, `candidate_profiles`, `companies`. |
| **Transaction Boundary** | Mọi API ghi đều bọc trong `@Transactional`. Các API đọc dùng `@Transactional(readOnly = true)`. | Đảm bảo tính ACID và tính toàn vẹn dữ liệu. |
| **Standard Error Schema** | RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, `code`, `errors`, `timestamp`). | [`GlobalExceptionHandler.java`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/common/exception/GlobalExceptionHandler.java). |

---

## 3. Auth API Specifications [CONFIRMED]

### 3.1. Register API: `POST /api/v1/auth/register`
- **Quyền truy cập:** Public (`permitAll`).
- **Mục đích:** Đăng ký tài khoản người dùng mới (chỉ cho phép tự đăng ký với vai trò `CANDIDATE` hoặc `EMPLOYER`).

#### Request DTO (`RegisterRequest`)
```json
{
  "email": "candidate@example.com",
  "password": "SecurePassword123!",
  "role": "CANDIDATE"
}
```
- **Validation Rules:**
  - `email`: `@NotBlank`, `@Email`, max 255 ký tự. Được tự động chuẩn hóa qua `normalizeEmail()`.
  - `password`: `@NotBlank`, độ dài 8..72 ký tự, tối đa 72 bytes UTF-8.
  - `role`: `@NotBlank`, chỉ chấp nhận `"CANDIDATE"` hoặc `"EMPLOYER"` (case-insensitive).

#### Nghiệp vụ Xử lý [CONFIRMED]:
- Kiểm tra trùng email: Nếu email đã tồn tại $\rightarrow$ trả về HTTP 409 Conflict (`EMAIL_ALREADY_EXISTS`).
- Tạo thực thể `User`:
  - `full_name`: Tự động trích xuất từ phần local-part của email (ví dụ: `candidate`).
  - `role`: Lưu dạng chữ thường (`candidate` hoặc `employer`).
  - `status`: Nếu bật cấu hình `app.auth.require-email-verification=true` $\rightarrow$ `'pending_verification'`, `is_verified=false`. Nếu tắt $\rightarrow$ `'active'`, `is_verified=true`.
- **Tự động tạo CandidateProfile:**
  - Nếu `role == 'CANDIDATE'`: Tự động tạo bản ghi trống trong `candidate_profiles` với `user_id = user.id`.
  - Nếu `role == 'EMPLOYER'`: **KHÔNG** tạo `candidate_profiles`.

#### Response DTO (`RegisterResponse`) - HTTP 201 Created
```json
{
  "id": "e93187d1-9a23-4bd5-9cf7-0aa06bb431b9",
  "email": "candidate@example.com",
  "full_name": "candidate",
  "role": "CANDIDATE",
  "status": "active",
  "is_verified": true,
  "message": "User registered successfully"
}
```

---

### 3.2. Login API: `POST /api/v1/auth/login`
- **Quyền truy cập:** Public (`permitAll`).
- **Mục đích:** Xác thực người dùng và cấp JWT Access Token.

#### Request DTO (`LoginRequest`)
```json
{
  "email": "candidate@example.com",
  "password": "SecurePassword123!"
}
```

#### Nghiệp vụ Xử lý & Trạng thái Bị chặn [CONFIRMED]:
1. Chuẩn hóa email: `normalizeEmail(request.getEmail())`.
2. Truy vấn user: Nếu user không tồn tại, đã bị soft-delete (`deleted_at != null`), hoặc mật khẩu không khớp $\rightarrow$ ném `InvalidCredentialsException` (HTTP 401: `INVALID_CREDENTIALS`).
3. Kiểm tra khóa tài khoản: Nếu `status == 'suspended'` $\rightarrow$ ném `AccountSuspendedException` (HTTP 401: `ACCOUNT_SUSPENDED`).
4. Kiểm tra kích hoạt: Nếu cấu hình yêu cầu xác minh email và `is_verified == false` $\rightarrow$ ném `AccountNotActivatedException` (HTTP 401: `ACCOUNT_NOT_ACTIVATED`).
5. Thành công: Cập nhật `last_login_at = now()`, sinh JWT Token.

#### JWT Claims [CONFIRMED — ĐỢT 3.2]:
- **Claims phát hành chính thức trong Access Token [`JwtTokenProvider.java`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/security/JwtTokenProvider.java) [CONFIRMED]:**
  - `sub`: `user.id.toString()` (UUID định danh người dùng)
  - `iat`: Thời điểm phát hành token (Issued At)
  - `exp`: Thời điểm hết hạn token (Expiration, mặc định 1 giờ = 3,600,000 ms)
- **Quy tắc phân quyền Backend & Xử lý Email/Role [CONFIRMED]:**
  - Token **chỉ chứa 3 claim chuẩn**: `sub`, `iat`, `exp`. Các claim `email`, `role`, và `companyId` hoàn toàn **không được đưa vào JWT claims**.
  - `email` và `role` của người dùng **luôn được truy vấn trực tiếp từ cơ sở dữ liệu** (`UserRepository.findById`) trên mỗi request thông qua [`JwtAuthenticationFilter.java`](file:///d:/CongNgheWeb/DoAn/se347_smart_recruitment_platform/backend/src/main/java/com/matchajob/security/JwtAuthenticationFilter.java) để đảm bảo quyền hạn và trạng thái tài khoản (`status`, `deleted_at`, `is_verified`) luôn chính xác và cập nhật tức thì.
  - Phía Client nhận thông tin người dùng (`id`, `email`, `full_name`, `role`) từ object `user` trong response của `POST /v1/auth/login`, `POST /v1/auth/register`, hoặc `GET /v1/users/me`, không phụ thuộc vào việc giải mã token.
- **Ràng buộc cứng [CONFIRMED]:** Tuyệt đối không đưa `companyId` vào JWT claims.

#### Response DTO (`LoginResponse`) - HTTP 200 OK
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "e93187d1-9a23-4bd5-9cf7-0aa06bb431b9",
    "email": "candidate@example.com",
    "full_name": "candidate",
    "role": "CANDIDATE"
  }
}
```

---

## 4. Current User API: `GET /api/v1/users/me` [REQUIRED — Đợt 3]

- **Quyền truy cập:** Yêu cầu xác thực (`isAuthenticated()`).
- **Xác thực danh tính [CONFIRMED]:** Lấy trực tiếp từ `SecurityContextHolder.getContext().getAuthentication().getPrincipal()`. Client tuyệt đối không được truyền `userId` qua query param hay body.

### 4.1. Response Schema Hiện tại (v1) [CONFIRMED]
```json
{
  "id": "e93187d1-9a23-4bd5-9cf7-0aa06bb431b9",
  "email": "candidate@example.com",
  "full_name": "Candidate User",
  "phone": "+84901234567",
  "role": "candidate",
  "avatar_url": "https://storage.matchajob.com/avatars/1.jpg",
  "status": "active",
  "is_verified": true,
  "timezone": "Asia/Ho_Chi_Minh",
  "last_login_at": "2026-10-12T00:00:00Z",
  "created_at": "2026-10-10T12:00:00Z",
  "updated_at": "2026-10-12T00:00:00Z"
}
```

### 4.2. Response Schema Mở rộng trong Đợt 3 (v2) [REQUIRED — Đợt 3]
Bổ sung trường `companies` dưới dạng một **mảng JSON (Array)** theo chuẩn snake_case:
- **Nguyên tắc mảng:** Thuộc tính `companies` **luôn luôn là mảng `[]`**, tuyệt đối **không bao giờ trả về `null`**.
- **Đối với `CANDIDATE`:** Trả về mảng rỗng `companies: []`.
- **Đối với `EMPLOYER` chưa sở hữu/tham gia công ty nào:** Trả về mảng rỗng `companies: []`.
- **Đối với `EMPLOYER` có công ty:** Trả về danh sách các công ty mà user có quyền truy cập (`companies.owner_id == userId` HOẶC có trong `company_members`), **đồng thời công ty đó chưa bị xóa mềm** (`companies.deleted_at IS NULL`).

#### Ví dụ Response cho Employer có công ty:
```json
{
  "id": "3ea7be8a-2f65-49ca-a004-9a071b1f17a3",
  "email": "employer@matchajob.com",
  "full_name": "Nguyen Recruiter",
  "phone": "+84909888999",
  "role": "employer",
  "avatar_url": null,
  "status": "active",
  "is_verified": true,
  "timezone": "Asia/Ho_Chi_Minh",
  "last_login_at": "2026-10-12T00:00:00Z",
  "created_at": "2026-10-10T12:00:00Z",
  "updated_at": "2026-10-12T00:00:00Z",
  "companies": [
    {
      "id": "8a8c3100-6e06-47e7-8f8e-c872d11a1343",
      "name": "Matcha Solutions Corp",
      "membership_role": "owner"
    }
  ]
}
```
- **Các trường tối thiểu của mỗi phần tử `companies`:**
  - `id`: UUID của công ty
  - `name`: Tên công ty
  - `membership_role`: Vai trò thành viên (`"owner"`, `"admin"`, `"member"`)

---

## 5. CandidateProfile API [CONFIRMED]

- **Quyền truy cập:** `@PreAuthorize("hasRole('CANDIDATE')")` (Chỉ người dùng có vai trò CANDIDATE).
- **Quy tắc sở hữu dữ liệu:** Profile ID được truy vấn thông qua `candidateProfileRepository.findByUserId(user.getId())`. Người dùng không thể chỉ định profile ID của người khác.
- **Trường chỉ đọc (Read-only):** `cv_url` và `ai_cv_score` chỉ được trả về ở lệnh GET, tuyệt đối không được phép chỉnh sửa qua API profile.

### 5.1. `GET /api/v1/candidates/profile`
- **Response DTO (`CandidateProfileResponse`) - HTTP 200 OK:**
```json
{
  "id": "cd222fc5-d6e5-47f8-aaa0-09c6665ac5b1",
  "user_id": "e93187d1-9a23-4bd5-9cf7-0aa06bb431b9",
  "headline": "Senior Backend Engineer",
  "bio": "5 years building Java Spring & microservices systems",
  "experience_years": 5,
  "education": "B.S. Computer Science - HCMUS",
  "location": "Ho Chi Minh City",
  "address": "District 1",
  "cv_url": "https://storage.matchajob.com/cv/my-cv.pdf",
  "ai_cv_score": 92,
  "created_at": "2026-10-10T12:00:00Z",
  "updated_at": "2026-10-12T00:50:00Z"
}
```

### 5.2. `PATCH /api/v1/candidates/profile`
- **Request DTO (`UpdateCandidateProfileRequest`):**
```json
{
  "headline": "Lead Software Architect",
  "bio": "",
  "experience_years": 8,
  "location": "  Da Nang, Vietnam  "
}
```

#### Quy tắc cập nhật PATCH bắt buộc (PATCH Contract) [CONFIRMED]:
| Trường Dữ liệu | Giá trị Gửi lên | Hành vi Cập nhật của Hệ thống |
| :--- | :--- | :--- |
| **5 trường chuỗi** (`headline`, `bio`, `education`, `location`, `address`) | Không gửi (omitted) | **Giữ nguyên** giá trị hiện tại. |
| | Gửi `null` | **Giữ nguyên** giá trị hiện tại (không xóa). |
| | Gửi `""` (chuỗi rỗng) | **Xóa trường**, lưu giá trị `NULL`. |
| | Gửi `"   "` (khoảng trắng) | Trim hai đầu $\rightarrow$ rỗng $\rightarrow$ **xóa trường**, lưu giá trị `NULL`. |
| | Gửi chuỗi có nội dung | Trim hai đầu $\rightarrow$ lưu chuỗi đã trim (ví dụ: `"  Da Nang  "` $\rightarrow$ `"Da Nang"`). |
| **`experience_years`** | Không gửi (omitted) hoặc gửi `null` | **Giữ nguyên** giá trị hiện tại. |
| | Gửi số 0..60 | **Cập nhật** giá trị mới. |
| | Gửi số < 0 hoặc > 60 | Trả về lỗi validation **HTTP 400 Bad Request**. |
| **Payload rỗng `{}` hoặc toàn `null`** | Mọi trường đều omitted hoặc null | **Không thay đổi entity, không gọi `save()`, không đổi `updated_at`**. |

---

## 6. Company & Membership API Specifications

### 6.1. Hạng mục Bắt buộc trong Đợt 3 [REQUIRED — Đợt 3]

#### `POST /api/v1/companies` – Tạo Doanh nghiệp mới
- **Quyền truy cập:** `@PreAuthorize("hasRole('EMPLOYER')")`.
- **Transaction Boundary:** Phải bọc trong `@Transactional`.
- **Request DTO (`CreateCompanyRequest`):**
  - `name`: String, `@NotBlank`, max 255.
  - `short_name`: String, max 50 (optional).
  - `tax_code`: String, max 30, unique (optional).
  - `industry`: String, max 100 (optional).
  - `size`: String, thuộc tập `('1-49', '50-150', '150-500', '500-1000', '1000+')` (optional).
  - `location`: String, max 255 (optional).
  - `address`: String, max 1000 (optional).
  - `website`: String, valid URL, max 500 (optional).
  - `email`: String, valid email, max 255 (optional).
  - `phone`: String, max 20 (optional).
  - `about`: String, max 5000 (optional).
  - **Trường cấm truyền/sửa:** `owner_id`, `is_verified`, `id`, `slug`, `created_at`, `deleted_at`.
- **Nghiệp vụ Xử lý Bắt buộc [APPROVED DECISION]:**
  1. **Xác định Identity:** Lấy `userId` trực tiếp từ authenticated principal. Client không được truyền `owner_id`.
  2. **Kiểm tra trùng mã số thuế (`tax_code`):**
     - Service kiểm tra trước qua repository.
     - **Bắt buộc xử lý Exception:** Phải bọc khối lưu trong `try-catch (DataIntegrityViolationException ex)` để bắt race-condition khi vi phạm unique constraint `uq_companies_tax_code`, chuyển thành **HTTP 409 Conflict** (`TAX_CODE_ALREADY_EXISTS`).
  3. **Tạo Entity `Company`:**
     - Gán `owner_id = principal.userId`.
     - `is_verified = false` (giữ nguyên default schema, không can thiệp).
     - Lưu vào bảng `companies`.
  4. **Tạo Entity `CompanyMember` (Owner Membership):**
     - `company_id = savedCompany.getId()`
     - `user_id = principal.userId`
     - `role = 'owner'`
     - `joined_at = Instant.now()`
     - Lưu vào bảng `company_members`.
  5. **Tính nguyên tử (Atomicity):** Nếu thao tác tạo membership thất bại hoặc xảy ra exception, transaction tự động rollback toàn bộ, không tạo company mồ côi.
- **Response DTO (`CompanyResponse`) - HTTP 201 Created:** Trả về thông tin company vừa tạo (định danh bằng UUID `id`, không có slug).

---

### 6.2. Hạng mục Tùy chọn [OPTIONAL — Chỉ làm khi duyệt riêng]

> Các endpoint dưới đây chỉ được triển khai khi người dùng phê duyệt riêng rẽ. Không coi là yêu cầu bắt buộc của Đợt 3.

#### A. `GET /api/v1/companies` – Danh sách Công ty của User [OPTIONAL]
- **Quyền truy cập:** `@PreAuthorize("hasRole('EMPLOYER')")`.
- **Nghiệp vụ:** Trả về danh sách các công ty mà user là `owner` hoặc có trong `company_members`, **loại bỏ các công ty có `deleted_at IS NOT NULL`**.
- **Response:** `List<CompanySummaryResponse>` - HTTP 200 OK.

#### B. `GET /api/v1/companies/{id}` – Xem Chi tiết Công ty [OPTIONAL]
- **Quyền truy cập:** Người dùng đã xác thực là thành viên của công ty hoặc Admin.
- **Quy tắc soft-delete:** Nếu công ty có `deleted_at IS NOT NULL` $\rightarrow$ HTTP 404 Not Found.
- **Response:** `CompanyResponse` - HTTP 200 OK.

#### C. `PATCH /api/v1/companies/{id}` – Cập nhật Công ty [OPTIONAL]
- **Quyền truy cập:** Phải là `owner` hoặc `admin` của công ty.
- **Xác thực quyền sở hữu:** Kiểm tra `companies.owner_id == principal.userId` HOẶC `company_members` có `(company_id = id, user_id = principal.userId, role IN ('owner', 'admin'))`.
- **Ràng buộc allowlist:** Cấm sửa `owner_id`, `is_verified`, `id`, `created_at`, `deleted_at`.
- **Semantics:** Áp dụng PATCH contract tương tự CandidateProfile (omitted giữ nguyên, trim chuỗi, rỗng lưu NULL).

#### D. `POST /api/v1/companies/{id}/members` – Thêm Thành viên [OPTIONAL]
- **Quy tắc đã duyệt [APPROVED DECISION]:**
  - **Chỉ hỗ trợ thêm user đã tồn tại** trong hệ thống (tìm theo email).
  - **Không có Invitation Workflow:** Không sinh token, không gửi email mời, không có bảng/trạng thái invitation.
  - **Quyền:** Chỉ `owner` hoặc `admin` của công ty được thêm thành viên.
  - **Giới hạn Role:** Chỉ được gán role `'admin'` hoặc `'member'`. **Cấm tuyệt đối gán role `'owner'`**.
  - **Trạng thái [UNRESOLVED]:** Điều kiện về role/status của user được thêm (ví dụ: bắt buộc user có role `employer`, trạng thái `active`, chưa soft-delete) là đề xuất kỹ thuật cần xem xét, chưa phải quy định đã chốt.
- **Lỗi:** 404 (User không tồn tại), 409 (User đã là thành viên).

#### E. `DELETE /api/v1/companies/{id}/members/{userId}` – Xóa Thành viên / Rời Công ty [OPTIONAL]
- **Quyền:** Owner có quyền xóa admin/member; thành viên có quyền tự rời công ty (`userId == principal.userId`).
- **Cấm xóa Owner [APPROVED DECISION]:** API này **cấm tuyệt đối xóa bản ghi có role `owner`** (kể cả chính owner tự gọi). Muốn xóa owner phải thực hiện qua quy trình giải thể công ty. Nếu cố xóa owner $\rightarrow$ HTTP 400 Bad Request (`CANNOT_REMOVE_COMPANY_OWNER`).
- **Nghiệp vụ:** Hard-Delete bản ghi tương ứng trong `company_members`.

---

## 7. Error Handling & Status Codes Summary [CONFIRMED]

| HTTP Status | Error Code | Mô tả |
| :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Tham số không hợp lệ (ví dụ: `experience_years > 60`, sai định dạng email). |
| **400 Bad Request** | `INVALID_REGISTRATION_ROLE` | Đăng ký với role không được phép (chỉ nhận `CANDIDATE` hoặc `EMPLOYER`). |
| **400 Bad Request** | `CANNOT_REMOVE_COMPANY_OWNER` | Cố gắng xóa chủ sở hữu khỏi công ty. |
| **401 Unauthorized** | `INVALID_CREDENTIALS` | Sai email hoặc mật khẩu; hoặc tài khoản đã bị soft-delete. |
| **401 Unauthorized** | `ACCOUNT_SUSPENDED` | Tài khoản đã bị khóa bởi quản trị viên. |
| **401 Unauthorized** | `ACCOUNT_NOT_ACTIVATED` | Tài khoản đang chờ xác thực email. |
| **401 Unauthorized** | `UNAUTHORIZED` | Thiếu hoặc token JWT không hợp lệ/hết hạn. |
| **403 Forbidden** | `FORBIDDEN` | Không đủ quyền hạn (ví dụ: EMPLOYER gọi API CandidateProfile; hoặc không phải member của company). |
| **404 Not Found** | `USER_NOT_FOUND` | Không tìm thấy người dùng. |
| **404 Not Found** | `CANDIDATE_PROFILE_NOT_FOUND` | Không tìm thấy hồ sơ ứng viên (hoặc đã bị soft-delete). |
| **404 Not Found** | `COMPANY_NOT_FOUND` | Không tìm thấy doanh nghiệp (hoặc đã bị soft-delete). |
| **409 Conflict** | `EMAIL_ALREADY_EXISTS` | Email đã được đăng ký trong hệ thống. |
| **409 Conflict** | `TAX_CODE_ALREADY_EXISTS` | Mã số thuế đã được đăng ký bởi công ty khác. |
| **500 Internal Error**| `INTERNAL_SERVER_ERROR` | Lỗi máy chủ nội bộ hoặc lỗi kết nối cơ sở dữ liệu. |

---

## 8. Ranh giới Trách nhiệm Package / Module (Module Ownership Matrix) [CONFIRMED]

| Module Package | Ownership & Trách nhiệm Nghiệp vụ | Phụ thuộc Cho phép | Trạng thái Đợt 3 |
| :--- | :--- | :--- | :--- |
| `com.matchajob.auth` | Xác thực đăng ký (`POST /v1/auth/register`), đăng nhập (`POST /v1/auth/login`), chuẩn hóa email, kiểm tra kích hoạt/khóa tài khoản. | `user.repository.UserRepository`, `security.JwtTokenProvider`, `user.model.User` | Trong phạm vi Đợt 3 |
| `com.matchajob.security` | Phát hành và xác thực JWT token (`JwtTokenProvider`), filter bảo mật (`JwtAuthenticationFilter`), cấu hình endpoint permitAll/authenticated theo profile (`SecurityConfig`). | `user.repository.UserRepository` (lấy principal từ DB) | Trong phạm vi Đợt 3 |
| `com.matchajob.user` | Thông tin tài khoản hiện tại (`/v1/users/me`), hồ sơ ứng viên (`/v1/candidates/profile`), doanh nghiệp & thành viên (`/v1/companies`, `Company`, `CompanyMember`). | Tự chủ trong package `user`; dùng `common.exception` | Trong phạm vi Đợt 3 |
| `com.matchajob.common` | Xử lý ngoại lệ toàn cục (`GlobalExceptionHandler`), chuẩn hóa mã lỗi RFC 7807 Problem Detail. | Các domain exception từ `auth`, `user`, v.v. | Trong phạm vi Đợt 3 |
| `com.matchajob.config` | Cấu hình OpenAPI documentation (`OpenApiConfig`). | Thư viện SpringDoc OpenAPI | Trong phạm vi Đợt 3 |
| `com.matchajob.api.recruitment` | Tuyển dụng, bài đăng việc làm, quy trình ứng tuyển. | N/A | **Ngoài phạm vi Đợt 3 (Bảo toàn nguyên trạng)** |
| `com.matchajob.cv` | Quản lý và xử lý file CV, trích xuất dữ liệu ứng viên. | N/A | **Ngoài phạm vi Đợt 3 (Bảo toàn nguyên trạng)** |
| `com.matchajob.matching` | Khớp nối ứng viên - công việc bằng AI/Vector. | N/A | **Ngoài phạm vi Đợt 3 (Bảo toàn nguyên trạng)** |

