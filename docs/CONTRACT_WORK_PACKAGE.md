# Contract work package — steps 4–7

Tài liệu này là index cho phần hoàn thiện các bước 4–7 trong task của Việt Khang.

## Deliverables

1. `OWNER_CONTRACT_MATRIX.md` — master list các endpoint/module, source state, fixture và owner/reviewer.
2. `contracts/owner-packets/*.md` — checklist review theo Auth, Job, CV/Processing, Application/Matching, AI Worker, Frontend.
3. `INTEGRATION_CONTRACT.md` — URL/port/env, Backend–AI Worker schema, timeout/retry, Processing state.
4. `CONTRACT_BACKLOG.md` — tasks có priority, owner, reviewer, dependency, acceptance criteria và Definition of Done.
5. `CONTRACT_REVIEW_AND_FREEZE.md` — quy trình review, freeze gate, change control và bảng sign-off.
6. `DECISION_LOG.md` — quyết định chờ review, không giả lập approval.
7. `contracts/fixtures/manifest.json` + JSON fixtures — ví dụ current/target/source-aligned được phân loại.
8. `API_CONTRACT.md` — master convention links đến các artifacts liên quan.

## Current status

- Tài liệu/fixture đã chuẩn bị để review: **Yes**.
- Đã nhận xác nhận thực tế từ owner: **No evidence recorded yet**.
- Contract frozen: **No**.
- HTTP runtime verification: **chỉ đánh dấu theo kết quả thật trên môi trường có service chạy**.

## Recommended next action

Gửi `contracts/owner-packets/<domain>.md` cho từng owner tương ứng. Thu phản hồi `Agree` / `Change requested` / `Not in MVP`, ghi decisions vào `DECISION_LOG.md`, cập nhật fixtures/test/backlog cùng PR; sau đó chạy freeze gate trong `CONTRACT_REVIEW_AND_FREEZE.md`.
