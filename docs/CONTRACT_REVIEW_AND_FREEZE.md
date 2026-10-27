# API Contract Review & Freeze Procedure — MatchaJob

- **Điều phối:** Việt Khang
- **Trạng thái hiện tại:** `DRAFT / NOT FROZEN`
- **Lý do:** tài liệu chuẩn bị review đã có, nhưng chưa có phản hồi owner được ghi nhận trong artifact và runtime smoke tests còn cần chạy trên máy có service hoạt động.

## 1. Mục tiêu buổi review

Kết thúc buổi review, nhóm cần biết rõ:

1. Endpoint nào tồn tại và sẽ được giữ/sửa; endpoint nào cần implement; endpoint nào không nằm trong MVP.
2. Mỗi endpoint có method/path/auth/request/response/status/error/validation/business rule và fixture được một owner xác nhận.
3. Backend và AI Worker thống nhất schema, timeout/retry/idempotency/processing state.
4. Frontend xác nhận mapping màn hình → adapter → endpoint, bao gồm loading/empty/error states.
5. Các quyết định còn tranh luận được ghi trong `DECISION_LOG.md`, có người chịu trách nhiệm và hạn xử lý do nhóm thống nhất.

## 2. Người review theo domain

| Domain | Primary owner | Required reviewers | Bắt buộc kiểm tra |
|---|---|---|---|
| API convention/MVP/integration governance | Việt Khang | Tất cả owner domain | Không mâu thuẫn giữa MVP, contract, fixture và backlog |
| Auth/User/Profile/Company/JWT | Phúc Khang | Việt Khang; PN Thông; Khanh | Auth flow, claims, role policy, ID mapping, 401/403 |
| Job/Category/Skill/search | Vua Thanh Hóa – Aka HGK | Việt Khang; PN Thông; Khanh | Base path, query/filter/sort/page, job lifecycle, DTO |
| CV storage/upload/download | Tiểu pro | Đại Hưng; Phúc Khang; Việt Khang | PDF/DOCX, max size, file response, permission, no internal path |
| CV/Processing/Application/Matching Backend | Đại Hưng | Phúc Khang; Tiểu pro; Khải Vạn; Việt Khang; FE owners | state machine, duplicate application, processing executor, status semantics |
| AI Worker schemas/scoring | Khải Vạn (display name to confirm) | Đại Hưng; Việt Khang | CV/JD schema, scoring fields, rationale/evidence, validation, provider behavior |
| Candidate Frontend | PN Thông (display name to confirm) | Việt Khang + API owners | Auth/Job/Profile/CV/Application service adapter; no direct mockStore in MVP happy path |
| Recruiter Frontend | Khanh | Việt Khang + API owners | Job management, application list/stage, matching/ranking adapter |
| Infrastructure/Compose/env | Tiểu pro | Phúc Khang; Đại Hưng; Khải Vạn; Việt Khang | URL/port, env vars, CORS, service health, startup instructions |

## 3. Review protocol

### Before meeting

- [ ] Việt Khang posts links to `API_CONTRACT.md`, `OWNER_CONTRACT_MATRIX.md`, `INTEGRATION_CONTRACT.md`, backlog and owner packet files.
- [ ] Each owner reviews only their domain and marks each contract item `Agree`, `Change requested`, or `Not in MVP`.
- [ ] For every `Change requested`, include old value, proposed new value, reason, affected fixture/test/consumer, and whether it blocks MVP.
- [ ] Frontend owners map each MVP screen/action to exact API method/path and expected UI states.
- [ ] Owners identify which existing routes were runtime-tested; static source inspection must not be reported as runtime evidence.

### During meeting

1. Start with P0 decisions: Backend base path, Auth/JWT identity mapping, CV async executor, Matching sync/async semantics.
2. Review request/response/validation and failure responses by domain, not by file author.
3. Confirm business rules: job must accept applications, one-application rule, CV ownership, permitted Application stage transitions.
4. Confirm inter-service details: internal URL, port, environment names, read/connect timeouts, retry policy, idempotency and failure status.
5. Record each decision immediately in `DECISION_LOG.md`; don't leave a verbal-only decision.
6. Identify PR/task owner and reviewer for each `Change requested` item.

### After meeting

- [ ] Owners update their packet and fixtures.
- [ ] Việt Khang synchronizes the master `API_CONTRACT.md` and `manifest.json`.
- [ ] Related tests are changed in the same PR as contract changes.
- [ ] CI/static tests pass; smoke test results are attached for the endpoints reachable in the shared environment.
- [ ] Decision log records approval date, approvers and PR/commit evidence.

