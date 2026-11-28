# MatchaJob — Auth/RBAC & Security Regression Test Report

> **Ngày thực hiện:** 2026-11-24
> **Nhánh thực hiện:** `feat/auth-role-seed-security-regression-erd` (tạo từ `main` commit `55322f7`)
> **Môi trường kiểm thử:** Java `21.0.13` (Temurin), Spring Boot `3.3.4`, PostgreSQL `16.15` (`pgvector`, DB cô lập `matchajob_test`, Flyway `V1`–`V8` validated)
> **Kết luận tổng thể:** **PASS (264 / 264 tests executed & passed — 0 Failures, 0 Errors, 0 Skipped)**

---

## 1. Tóm tắt Phạm vi & Kết quả Kiểm thử

### 1.1. Lệnh Thực thi & Bằng chứng XML Summary

#### A. Maven Surefire — Unit & WebMvc Slice Security Tests
```powershell
$env:JAVA_HOME = Split-Path (Split-Path (Get-Command java).Source)
cd backend
.\mvnw.cmd test -Dtest="AuthControllerTest,AuthServiceTest,JwtTokenProviderTest,JwtAuthenticationFilterTest,SecurityProfileValidatorTest,ResourceOwnershipServiceTest,SecurityFilterChainMockMvcTest,SwaggerDevProfileAccessTest,SwaggerProdProfileAccessTest,CvSecurityHttpTest,GlobalExceptionHandlerLoggingTest"
```
- **Kết quả:** `Tests run: 99, Failures: 0, Errors: 0, Skipped: 0` (**BUILD SUCCESS**)

#### B. Maven Failsafe (`verify`) — Real-DB Auth/RBAC & Ownership Integration Tests
```powershell
$env:JAVA_HOME = Split-Path (Split-Path (Get-Command java).Source)
cd backend
.\mvnw.cmd verify "-DskipUTs=true" "-Dtest=none" "-Dsurefire.failIfNoSpecifiedTests=false" "-Dit.test=DemoAuthDataSeederIT,AuthRbacSeedRegressionIT,RbacAuthorizationRegressionIT,OwnershipSecurityRegressionIT,JwtSecurityNegativeIT,AdminUserSecurityIT,AdminAndUserHttpE2EIT,CompanyOwnershipSecurityIT,EmployerJobOwnershipIT,ApplicationOwnershipSecurityIT,InterviewSecurityIT,TaxonomySecurityIT,RecruitmentRouteSecurityIT,PayloadValidationSecurityIT,SecurityRouteIntegrationTest"
```
- **Bằng chứng `backend/target/failsafe-reports/failsafe-summary.xml`:**
  ```xml
  <completed>165</completed>
  <errors>0</errors>
  <failures>0</failures>
  <skipped>0</skipped>
  ```

### 1.2. Bảng Chi tiết Kết quả theo Từng Test Class (`264 / 264 PASS`)

| Plugin | Test Class | Tests Run | Failures | Errors | Skipped | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Surefire | `AuthControllerTest` | 9 | 0 | 0 | 0 | PASS |
| Surefire | `AuthServiceTest` | 20 | 0 | 0 | 0 | PASS |
| Surefire | `JwtTokenProviderTest` | 10 | 0 | 0 | 0 | PASS |
| Surefire | `JwtAuthenticationFilterTest` | 15 | 0 | 0 | 0 | PASS |
| Surefire | `SecurityProfileValidatorTest` *(+2 tests prod demo-seed)* | 14 | 0 | 0 | 0 | PASS |
| Surefire | `ResourceOwnershipServiceTest` | 14 | 0 | 0 | 0 | PASS |
| Surefire | `SecurityFilterChainMockMvcTest` | 9 | 0 | 0 | 0 | PASS |
| Surefire | `SwaggerDevProfileAccessTest` | 1 | 0 | 0 | 0 | PASS |
| Surefire | `SwaggerProdProfileAccessTest` | 2 | 0 | 0 | 0 | PASS |
| Surefire | `CvSecurityHttpTest` | 3 | 0 | 0 | 0 | PASS |
| Surefire | `GlobalExceptionHandlerLoggingTest` *(Mới — SEC-LOG-01)* | 2 | 0 | 0 | 0 | PASS |
| **Tổng Surefire** | **11 Unit/Slice Classes** | **99** | **0** | **0** | **0** | **PASS** |
| Failsafe | `DemoAuthDataSeederIT` *(Mới)* | 5 | 0 | 0 | 0 | PASS |
| Failsafe | `AuthRbacSeedRegressionIT` *(Mới)* | 5 | 0 | 0 | 0 | PASS |
| Failsafe | `RbacAuthorizationRegressionIT` *(Mới)* | 4 | 0 | 0 | 0 | PASS |
| Failsafe | `OwnershipSecurityRegressionIT` *(Mới)* | 3 | 0 | 0 | 0 | PASS |
| Failsafe | `JwtSecurityNegativeIT` | 10 | 0 | 0 | 0 | PASS |
| Failsafe | `AdminUserSecurityIT` | 8 | 0 | 0 | 0 | PASS |
| Failsafe | `AdminAndUserHttpE2EIT` | 2 | 0 | 0 | 0 | PASS |
| Failsafe | `CompanyOwnershipSecurityIT` | 6 | 0 | 0 | 0 | PASS |
| Failsafe | `EmployerJobOwnershipIT` | 19 | 0 | 0 | 0 | PASS |
| Failsafe | `ApplicationOwnershipSecurityIT` | 27 | 0 | 0 | 0 | PASS |
| Failsafe | `InterviewSecurityIT` | 15 | 0 | 0 | 0 | PASS |
| Failsafe | `TaxonomySecurityIT` | 9 | 0 | 0 | 0 | PASS |
| Failsafe | `RecruitmentRouteSecurityIT` | 25 | 0 | 0 | 0 | PASS |
| Failsafe | `PayloadValidationSecurityIT` | 5 | 0 | 0 | 0 | PASS |
| Failsafe | `SecurityRouteIntegrationTest` | 22 | 0 | 0 | 0 | PASS |
| **Tổng Failsafe** | **15 Integration Test Classes** | **165** | **0** | **0** | **0** | **PASS** |

