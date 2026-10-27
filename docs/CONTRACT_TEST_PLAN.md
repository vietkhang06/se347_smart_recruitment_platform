# Contract Test Plan — MatchaJob (SE347, Nhóm 7)

> Matching task cập nhật 27/10/2026: xem MATCHING_TASK_COPY_GUIDE_VI.md và MATCHING_RESULT_API_AND_CV_JD_UI.md. scripts/contract-tests/test_matching_contract.py hiện kiểm tra schema thật và có --java-artifacts; test_matching_live.py là nghiệm thu HTTP có mutation test data. Nội dung ngày 12/10 bên dưới là lịch sử audit, không được dùng để kết luận endpoint hiện tại còn thiếu.

- **Version:** Draft 0.1
- **Date:** 2026-10-12
- **Responsible:** Việt Khang — MVP Scope + API Convention + Integration Contract
- **Status:** Automated fixture/schema tests are implemented and executed; live HTTP smoke is blocked until local services are started; Backend Maven test command is blocked because the Maven Wrapper distribution could not be downloaded in the current environment.
- **Related documents:** `API_INVENTORY.md`, `MVP_SCOPE.md`, `API_CONTRACT.md`, `OWNER_CONTRACT_MATRIX.md`, `INTEGRATION_CONTRACT.md`, `CONTRACT_BACKLOG.md`, `CONTRACT_REVIEW_AND_FREEZE.md`, `DECISION_LOG.md`, `contracts/fixtures/README.md`, `contracts/fixtures/manifest.json`.

## 1. Purpose and boundaries

This step checks that examples and source-aligned contracts are internally consistent and provides repeatable commands for HTTP verification. It deliberately distinguishes:

1. **Fixture/schema tests:** run locally without Docker, PostgreSQL, credentials, or external provider calls. These validate JSON syntax, selected response shapes, and the AI Worker Pydantic request/response models.
2. **HTTP smoke checks:** run against a live local deployment and exercise read-only endpoints. The script must report unavailable services as `BLOCKED`, not as product failures.
3. **MVP end-to-end acceptance:** requires owner-approved contracts and a working database/services. It is a manual integration gate; it is not claimed as passed by the fixture tests.

Fixtures use synthetic IDs, emails, text and illustrative scores. They are not database seed data and must not be loaded into a real database.

## 2. Automated tests delivered

### 2.1 Fixture/schema tests

File: `ai-worker/tests/test_contract_fixtures.py`

The tests cover:

- Every `*.json` file in `docs/contracts/fixtures/` parses as valid JSON.
- `ai-match-score-request.json` validates against `MatchScoreRequest` from `ai-worker/app/schemas/ai.py`.
- `ai-match-score-response.json` validates against `MatchScoreResponse`, including score bounds `0..100`.
- `job-search-response.json` has the keys/types of the existing `PageResponse<JobSummaryResponse>` / `CategoryResponse` DTOs.
- The current CV controller shape (snake_case) and proposed public CV contract (camelCase) are recorded as two different fixtures instead of being silently treated as equivalent.
- The current `MatchResult.breakdown` string and proposed matching DTO's object shape are both recorded and tested as an intentional known difference.
- Auth and Application examples stay explicitly categorized as target contracts, not as implemented endpoints.
- Job create request/response fixture fields are checked against the current Java DTO field shape; this is a static contract-shape check, not a live Backend test.
- Proposed Auth fixtures and AI CV extraction response shape are checked for required fields and consistency (including `char_count`).

Run from the repository root:

```bash
python -m pytest -q ai-worker/tests
```

Or run from `ai-worker/`:

```bash
python -m pytest -q
```

### 2.2 Read-only HTTP smoke test

File: `scripts/contract-tests/smoke_http.py`

Default endpoints:

| Service | Request | Expected result |
|---|---|---|
| AI Worker | `GET http://localhost:8001/health` | `200`, JSON `status=healthy` |
| AI Worker | `GET http://localhost:8001/health/ready` | `200`, JSON `status=ready` |
| AI Worker | `GET /__contract_test_not_found__` | `404`, `application/problem+json`, problem fields including `status`, `title`, `detail` |
| Backend | `GET http://localhost:8081/api/v1/jobs?page=0&size=1` | `200`, `PageResponse` shape |
| Backend | `GET http://localhost:8081/api/v1/categories` | `200`, JSON array |
| Backend | `GET http://localhost:8081/api/v1/skills` | `200`, JSON array |

The script also probes the historically observed double-prefix Job route as a diagnostic. It emits a warning if the double-prefix route returns `200`; the preferred fix is to correct controller mappings, not to adopt `/api/api/v1/...` as the public API.

Run after the application is started:

```bash
python scripts/contract-tests/smoke_http.py
```

Optional flags:

```bash
python scripts/contract-tests/smoke_http.py --no-backend
python scripts/contract-tests/smoke_http.py --no-ai
python scripts/contract-tests/smoke_http.py --backend-base http://localhost:8081/api --ai-base http://localhost:8001
```

The script intentionally does **not** call auth/application endpoints that are not present in the source audit, upload files, mutate jobs, create applications, or call AI match scoring. It therefore creates no database records and does not use a provider API key.

## 3. Contract alignment matrix

| Contract/flow | Automated fixture coverage | HTTP test | Current known limitation | Owner to confirm |
|---|---|---|---|---|
| AI Worker match-score schema | Pydantic request/response model tests | Existing FastAPI tests exercise `/api/v1/match/score` in-process | Response examples do not prove model quality; provider implementation/config still needs verification | Khải Vạn |
| AI Worker health/error envelope | Existing tests exercise health and 404 via FastAPI TestClient | Smoke script checks health, readiness and unknown route when live | Container is not running in the current verification environment | Khải Vạn / Tiểu pro |
| Job list response shape | Static shape test against fields from Java DTO source | Live GET test provided | Existing `JobController` mapping `/api/v1/jobs` conflicts with context path `/api` | Vua Thanh Hóa |
| Category/Skill list | Job/category/skill DTO source inspected; JSON array expectation in HTTP script | Live GET tests provided | Existing controller mappings have the same context-path risk as Job | Vua Thanh Hóa |
| CV upload public contract | Current-source and target-contract fixtures both recorded | Not called by default because it writes a file and DB rows | Current response uses snake_case and controller uses `/{candidateId}/cv`; target contract uses camelCase and `/me/cvs`. Background execution was not confirmed | Tiểu pro / Đại Hưng |
| Matching public contract | Current entity and target response fixture shapes tested as intentionally different | Not called by default because it writes a match result and may invoke AI Worker | Current route uses query parameters, returns entity and declares `breakdown` as String; controller returns `202` after invoking evaluation in request | Đại Hưng / Khải Vạn |
| Auth | Target fixture shape only | Not run; no Auth controller found in inspected Backend source | Not implemented/found in reviewed source | Phúc Khang |
| Application | Target fixture shape only | Not run; no Application create/list/stage controller found in inspected Backend source | Not implemented/found in reviewed Backend source | Đại Hưng |

## 4. Manual acceptance scenarios for the three MVP flows

Run only after the relevant endpoints exist, contracts have been approved, and a test database is available. Use controlled test accounts and files. Keep secrets and real CVs out of repository fixtures.

### Flow A — Candidate searches and applies

1. Register/login, then call `GET /auth/me` with the issued Bearer token.
2. Search jobs with pagination and at least one filter, then open one job detail.
3. Upload or select a CV using an approved API; read its processing job until terminal state.
4. Create an application with the approved CV version/snapshot.
5. Submit the same application again and verify the documented duplicate policy/status code.
6. Query candidate application history and verify IDs/stage/timestamps match the created resource.

### Flow B — Employer manages jobs and candidates

1. Authenticate as an employer and verify access to only the employer's authorized company.
2. Create/update/pause/close a job using approved status transitions.
3. Verify public job search does not show non-active jobs unless the contract explicitly says otherwise.
4. List applicants for an owned job, read the allowed CV/application details and update a valid stage transition.
5. Repeat a sensitive request using another employer's resource ID and verify access is denied without leaking resource data.

### Flow C — CV/JD matching and ranking

1. Submit a matching request against an existing application/job/CV snapshot.
2. Verify the HTTP status agrees with the selected sync/async contract; for async, a real processing resource and consumer must exist.
3. Verify score types/ranges, breakdown type, rationale and timestamps match the approved DTO.
4. Verify retry/provider failure behaviour and that no provider secret or stack trace reaches the client.
5. Request ranking for a job and verify ordering/tie-break policy only after the product owner has approved that rule.

No scenario above is marked as passed by this document. Record result, environment, commit hash and evidence when each owner runs it.

## 5. Execution record (2026-10-12)

| Check | Result | Evidence / interpretation |
|---|---|---|
| AI Worker test suite including the new fixture tests | **PASS — 23 passed** | Ran `python -m pytest -q tests` from `ai-worker/`; 23 tests passed, including three additional fixture-shape checks for Job DTO, Auth target fixtures and AI CV extraction response. No external provider request was made by these fixture tests. |
| Read-only local HTTP smoke test | **BLOCKED — 5 checks could not connect** | Ran `python scripts/contract-tests/smoke_http.py`; `localhost:8001` and `localhost:8081` refused connections because the services were not running in the execution environment. This is not a product endpoint failure/pass. |
| Backend Maven unit tests | **BLOCKED — wrapper bootstrap** | `bash backend/mvnw -q test` could not fetch the Maven Wrapper distribution (`repo.maven.apache.org` unavailable in this environment). Backend test assertions were not executed. |
| Backend/PostgreSQL integration tests | **NOT RUN** | Requires Docker/PostgreSQL and explicit integration-test profile; do not infer a pass. |
| Full three-flow end-to-end | **NOT RUN** | Auth/Application APIs and some cross-service contracts remain proposed/gapped, and local services were not running. |

## 6. Release gate before freezing the contract

- [ ] Owner approves each endpoint marked `target-contract` or updates its status after implementation.
- [ ] The Job/Category/Skill canonical paths return `200` at `/api/v1/...`; no one relies on the double-prefix path.
- [ ] Current/target CV and Matching fixture differences are resolved in code, or intentionally retained and documented.
- [ ] HTTP smoke checks pass against the same commit intended for integration.
- [ ] Backend unit tests and database-backed integration tests run in an environment with Maven dependencies and PostgreSQL available.
- [ ] Candidate, Employer, and matching MVP flows pass with controlled test accounts and test documents.
- [ ] `API_CONTRACT.md`, fixtures, automated checks and API implementation are updated together in PRs.
- [ ] Việt Khang records reviewer approvals and decision-log outcomes before changing contract status to Approved/Frozen.
