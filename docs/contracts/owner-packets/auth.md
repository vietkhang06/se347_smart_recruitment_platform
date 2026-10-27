# Owner packet — Auth / User / Profile / Company

- **Owner theo workbook:** Phúc Khang
- **Reviewer đề xuất:** Việt Khang, PN Thông, Khanh
- **Trạng thái:** Agree [CONFIRMED]; Auth Controller, JWT Security và User Controller đã hoàn thành theo `Auth_API_Contract_v2.md`.

## Contract đề xuất cần chốt

| Method + path | Trạng thái | Fixture / deliverable |
|---|---|---|
| `POST /api/v1/auth/register` | Đã triển khai (`AuthController.java`) [CONFIRMED] | `../fixtures/auth-register-request.json`, `../fixtures/auth-register-response.json` |
| `POST /api/v1/auth/login` | Đã triển khai (`AuthController.java`) [CONFIRMED] | `../fixtures/auth-login-request.json`, `../fixtures/auth-login-response.json`; 401/403 fixtures |
| `GET /api/v1/users/me` | Đã triển khai (`UserController.java`) [CONFIRMED] | Current-user response fixture có mảng `companies: []` (thay thế draft cũ `/auth/me`) |
| Profile/Company routes | Đã triển khai (`CandidateProfileController`, `CompanyController`) [CONFIRMED] | Candidate profile và Company CRUD/Membership fixtures |

## Quyết định bắt buộc

1. Public registration role policy: Chỉ cho phép tự đăng ký role `CANDIDATE` hoặc `EMPLOYER`. Cấm tuyệt đối đăng ký role `ADMIN` qua public API (trả về 400 `INVALID_REGISTRATION_ROLE`).
2. Password storage/validation: Dùng BCrypt (cost 10) an toàn; giới hạn 72 bytes UTF-8; không bao giờ trả password/hash trong response.
3. JWT: `sub` là `users.id` (UUID); chỉ chứa standard claims (`sub`, `iat`, `exp`); role và trạng thái user được truy vấn authoritative từ DB trên mỗi request qua `JwtAuthenticationFilter`.
4. Mô hình Role: Quản lý trực tiếp qua cột `users.role VARCHAR(20) CHECK (role IN ('candidate', 'employer', 'admin'))`, không có bảng `roles` riêng.
5. Mapping ID: `users.id` khác `candidate_profiles.id` và `companies.id`; endpoint CV/Application map profile từ principal.
6. Error semantics: Sai credentials `401`; không đủ quyền `403` (chuẩn RFC 7807 với `code: "FORBIDDEN"`); validation `400`.

## Acceptance criteria

- Register/login/me có request/response DTO và negative tests hoàn chỉnh.
- Không thể register role `admin` qua payload.
- Token claim → DB user → profile/company mapping được test tự động 100%.
- Candidate không xem/sửa profile của người khác; Employer không thao tác Company ngoài quyền.
- API_CONTRACT, OpenAPI/tài liệu, fixture và tests khớp nhau.

## Owner response

- Status: `Agree [CONFIRMED]`
- Changes requested: Không có (thống nhất path current-user là `GET /api/v1/users/me`).
- Reviewer/date: Việt Khang / 2026-10-19
- PR/test evidence: `AuthControllerTest` (9/9 PASS), `AuthServiceTest` (20/20 PASS), `UserControllerTest` (13/13 PASS), `SecurityRouteIntegrationTest` (21/21 PASS), `ApplicationOwnershipSecurityIT` (27/27 PASS).