---

## 2. Kiểm chứng 6 Nhóm Kịch bản Auth/RBAC & Security

| Nhóm Kịch bản | Nội dung Đã Kiểm chứng | Test Suite Bằng chứng | Kết quả |
| :--- | :--- | :--- | :---: |
| **1. Demo Seed & Production Safety** | Seed đủ 6 tài khoản (`admin`, `employer1`, `employer2`, `candidate1`, `candidate2`, `suspended`), đúng `role`, BCrypt hash, `admin_permissions`, `companies` + `company_members(owner)`, `candidate_profiles`; idempotent lần 2; không ghi đè password/status/role cũ; từ chối mật khẩu placeholder/yếu; Fail-Closed trên `prod`/`staging`/`test`/`APP_ENV=production`. | `DemoAuthDataSeederIT`, `SecurityProfileValidatorTest` | **PASS** |
| **2. Login & JWT Validation** | Login thành công trả `200` + JWT chỉ gồm `sub, iat, exp`; `/v1/users/me` trả đúng `companies[]` cho Employer và `[]` cho Candidate/Admin; từ chối `401` cho sai mật khẩu, thiếu token, token hết hạn, sai chữ ký, `alg:none`, user không tồn tại hoặc đã soft-delete. | `AuthRbacSeedRegressionIT`, `JwtSecurityNegativeIT`, `JwtTokenProviderTest`, `JwtAuthenticationFilterTest` | **PASS** |
| **3. Khóa tài khoản (Account Lock)** | Tài khoản `suspended` login nhận `403 ACCOUNT_SUSPENDED`; Admin khóa user active $\rightarrow$ JWT cũ bị chặn `401` ngay ở request kế tiếp; mở khóa $\rightarrow$ khôi phục `200`; chặn tự khóa (`400 SELF_SUSPEND_NOT_ALLOWED`) & bảo vệ admin cuối cùng (`LAST_ADMIN_PROTECTED`). | `AuthRbacSeedRegressionIT`, `AdminUserSecurityIT`, `AdminAndUserHttpE2EIT` | **PASS** |
| **4. Sai Role (RBAC Matrix)** | `CANDIDATE` gọi Employer/Admin routes $\rightarrow$ `403`; `EMPLOYER` gọi Candidate/Admin routes $\rightarrow$ `403`; `ADMIN` gọi Candidate/Employer-only routes $\rightarrow$ `403`, được phép `/v1/admin/**` & `/api/v1/recruitment/taxonomies/**` (`POST/DELETE`). | `RbacAuthorizationRegressionIT`, `TaxonomySecurityIT`, `RecruitmentRouteSecurityIT`, `SecurityRouteIntegrationTest` | **PASS** |
| **5. Truy cập chéo (IDOR / Ownership)** | Trên DB PostgreSQL thật: Employer 2 bị chặn `403` trên company/job/applications/ranking/stage/interview của Employer 1; Candidate 2 bị chặn `403` trên CV/application/match/processing-job của Candidate 1; Employer 1 chỉ đọc được `cv_version` nằm trong `application_cv_snapshots` (bị chặn `403` với CV mới chưa nộp); Admin đọc CV ghi đúng `audit_logs`. | `OwnershipSecurityRegressionIT`, `CompanyOwnershipSecurityIT`, `EmployerJobOwnershipIT`, `ApplicationOwnershipSecurityIT`, `InterviewSecurityIT`, `CvSecurityHttpTest` | **PASS** |
| **6. Leo thang đặc quyền & Logging** | Chặn tự đăng ký `ADMIN` (`400 INVALID_REGISTRATION_ROLE`); `PATCH /v1/users/me` bỏ qua `role/status/isVerified/email`; `POST /v1/companies` bỏ qua `owner_id/is_verified`; validation fail trên `RegisterRequest.password` không log plaintext password. | `RbacAuthorizationRegressionIT`, `GlobalExceptionHandlerLoggingTest`, `PayloadValidationSecurityIT` | **PASS** |

---

## 3. Kết quả Kiểm toán Secret, Git History & Logging

| Mã Finding | Mức độ | Trạng thái | Mô tả & Hành động Đã Thực hiện |
| :--- | :---: | :---: | :--- |
| **SEC-LOG-01** | **HIGH** | **VERIFIED** | `GlobalExceptionHandler#handleMethodArgumentNotValid` trước đây log `ex.getMessage()` (lộ `rejected value` mật khẩu thô). Đã sửa để chỉ log `field: message`, thêm `@ToString.Exclude` trên `RegisterRequest.password` & `LoginRequest.password`, và xác minh bằng `GlobalExceptionHandlerLoggingTest` (PASS). |
| **SEC-LOG-02** | **LOW** | **VERIFIED** | `GlobalExceptionHandler` cho `DataIntegrityViolationException` và `HttpMessageNotReadableException` đã được rút gọn chỉ log tên constraint / tên lớp ngoại lệ gốc, tránh in PII hoặc đoạn JSON lỗi cú pháp. |
| **SEC-CFG-01** | **MEDIUM** | **VERIFIED** | Cập nhật `.gitignore` bổ sung allowlist cho `docs/AUTH_RBAC_SECURITY_IMPLEMENTATION_PLAN.md`, `docs/SECURITY_RBAC_AND_JWT_FLOW.md`, và `docs/qa/security-regression/**`; xác minh bằng `git check-ignore -v`. |
| **SEC-CFG-03** | **LOW** | **VERIFIED** | Cập nhật `application-dev.yml` dùng `${REQUIRE_EMAIL_VERIFICATION:false}` và bổ sung `APP_ENV` + `DEMO_SEED_ENABLED` (mặc định `false`) cho service `backend` trong `compose.yaml`. |
| **SEC-CFG-02** | **LOW** | **ACCEPTED RISK** *(Dev/Test Only)* | Dev JWT secret mặc định chỉ dùng cho local dev/test; đã có `SecurityProfileValidator` chặn fail-fast trên `prod` (`SecurityProfileValidatorTest` 14/14 PASS). |
| **SEC-HIST-01** | **INFO** | **VERIFIED** | Quét `git ls-files` và `git log --all --full-history` cho `.env`, `*.pem`, `*.key`, `*.p12`, `sk-*`, `AKIA*`, `ghp_*`, `AIza*`, `PRIVATE KEY`: **0 phát hiện**. |

---

## 4. Xác nhận Đồng bộ Tài liệu

- [x] [`docs/ERD_v2.md`](../../ERD_v2.md) — Đồng bộ đủ Flyway `V1`–`V8` (31 bảng, 2 views), phân nhóm 15 JPA Entities / 4 `JdbcClient` tables / 12 schema-only tables, chuỗi ownership và chiến lược seed.
- [x] [`docs/SECURITY_RBAC_AND_JWT_FLOW.md`](../../SECURITY_RBAC_AND_JWT_FLOW.md) — Sơ đồ JWT Flow, Ma trận RBAC & Ownership 16 controllers (kèm Servlet Path vs External HTTP Path), Configuration Matrix theo profile và hướng dẫn Demo Seed an toàn.
- [x] [`docs/Auth_API_Contract_v2.md`](../../Auth_API_Contract_v2.md) — Đồng bộ mã HTTP `403` cho `ACCOUNT_SUSPENDED` / `ACCOUNT_NOT_ACTIVATED` trên `POST /api/v1/auth/login` khớp `AccountSuspendedException` & `AccountNotActivatedException`.
- [x] [`docs/AUTH_RBAC_SECURITY_IMPLEMENTATION_PLAN.md`](../../AUTH_RBAC_SECURITY_IMPLEMENTATION_PLAN.md) — Lưu bản kế hoạch kỹ thuật 20 mục đã được PO phê duyệt.
