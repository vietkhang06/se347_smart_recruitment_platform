# Owner packet — Auth / User / Profile / Company

- **Owner theo workbook:** Phúc Khang
- **Reviewer đề xuất:** Việt Khang, PN Thông, Khanh
- **Trạng thái:** Chờ owner review; Auth Controller/JWT Security chưa tìm thấy trong source được rà.

## Contract đề xuất cần chốt

| Method + path | Trạng thái | Fixture / deliverable |
|---|---|---|
| `POST /api/v1/auth/register` | Target; chưa tìm thấy implementation | `../fixtures/auth-register-request.json`, `../fixtures/auth-register-response.json` |
| `POST /api/v1/auth/login` | Target; chưa tìm thấy implementation | `../fixtures/auth-login-request.json`, `../fixtures/auth-login-response.json`; cần 401 fixture |
| `GET /api/v1/auth/me` | Target; chưa tìm thấy implementation | Bổ sung current-user response fixture |
| Profile/Company routes | Chưa chốt path; scope cần map với ERD | Fixture sau khi owner xác nhận route/DTO |

## Quyết định bắt buộc

1. Public registration role policy: `candidate` có thể đăng ký công khai? Employer cần invitation/approval hay flow khác? Không cho client tự tạo `admin`.
2. Password storage/validation: dùng password hash an toàn; không trả password/hash trong response.
3. JWT: `sub` là `users.id` hay định dạng khác; claims role/expiration; refresh token có thuộc MVP không.
4. Mapping ID: `users.id` khác `candidate_profiles.id` và `companies.id`; endpoint CV/Application phải map profile từ principal.
5. Error semantics: sai credentials `401`; đã login nhưng không đủ quyền `403`; validation `400` hoặc `422` theo convention đã duyệt.
6. CORS/origin và token lifecycle.

## Acceptance criteria

- Register/login/me có request/response DTO và negative fixtures.
- Không thể register role `admin` qua payload.
- Token claim → DB user → profile/company mapping được test.
- Candidate không xem/sửa profile của người khác; Employer không thao tác Company ngoài quyền.
- API_CONTRACT, OpenAPI/tài liệu, fixture và tests khớp.

## Owner response

- Status: `Pending`
- Changes requested:
- Reviewer/date:
- PR/test evidence:
