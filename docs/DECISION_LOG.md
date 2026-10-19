# Decision Log — MatchaJob (SE347.R11, Nhóm 7)

> Chỉ ghi `Approved` khi có quyết định thực tế của nhóm kèm ngày/người duyệt/evidence. Bảng hiện tại là các quyết định cần review, không phải quyết định đã được chấp thuận.

| ID | Quyết định cần chốt | Căn cứ / tác động | Đề xuất để review | Owner quyết định / contributors | Status | Ngày duyệt | Evidence (meeting/PR/commit) |
|---|---|---|---|---|---|---|---|
| DEC-01 | Base path Backend | `context-path=/api`; Recruitment controller mapping có `/api/v1` | Giữ context `/api`; controller mapping là `/v1/...` | Vua Thanh Hóa; Việt Khang | Pending | | |
| DEC-02 | Public JSON naming | Job DTO camelCase; CV response snake_case; AI schema snake_case | Browser ↔ Backend camelCase; Backend ↔ AI Worker snake_case + explicit mapping | Việt Khang; all backend owners; FE owners | Pending | | |
| DEC-03 | Auth identity and role assignment | Auth Controller/JWT Security chưa tìm thấy; SQL ID namespaces khác nhau | JWT subject là User ID; resolve candidate/company profile ở Backend; không public self-register admin | Phúc Khang | Pending | | |
| DEC-04 | Error contract | AI Worker có ProblemDetail; Backend global handler needs parity/security review | Problem Details for public errors; không lộ stack/internal details | Phúc Khang; Việt Khang; Khải Vạn | Pending | | |
| DEC-05 | CV upload processing model | CV upload creates job; no background consumer/poller found in reviewed source | Chỉ giữ async 202 nếu executor có thật; otherwise choose synchronous MVP behavior | Đại Hưng; Tiểu pro; Khải Vạn | Pending | | |
| DEC-06 | Processing public DTO/state | ProcessingJob entity includes leaseToken/lastError | Public DTO exposes only safe status/timestamps/allowed attempts | Đại Hưng | Pending | | |
| DEC-07 | Application duplicate/state rules | Application controller not found in source audit | Define duplicate constraint, Job open check, CV ownership and allowed stage transitions | Đại Hưng; Phúc Khang; Vua Thanh Hóa | Pending | | |
| DEC-08 | Matching sync vs async | POST currently calculates immediately but returns 202; optional job ID random fallback/default text values | Remove random/demo fallback; status must reflect real execution model | Đại Hưng; Khải Vạn | Pending | | |
| DEC-09 | AI timeout/retry/provider behavior | connect/read timeout in source are 3000/5000 ms; provider/model behavior requires evidence | Run latency/error tests then approve values; retry only transient failures under idempotency constraints | Đại Hưng; Khải Vạn; Tiểu pro | Pending | | |
| DEC-10 | Match score semantics | Fixture values are illustrative; scoring weight/quality not established by fixture | AI owner documents actual algorithm/weights/evidence/evaluation before presenting score as model output | Khải Vạn; Đại Hưng | Pending | | |
| DEC-11 | Owner display names | Workbook names differ: `Khải Vạn`/`Vạn Khải`; `PN Thông`/`Nguyễn Thông` | Ask group to confirm canonical display names; don't assume identities | Việt Khang + group | Pending | | |
| DEC-12 | MVP boundary for Admin/Ranking/Statistics | Project docs contain wider feature vision than three demo flows | Mark each optional feature In MVP/Out of MVP via consensus and update `MVP_SCOPE.md` | Việt Khang + group | Pending | | |

## Decision record template

```text
Decision ID:
Decision:
Options considered:
Chosen option:
Rationale/evidence:
Affected endpoints/fixtures/tests:
Owner(s)/approver(s):
Date:
PR/commit/meeting note:
Follow-up task IDs:
```
