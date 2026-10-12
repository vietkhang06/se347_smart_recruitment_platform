# Owner Contract Matrix — MatchaJob (SE347.R11, Nhóm 7)

- **Phiên bản:** Draft 0.1
- **Điều phối:** Việt Khang
- **Trạng thái:** Chờ owner review; chưa có xác nhận nào được tự động đánh dấu `Agree`.
- **Nguồn gốc:** workbook nhóm (`Phân Công`, `Tasks tuần`, `Bảng Tasks`), `docs/API_INVENTORY.md`, `docs/API_CONTRACT.md`, source Backend/AI Worker hiện có.

## 1. Cách đọc trạng thái

- **Có trong source:** route/DTO được tìm thấy bằng kiểm tra tĩnh; chưa đồng nghĩa đã HTTP smoke-test.
- **Target đề xuất:** thiết kế để review; chưa được coi là API đã triển khai.
- **Lệch contract:** có implementation nhưng path/DTO/status/security chưa thống nhất.
- **Chưa tìm thấy:** không tìm thấy route/controller tương ứng trong source được rà soát.
- **Owner review:** chờ người phụ trách phản hồi. Tài liệu này không giả lập kết quả trao đổi với thành viên.

## 2. Domain / endpoint ownership matrix

| Domain | Endpoint | Hiện trạng source | Contract / fixture cần chốt | Owner đề xuất từ workbook | Reviewer đề xuất | Trạng thái owner |
|---|---|---|---|---|---|---|
| Auth | `POST /api/v1/auth/register` | Chưa tìm thấy Auth Controller | `auth-register-request.json`, cần response + validation/error fixtures | Phúc Khang | Việt Khang; PN Thông; Khanh | Pending |
| Auth | `POST /api/v1/auth/login` | Chưa tìm thấy Auth Controller | `auth-login-response.json`, cần login request + 401/validation fixtures | Phúc Khang | Việt Khang; PN Thông; Khanh | Pending |
| Auth | `GET /api/v1/auth/me` | Chưa tìm thấy Auth Controller | Target current-user DTO và role/claims | Phúc Khang | Việt Khang; FE owners | Pending |
| Job | `GET /api/v1/jobs` | Có `JobController` + `PageResponse<JobSummaryResponse>`; mapping source hiện có khả năng lặp `/api` khi cộng context path | `job-search-response.json`; chốt query, sort whitelist, page/size, error behavior | Vua Thanh Hóa – Aka HGK | Việt Khang; PN Thông; Khanh | Pending |
| Job | `GET /api/v1/jobs/{jobId}` | Có `JobController` | Detail DTO; 404; trường nào được công khai | Vua Thanh Hóa – Aka HGK | Việt Khang; Khanh; PN Thông | Pending |
| Job | `GET /api/v1/categories`, `GET /api/v1/skills` | Có controller; cùng vấn đề prefix mapping | Fixture list; query `categoryId`, `q`; active/filter behavior | Vua Thanh Hóa – Aka HGK | Việt Khang; FE owners | Pending |
| Employer Job | `GET/POST /api/v1/employer/jobs`; `PUT/PATCH/DELETE /api/v1/employer/jobs/{id}` | Có controller; `companyId` nhận từ query/body; security cần hoàn thiện | Create/update/status request; authZ; conflict/validation; 201/200/204 | Vua Thanh Hóa – Aka HGK | Phúc Khang; Việt Khang; Khanh | Pending |
| CV storage | `POST /api/v1/candidates/{candidateId}/cv` | Có `CvController`; trả `snake_case`; giới hạn 10 MB, PDF/DOCX; access control cần xác nhận | `cv-upload-response-current.json` đối chiếu `cv-upload-accepted-response.json`; upload errors | Tiểu pro (storage theo sheet Phân Công) + Đại Hưng (CV/API workflow theo sheet Phân Công) | Việt Khang; Phúc Khang; Khải Vạn | Pending |
| CV read/list/download | `GET /api/v1/candidates/{candidateId}/cv`; `GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}` | List/version route có; chưa tìm thấy route download riêng; controller trả entity ở version detail | DTO công khai; ownership; file download content type/disposition; không lộ `filePath` | Đại Hưng + Tiểu pro | Phúc Khang; Việt Khang | Pending |
| Processing | `GET /api/v1/processing-jobs/{id}` | Có controller trả trực tiếp `ProcessingJob` entity | Public DTO chỉ gồm status cần thiết; không lộ `leaseToken`, `lastError` nội bộ; terminal/retry status | Đại Hưng | Tiểu pro; Khải Vạn; Việt Khang | Pending |
| Application | `POST /api/v1/applications` | Chưa tìm thấy application workflow controller | `application-create-request.json`, `application-create-response.json`; duplicate/open-job/CV permission rules | Đại Hưng | Phúc Khang; Vua Thanh Hóa; Việt Khang; FE owners | Pending |
| Application | `GET /api/v1/applications/me`, employer application list, stage update/history | Chưa tìm thấy các route trong source audit | List/filter, transition matrix, audit history, RBAC | Đại Hưng | Phúc Khang; Vua Thanh Hóa; Khanh; PN Thông | Pending |
| Matching (Backend public API) | `POST/GET /api/v1/applications/{applicationId}/match` | Có `MatchController`; POST đang thực thi service rồi trả `202`; `jobId` tùy chọn có fallback UUID ngẫu nhiên; entity response có `breakdown` kiểu String | `matching-request.json`, `matching-response-current.json`, `matching-response.json`; chốt sync/async và status | Đại Hưng | Khải Vạn; Việt Khang; Khanh | Pending |
| AI Worker | `GET /health`, `/health/live`, `/health/ready`, `/health/startup` | Có trong FastAPI source | Response model + 200/503 readiness behavior | Khải Vạn | Đại Hưng; Tiểu pro; Việt Khang | Pending |
| AI Worker | `POST /api/v1/cv/extract` | Có; multipart field `file`; validation PDF/DOCX, 10 MB, PDF tối đa 20 trang | Extraction response, 400/413; field `raw_text`, `parsed_data`, `char_count`, `page_count` | Khải Vạn | Đại Hưng; Tiểu pro | Pending |
| AI Worker | `POST /api/v1/embeddings` | Có; `texts` 1–100 entries; response dimension 1536 | Empty/list-bound behavior; metadata/model; provider behavior | Khải Vạn | Đại Hưng; Việt Khang | Pending |
| AI Worker | `POST /api/v1/match/score` | Có Pydantic schemas | `ai-match-score-request.json`, `ai-match-score-response.json`; scoring logic/evidence and deterministic tests | Khải Vạn | Đại Hưng; Việt Khang | Pending |
| Candidate Frontend | Auth/Profile/Job/CV/Application adapters | Source có mock/localStorage; chưa tìm thấy `VITE_API_BASE_URL` được dùng trong `frontend/src` | Screen-to-endpoint map, loading/empty/error, mapping DTO → view model | PN Thông (workbook khác chỗ ghi `Nguyễn Thông`) | Việt Khang; Auth/Job/CV owners | Pending — cần xác nhận tên hiển thị |
| Recruiter Frontend | Company/Job/Application/Ranking/Statistics adapters | Source có mock data; integration cần xác minh | Screen-to-endpoint map, sorting/filtering/state updates | Khanh | Việt Khang; Job/Application/Matching owners | Pending |

## 3. Owner packet checklist

Mỗi owner cần sửa/điền packet domain tương ứng trong `docs/contracts/owner-packets/`, rồi trả lời một trong ba trạng thái:

- `Agree`: xác nhận request/response, business rules và acceptance criteria.
- `Change requested`: nêu chính xác field/route/status/rule cần sửa và lý do.
- `Not in MVP`: nêu phần nào không thuộc MVP; người điều phối cập nhật `MVP_SCOPE.md` và backlog.

Không dùng `Agree` nếu mới review tài liệu mà chưa kiểm tra DTO/code thuộc phạm vi mình phụ trách. Đối với route có trong source, cần phân biệt review static với smoke-test runtime.

## 4. Trường bắt buộc owner xác nhận cho từng endpoint

1. Method + path đầy đủ sau khi ghép base path.
2. Authentication/role và ownership rule.
3. Query/path/body: field, type, required/optional, validation, enum.
4. Success status + response DTO + fixture.
5. Error status + `application/problem+json` fixture cho case quan trọng.
6. Business rule/idempotency/state transition.
7. Source DTO/controller hoặc task triển khai nếu chưa có.
8. Test cụ thể và evidence (test output, HTTP request/response hoặc PR).

## 5. Trạng thái tổng hợp

**Chưa owner nào được ghi nhận `Agree` trong bộ artifact này.** Các owner packets là bộ hồ sơ chuẩn bị sẵn từ source/workbook để gửi thành viên review; chưa phải phản hồi thực tế của họ.
