# API Contract Backlog — MatchaJob (SE347.R11, Nhóm 7)

- **Backlog owner:** Việt Khang
- **Trạng thái:** Đề xuất để nhập/cập nhật vào tracker của nhóm; không có ngày hoàn thành được tự đặt.
- **Nguồn:** API Inventory, API Contract, Integration Contract, workbook (`Phân Công`, `Tasks tuần`, `Bảng Tasks`).

## Quy ước

- `P0`: chặn các module tích hợp / luồng MVP; xử lý đầu tiên.
- `P1`: bắt buộc để hoàn tất MVP vertical slice.
- `P2`: cải thiện có thể sau các blocker P0/P1 nếu được nhóm chấp thuận.
- Status ban đầu `Proposed` / `Blocked` phản ánh chờ xác nhận hoặc phụ thuộc; không phải ai đó đã nhận/đã làm xong.
- Dependency là dependency kỹ thuật/nghiệp vụ, không thay thế việc xác nhận của owner.

## Backlog tasks

| ID | Pri | Task / deliverable | Owner | Reviewer | Dependencies | Acceptance criteria (AC) | Definition of Done (DoD) | Status |
|---|---|---|---|---|---|---|---|---|
| CT-01 | P0 | Sửa base path cho Job, Employer Job, Category, Skill | Vua Thanh Hóa – Aka HGK | Việt Khang; PN Thông; Khanh | Quyết định C-01 trong `API_CONTRACT.md` | URL ngoài dùng `/api/v1/...`; không lặp `/api`; query Job vẫn hoạt động | Controller mappings sửa; test route/service; smoke-test canonical URL; docs/fixture cập nhật cùng PR | Proposed |
| CT-02 | P0 | Chốt Auth request/response, claims, roles và register policy | Phúc Khang | Việt Khang; PN Thông; Khanh | User/Role/CandidateProfile/Company ERD | Register/login/me có contract, password rules, token claims, 401/403 và role assignment rõ; client không tự đăng ký `admin` | DTO/controller/security config + tests hoặc task implementation được chia; auth fixtures và OpenAPI/tài liệu khớp | Proposed |
| CT-03 | P0 | Triển khai/kiểm tra JWT + RBAC và ownership guard | Phúc Khang | Việt Khang; Đại Hưng; Vua Thanh Hóa | CT-02; identity mapping `users.id` → Candidate/Company profile | Candidate/Employer chỉ truy cập tài nguyên thuộc phạm vi mình; lỗi 401/403 có test | Security tests bao gồm IDOR/role; no secrets in response/log; PR review xong | Blocked |
| CT-04 | P1 | Freeze Job DTO/query/sort/status/error contract | Vua Thanh Hóa – Aka HGK | Việt Khang; PN Thông; Khanh | CT-01; enums/database schema hiện có | Required/optional fields, allowed sort values, page/size, create/update/status transition và error cases được chốt | Fixtures success/error + contract tests; owner sign-off recorded; API Inventory cập nhật | Blocked |
| CT-05 | P1 | Chuẩn hóa CV upload/list/detail/download và public DTO | Tiểu pro (storage) + Đại Hưng (CV API) | Phúc Khang; Việt Khang; Khải Vạn | CT-03; storage rules/AI extraction limits | PDF/DOCX <=10 MiB; empty/invalid/oversize reject; ownership verified; DTO không lộ `filePath`; download response được xác định | CV current/target fixtures; tests cho validation/auth; download endpoint/contract được chốt hoặc loại khỏi MVP có lý do | Proposed |
| CT-06 | P0 | Hoàn thiện Processing Job executor/worker loop hoặc chốt synchronous CV flow | Đại Hưng | Tiểu pro; Khải Vạn; Việt Khang | CT-05; Integration Contract | Với async: job `PENDING` thực sự được claim/process; retry/lease/restart behavior test được. Với sync: status/body khớp kết quả thực tế | Có consumer/poller tests hoặc thay đổi flow sync; không còn thông điệp “queued” khi không có executor; runtime evidence | Blocked |
| CT-07 | P1 | Public Processing Job DTO + transitions | Đại Hưng | Tiểu pro; Việt Khang; Phúc Khang | CT-06 | `PENDING→PROCESSING→COMPLETED/FAILED`; retry path rõ; `leaseToken` và raw internal error không lộ | DTO/enum/transition tests + fixture; API docs cập nhật | Blocked |
| CT-08 | P0 | Chốt Application contract và state machine | Đại Hưng | Phúc Khang; Vua Thanh Hóa; Việt Khang; FE owners | CT-03; Job status; CV/version contract | Apply chỉ với Job hợp lệ đang nhận hồ sơ, CV thuộc applicant; duplicate được chặn; stage transition/historical audit quy định rõ | Controller/service/DB constraint/tests hoặc tasks con có owner; request/response/error fixtures khớp; FE flow map cập nhật | Proposed |
| CT-09 | P0 | Sửa Matching sync/async semantics và loại bỏ default/random business data | Đại Hưng | Khải Vạn; Việt Khang; Khanh | CT-06/CT-07 quyết định async; AI schema CT-10; CT-08 application relationship | POST status phản ánh xử lý thật; `jobId` lấy từ Application/Job đã tồn tại; không sinh UUID giả; GET result 404/200 đúng | Integration tests; no random fallback/default title/requirements; response `breakdown` type nhất quán; fixtures cập nhật | Proposed |
| CT-10 | P1 | AI Worker CV/JD schema, scoring contract và evaluation fixture | Khải Vạn | Đại Hưng; Việt Khang | MVP matching criteria; provider/config behavior | Pydantic schema validation có positive/negative cases; scores 0–100; breakdown/evidence/rationale semantics được mô tả; không tuyên bố quality nếu chưa có evaluation | Unit/evaluation test + fixture + ghi rõ scoring method, expected result, limitations | Proposed |
| CT-11 | P1 | Chốt timeout/retry/idempotency giữa Backend và AI Worker | Đại Hưng | Khải Vạn; Tiểu pro; Việt Khang | CT-06; CT-09 | Connect/read timeouts có lý do và test; retry không lặp side effects; transient vs permanent errors phân biệt | Config/profile và retry test; decision log ghi con số đã duyệt; no secret in logs | Proposed |
| CT-12 | P1 | Candidate Frontend service adapters + màn hình–API mapping | PN Thông (tên hiển thị cần xác nhận so với `Nguyễn Thông` trong sheet khác) | Việt Khang; Phúc Khang; Vua Thanh Hóa; Đại Hưng | CT-02, CT-04, CT-05, CT-08 | Luồng MVP dùng adapter/base URL; không dùng `mockStore` trực tiếp trong happy path; loading/empty/error states hiện đầy đủ | FE tests/manual evidence; adapter fixture khớp API contract; owner reviewer chấp thuận | Blocked |
| CT-13 | P1 | Recruiter Frontend service adapters + ranking/list state mapping | Khanh | Việt Khang; Vua Thanh Hóa; Đại Hưng; Khải Vạn | CT-04, CT-08, CT-09, CT-10 | Job/application/ranking screens gọi adapter; filter/sort/status update mapping đúng response contract | FE tests/manual flow evidence; mock mode tách khỏi API mode; no UI-only fake success | Blocked |
| CT-14 | P1 | Chuẩn hóa Problem Details và validation errors cho Backend | Phúc Khang | Việt Khang; từng Backend owner | Convention error C-05 | Lỗi public có status/title/detail/instance; không lộ stack trace, `filePath`, token/secret; validation fields đủ dùng | Exception handler tests và fixtures 400/401/403/404/409/413/415/500 | Proposed |
| CT-15 | P1 | CORS, runtime env và service health integration smoke test | Tiểu pro (Compose/env) + Phúc Khang (Backend config) | Việt Khang; Đại Hưng; Khải Vạn; FE owners | CT-01; environment vars; service startup | Compose config valid; host/container URL đúng; browser origin được phép; Backend–DB/AI Worker health verified | Kèm lệnh chạy + kết quả thật; lỗi blocked được ghi rõ, không đánh dấu PASS khi service không chạy | Proposed |
| CT-16 | P1 | Contract test suite: fixture ↔ DTO/Pydantic ↔ endpoints | Việt Khang (coordination), domain owners maintain tests | Từng owner domain | CT-02, CT-04–CT-10 quyết định/fixtures | Mỗi target contract có test hoặc trạng thái pending rõ; current-source divergence test không bị xóa để che lệch | CI chạy; test names/cases/map manifest; review evidence được ghi | In Progress |
| CT-17 | P2 | OpenAPI/contract artifact sync và release version | Việt Khang + Backend owners | Toàn bộ owners | CT-01–CT-16 stabilized | Một nguồn contract versioned; route/schema diffs được review; API deprecation/change policy rõ | `API_CONTRACT.md`, fixtures, generated/openapi docs (nếu đã thêm), tests cùng PR; version/tags rõ | Proposed |
| CT-18 | P1 | Owner review, decision log và freeze contract | Việt Khang | Tất cả domain owners + Frontend representatives | CT-01–CT-17; no unresolved P0 | Từng domain có trạng thái Agree/Change requested/Not in MVP; unresolved items có owner/date/impact; FE confirms adapters possible | Biên bản review, `DECISION_LOG.md`, `API_CONTRACT.md` status/version, freeze commit/PR evidence | Blocked |

## Dependency order recommended

1. **CT-01 + CT-02 + decision on CT-06/CT-09**: path, auth/identity, sync/async architecture.
2. **CT-04 + CT-05 + CT-08 + CT-10**: Job/CV/Application/AI schemas and business rules.
3. **CT-03 + CT-06 + CT-07 + CT-09 + CT-11 + CT-14**: implementation and security/integration behavior.
4. **CT-12 + CT-13 + CT-15 + CT-16**: Frontend adapters and runtime/automated verification.
5. **CT-18 then CT-17 release tag**: freeze only after owner reviews and critical tests.

## Backlog entry template for any new task

```text
ID:
Title:
Scope / non-scope:
Owner:
Reviewer:
Dependencies:
Contract / fixture affected:
Acceptance criteria:
Definition of Done:
Evidence (PR/test/output):
Status: Proposed | Ready | In Progress | Blocked | Review | Done
```

## Governance note

Owner names above are taken from or mapped to the workbook. `Khải Vạn` versus `Vạn Khải`, and `PN Thông` versus `Nguyễn Thông`, appear inconsistently in the workbook/docs; the group should confirm preferred display names rather than assuming they are aliases. No task is marked complete just because this backlog has been drafted.
