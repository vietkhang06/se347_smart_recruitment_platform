# Owner packet — Job / Category / Skill

- **Owner theo workbook:** Vua Thanh Hóa – Aka HGK
- **Reviewer đề xuất:** Việt Khang, PN Thông, Khanh
- **Trạng thái:** Job/Employer Job/Category/Skill routes có trong source; base path cần sửa và runtime chưa được xác minh.

## Routes có căn cứ trong source

| Route chuẩn mục tiêu | Source route annotation | Fixture / quyết định |
|---|---|---|
| `GET /api/v1/jobs` | `JobController @RequestMapping("/api/v1/jobs")` | `../fixtures/job-search-response.json`; sửa prefix khi giữ context path `/api` |
| `GET /api/v1/jobs/{id}` | Source có `GET /{id}` | Chốt 404 + detail response |
| `GET /api/v1/categories` | `CategoryController @RequestMapping("/api/v1/categories")` | Thêm list fixture nếu cần |
| `GET /api/v1/skills?categoryId=&q=` | `SkillController @RequestMapping("/api/v1/skills")` | Chốt filtering/empty result |
| `GET /api/v1/employer/jobs?companyId=&status=&page=&size=` | Source có route | Chốt auth: `companyId` phải lấy/validate theo principal |
| `POST /api/v1/employer/jobs` | Source có route | `../fixtures/job-create-request.json`, `../fixtures/job-create-response.json` khớp DTO source; `createdBy` phải được kiểm soát bằng principal sau Auth |
| `PUT /api/v1/employer/jobs/{id}` | Source có route | Chốt replace/update semantics và validation |
| `PATCH /api/v1/employer/jobs/{id}/status` | Source có route | Status values lấy từ enum/schema; chốt transition hợp lệ |
| `DELETE /api/v1/employer/jobs/{id}` | Source có route | 204/ownership/soft vs hard delete cần xác nhận theo service/schema |

## Source facts cần lưu ý

- `server.servlet.context-path=/api`; Recruitment controllers hiện khai báo `/api/v1/...`, do đó URL suy ra bị lặp `/api` cho các route này.
- DTO có `camelCase`, `PageResponse` fields là `content`, `page`, `size`, `totalElements`, `totalPages`, `last`.
- Job search query hiện nhận `keyword`, `categoryId`, `level`, `workType`, `location`, `salaryMin`, `salaryMax`, `skillIds`, `sortBy`, `page`, `size`.
- `size` tối đa 50 được đề cập trong service/contract audit; allowed `sortBy` cần owner xác nhận dựa trên service implementation.
- `JobCreateRequest` hiện nhận `companyId`, `createdBy` trong body. Sau khi Auth/RBAC có thật, `createdBy` phải derive từ JWT, còn company ownership phải được kiểm tra server-side.

## Acceptance criteria

- Canonical endpoint sau fix trả đúng response; URL lặp `/api/api/v1` không được dùng làm URL chuẩn.
- Query fixtures bao gồm no-filter, filter + sort, page beyond end, invalid UUID/enum, invalid page/size.
- Employer chỉ đọc/sửa/xóa Job thuộc Company mình có quyền.
- DTO, controller validation, source docs và Frontend view model khớp.

## Owner response

- Status: `Pending`
- Sort whitelist + behavior:
- Job status transition rules:
- Create/update required fields:
- Reviewer/date/PR/test evidence:
