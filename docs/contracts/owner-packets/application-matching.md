# Owner packet — Application / Backend Matching

- **Owner theo workbook:** Đại Hưng
- **Reviewers đề xuất:** Phúc Khang, Vua Thanh Hóa, Khải Vạn, Việt Khang, PN Thông, Khanh
- **Trạng thái:** Matching route/service có một phần; Application CRUD/state workflow và ranking route chưa tìm thấy trong source audit.

## Endpoints and fixtures

| Route / design | Source status | Fixture |
|---|---|---|
| `POST /api/v1/applications` | Chưa tìm thấy controller | `../fixtures/application-create-request.json`, `../fixtures/application-create-response.json` (target) |
| `GET /api/v1/applications/me` | Chưa tìm thấy | Cần paged list fixture |
| Employer applications list/stage/history | Chưa tìm thấy đầy đủ | Cần list/stage-history fixtures |
| `POST /api/v1/applications/{applicationId}/match` | Source có; hiện có query `cvVersionId`, optional `jobId`, default job title/requirements và random UUID fallback | `../fixtures/matching-request.json` target; `../fixtures/ai-match-score-request.json` nội bộ Worker |
| `GET /api/v1/applications/{applicationId}/match` | Source có; response entity `MatchResult`, `breakdown` là String | `../fixtures/matching-response-current.json` current, `../fixtures/matching-response.json` target |
| `GET /api/v1/employer/jobs/{jobId}/ranking` | Chưa tìm thấy | Chốt có thuộc MVP; nếu yes phải tạo contract + fixture |

## Application business decisions

1. Nộp đơn yêu cầu Job status nào (có căn cứ enum hiện có: active/paused/closed/draft/pending) và deadline còn hiệu lực.
2. `candidateId` derive từ JWT → Candidate Profile, không nhận từ request body.
3. CV version phải thuộc đúng Candidate; lưu application gắn với bản CV cụ thể.
4. Duplicate policy và DB uniqueness; lỗi trả 409 hay idempotent success phải được thống nhất.
5. `stage` current schema values: `new`, `screening`, `testing`, `interview`, `offer`, `rejected`; owner phải định nghĩa allowed transitions, actor permissions và stage history.
6. Ranking tie-break deterministic; score null/PENDING/FAILED được hiển thị/排序 ra sao.

## Matching decisions

- Source `MatchController` gọi evaluate ngay trong POST nhưng trả 202; jobId có thể random nếu không truyền; title/requirements có giá trị demo mặc định. Không chấp nhận các fallback này trong contract đã freeze.
- Chọn sync flow cho MVP hoặc true async flow có Processing Job executor. Nếu sync, response status nói rõ kết quả sẵn sàng; nếu async, trả tracking ID/state và có consumer/polling.
- Backend public response dùng camelCase; AI Worker request/response nội bộ giữ snake_case và được mapping qua client DTO.
- Target `breakdown` phải là object theo DTO công khai, không JSON serialized string.
- Chấm điểm minh bạch: `overallScore`, `skillsScore`, `experienceScore`, `breakdown`, `rationale`; field semantics và scoring weights được Khải Vạn xác nhận, không tự bịa trọng số.

## Acceptance criteria

- Apply happy path persists one application; duplicate/rejected closed job/wrong owner invalid CV are tested.
- State transitions are validated and history is auditable.
- Matching uses a real stored Application/Job/CV relation; no random fallback ID or demo default job data.
- Current-source and target fixtures differ explicitly; target fixture and API test match approved DTO.
- Ranking only uses persisted matching results and handles missing/failed results according to an explicit rule.

## Owner response

- Status: `Pending`
- Application state transition table:
- Duplicate rule:
- Match sync/async decision:
- Ranking route and tie-break:
- Reviewer/date/PR/evidence:
