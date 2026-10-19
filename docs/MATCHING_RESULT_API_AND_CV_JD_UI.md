# MatchaJob — Matching Result API + CV–JD Detail UI

**Status:** Implementation candidate for review; not yet runtime-verified against the team's live database/AI Worker.

## 1. API contract

Base URL in local development: `http://localhost:8080/api` (Spring `server.servlet.context-path=/api`). The route mapping itself starts at `/v1`; do not include `/api` inside controller `@RequestMapping` declarations.

### Read a result or processing state

```http
GET /api/v1/applications/{applicationId}/match
Authorization: Bearer <JWT>
Accept: application/json
```

A known application returns HTTP `200 OK` whether a score has been produced yet or not. Use `status` to determine whether score fields are available:

- `NOT_STARTED`: no matching result or processing job was found.
- `PENDING`: a matching processing job is queued.
- `PROCESSING`: a matching processing job is being processed.
- `COMPLETED`: a persisted result is available.
- `FAILED`: processing failed, or a processing job says it completed but the database has no result.

Errors: `401` missing/invalid JWT, `403` the authenticated user is neither the candidate who applied nor an employer authorized for the job, `404` application not found.

### Trigger a matching evaluation

```http
POST /api/v1/applications/{applicationId}/match
Authorization: Bearer <JWT>
Accept: application/json
```

The route is synchronous today and returns `200 OK` after a score is received and persisted. It uses the persisted application, `application_cv_snapshots` CV version and database Job fields. The caller cannot override `cvVersionId`, `jobId`, job title or JD content through query parameters.

- `409 Conflict` (`MATCHING_NOT_READY`) if the application's CV snapshot is missing or extraction has not populated `raw_text`.
- `404 Not Found` if the application or Job does not exist.
- `403 Forbidden` if the user cannot access the application.
- `500` for unexpected AI Worker failures or an invalid worker response (the existing global handler emits a sanitized Problem Details body).

The existing `POST /applications` path creates a `processing_jobs` row with `job_type=APPLICATION_MATCHING`. This implementation does not claim an asynchronous matching worker exists: the explicit POST above performs a synchronous evaluation, moves the row to `PROCESSING`, and marks it `COMPLETED` on a saved result. If the call fails, the service records a failure and applies the existing retry/backoff policy for connection errors and AI Worker 5xx responses. GET reports PENDING/PROCESSING/FAILED when no result exists and the processing row is in those states. An existing saved result takes precedence and reconciles a stale processing row to COMPLETED.

## 2. Public response DTO

Scores are JSON numbers in the range `0..100`. Scores are `null` until `status=COMPLETED`; never coerce a missing score to `0`.

```json
{
  "applicationId": "77777777-7777-4777-8777-777777777777",
  "jobId": "22222222-2222-4222-8222-222222222222",
  "cvVersionId": "55555555-5555-4555-8555-555555555555",
  "status": "COMPLETED",
  "overallScore": 82,
  "skillsScore": 78,
  "experienceScore": 88,
  "criteriaScores": { "skills": 78, "experience": 88 },
  "matchedSkills": ["Java", "Spring Boot", "PostgreSQL"],
  "missingSkills": ["Kubernetes"],
  "breakdown": {
    "requiredSkills": ["Java", "Spring Boot", "PostgreSQL", "Kubernetes"],
    "matchedSkills": ["Java", "Spring Boot", "PostgreSQL"],
    "missingSkills": ["Kubernetes"],
    "candidate_experience_years": 4
  },
  "explanation": "Candidate matches core requirements; Kubernetes should be verified.",
  "processingJobId": null,
  "evaluatedAt": "2026-10-18T10:00:00Z",
  "message": "Matching result is complete."
}
```

`matching-result-completed.json` and `matching-result-pending.json` are **fixtures only**; they are not an actual score for a real candidate.

## 3. Mapping between layers

| Layer | Field names | Mapping rule |
|---|---|---|
| AI Worker `MatchScoreResponse` | `overall_score`, `skills_score`, `experience_score`, `breakdown`, `rationale` | Existing Pydantic response remains snake_case. The `breakdown` can include `required_skills_matched` and `missing_skills`. |
| Backend client DTO | `@JsonProperty` maps the above snake_case names to Java fields | `MatchScoreResponse` is an internal integration DTO, not returned directly to Frontend. |
| Backend public DTO | `overallScore`, `skillsScore`, `experienceScore`, `criteriaScores`, `matchedSkills`, `missingSkills`, `explanation`, `status` | `MatchingResultMapper` normalizes variants such as `required_skills_matched`, `matched_skills`, `requiredSkillsMatched` into `matchedSkills`; derives missing skills when required and matched lists permit it. |
| Frontend | camelCase matching DTO | `apiApplicationService.getMatchingResult()` maps the canonical contract and keeps `null` scores null. The modal renders status, scores, matched/missing skills and explanation. |

No scoring weights are introduced by the API mapping. Score calculations remain owned by the AI Worker provider.

## 4. Authorization and data ownership

- Both endpoints require JWT authentication through the existing default-deny Spring Security chain.
- `ResourceOwnershipService.checkApplicationAccess()` allows the candidate profile that submitted the application or an employer who manages the Job.
- The source of truth for `jobId` and `cvVersionId` is the persisted Application and its immutable `application_cv_snapshots` relation, not client query parameters.
- The response never returns the CV file path, file bytes, token or raw CV text.
- An unknown application produces 404; an existing application with no result produces a state DTO, not a false 404.

## 5. Frontend fixture behavior

`frontend/src/fixtures/matching-result.fixture.json` is used only as a clearly labelled local-development fallback when the API request fails. The modal shows a notice that fixture scores are not the real candidate's AI score. Set `VITE_MATCHING_FIXTURE_FALLBACK=false` to disable this fallback locally and verify the error state.

## 6. Validation commands

From repository root:

```bash
python scripts/contract-tests/test_matching_contract.py
```

AI Worker schema/endpoint tests (run from `ai-worker/`):

```bash
python -m pytest -q
```

Backend (Java 21 + available Maven dependencies + configured PostgreSQL/test profile required):

```powershell
cd backend
.\mvnw.cmd -o -Dtest=MatchingResultMapperTest,ApplicationOwnershipSecurityIT test
```

Frontend (Node version compatible with the project's Vite version and dependencies installed):

```powershell
cd frontend
npm run build
```

The source changes alone are not proof of runtime success. In this coding environment, Python contract tests and AI Worker tests are executable; Backend compilation/JUnit depends on Maven distribution/dependencies being available, and the frontend build depends on installing npm packages. Record test output, service availability and database state when validating in the group's environment.