## 4. Freeze gate — criteria that must all pass

- [ ] No unresolved P0 decision: base path, auth/identity, CV processing model, matching status semantics.
- [ ] Every in-scope endpoint has method/path/auth/request/response/success/error/validation described.
- [ ] Auth, Job, CV, Application, Matching and AI Worker fixtures match the approved contract version.
- [ ] Owner review has an explicit status for every domain; `Change requested` items are resolved or explicitly moved out of MVP by team decision.
- [ ] Frontend owners confirm they can integrate using the shared API client/adapters without relying on guessed fields.
- [ ] Backend owners confirm DTO/controller/security implementation plan; AI Worker owner confirms Pydantic schema and scoring response.
- [ ] Runtime status is accurately reported: PASS, FAIL, or BLOCKED with reason; no fake PASS.
- [ ] CI contract/fixture tests pass; endpoints missing from implementation remain marked `not implemented` rather than inferred as complete.
- [ ] `API_CONTRACT.md`, `manifest.json`, fixtures, tests and decision log are consistent.
- [ ] Freeze version, date, approval names and PR/commit link recorded.

## 5. Freeze labels

- `Draft`: being authored; decisions may change.
- `In Review`: owners reviewing; not safe to implement against without acknowledging draft status.
- `Approved`: owners have reviewed; critical decisions resolved; owner names/date/evidence recorded.
- `Frozen vX.Y`: contract version used for integration; changes require change request and review.
- `Superseded`: replaced by a later frozen version, with migration notes if consumers are impacted.

## 6. Change-control protocol after freeze

Every breaking or material change must include:

1. Change request ID and reason.
2. Affected endpoints/fields/enums/status codes/consumers.
3. Compatibility impact and migration plan.
4. Updated fixtures and automated tests.
5. Approval by the endpoint owner and at least one consumer owner; Việt Khang maintains the master index.
6. A version decision: patch for clarifications/non-breaking additions; minor for compatible additions; major for breaking changes. The team must approve this scheme during review.
7. Merge PR only after the change is reflected in all contract artifacts and integration tests.

## 7. Review result form (do not pre-fill as approved)

| Domain | Owner | Review status (`Agree` / `Change requested` / `Not in MVP`) | Changes/blockers | Reviewer(s) | Date | PR/commit/evidence |
|---|---|---|---|---|---|---|
| Auth | Phúc Khang | Pending | | | | |
| Job/Category/Skill | Vua Thanh Hóa – Aka HGK | Pending | | | | |
| CV storage | Tiểu pro | Pending | | | | |
| CV/Application/Processing/Matching Backend | Đại Hưng | Pending | | | | |
| AI Worker | Khải Vạn — confirm display name | Pending | | | | |
| Candidate UI adapter | PN Thông — confirm display name | Pending | | | | |
| Recruiter UI adapter | Khanh | Pending | | | | |
| Integration/overall | Việt Khang | Pending | | | | |

## 8. Initial review agenda decision list

1. **C-01 Base path:** keep context path `/api`; fix Recruitment controller mappings to `/v1/...`.
2. **C-02 Public JSON naming:** `camelCase` for Browser ↔ Backend; preserve current AI Worker `snake_case` between services unless owner proposes a mapping change.
3. **C-03 Auth:** JWT subject is `users.id`; backend resolves Candidate Profile/Company profile; client cannot choose privileged role.
4. **C-04 CV upload:** keep async response only if an executor/poller actually processes jobs; otherwise choose a synchronous implementation for the MVP and document status accurately.
5. **C-05 Matching:** decide sync `200` result vs true async `202` tracking resource; no random fallback Job ID or demo default job title/requirements.
6. **C-06 Error schema:** agree Problem Details format across Backend and AI Worker; don't leak internal stack/error fields.
7. **C-07 Application rules:** one application per candidate/job, job-open validation, CV ownership, allowed stage transitions/history.
8. **C-08 timeout/retry:** current Backend AI Worker connect/read timeout are 3000/5000 ms; validate read timeout against actual CV/LLM latency.
9. **C-09 score semantics:** owner must describe score scale, breakdown and evidence; synthetic fixture score does not prove model quality.
10. **C-10 names in source workbook:** confirm whether `Khải Vạn`/`Vạn Khải` and `PN Thông`/`Nguyễn Thông` are just display-name inconsistencies before consolidating tracker names.

**Current result:** all items remain `Pending` until the group supplies actual review responses. This is a prepared freeze procedure, not a record of approvals.
