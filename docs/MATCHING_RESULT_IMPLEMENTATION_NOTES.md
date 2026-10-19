# SE347 — Matching Result API + CV–JD Detail UI: Implementation Notes

## Scope

This change addresses Việt Khang's task **Matching Result API + CV–JD Detail UI + Contract Review**. It aligns the Backend public response, AI Worker response mapping, and the employer's candidate detail view. It does not change the AI scoring algorithm or claim that fixture numbers are real candidate scores.

## API contract

- Read result/status: `GET /api/v1/applications/{applicationId}/match`
- Run synchronous evaluation: `POST /api/v1/applications/{applicationId}/match`
- Both use JWT Bearer authentication.
- Application access is checked via `ResourceOwnershipService.checkApplicationAccess`; the application candidate and an authorized employer may read or evaluate the matching result.
- POST takes no client-supplied `jobId`, `cvVersionId`, JD text, or Job title. Backend resolves the Application, its `application_cv_snapshots` CV version, and the Job from stored records.
- POST returns `200 OK` with `MatchingResultResponse` because the present service call is synchronous. `409 MATCHING_NOT_READY` is used when the CV snapshot/text is not ready.
- GET returns `200` with a `MatchingResultResponse`; if no score exists, `status` tells the UI whether it is `NOT_STARTED`, `PENDING`, `PROCESSING`, or `FAILED`, and score fields stay `null`.
- Successful POST updates the existing `APPLICATION_MATCHING` ProcessingJob to `PROCESSING` and then `COMPLETED`; errors are recorded and retryable connection/5xx failures follow the current ProcessingJob backoff policy. This does not assert that an asynchronous dispatcher exists.

## Public response fields

`applicationId`, `jobId`, `cvVersionId`, `status`, `overallScore`, `skillsScore`, `experienceScore`, `criteriaScores`, `matchedSkills`, `missingSkills`, `breakdown`, `explanation`, `processingJobId`, `evaluatedAt`, `message`.

`overallScore`, `skillsScore`, and `experienceScore` are integers from 0 to 100 or `null` until status `COMPLETED`. `breakdown` is a JSON object rather than a JSON string. Public keys use camelCase; the AI Worker internal schema stays snake_case.

## UI behavior

`CandidateDetailModal.jsx` loads the result when opened and renders status, score tiles, per-criterion bars, matched and missing skill lists, explanation, and timestamp. A completed fixture fallback is visibly marked as demonstration-only; it must not be interpreted as the live AI score. Set `VITE_MATCHING_FIXTURE_FALLBACK=false` to disable that development fallback.

## Files added

- `backend/src/main/java/com/matchajob/matching/dto/MatchingResultResponse.java`
- `backend/src/main/java/com/matchajob/matching/service/MatchingResultMapper.java`
- `backend/src/test/java/com/matchajob/matching/dto/MatchingResultMapperTest.java`
- `backend/src/test/java/com/matchajob/matching/service/MatchingServiceTest.java`
- `backend/src/test/java/com/matchajob/matching/controller/MatchControllerTest.java`
- `docs/MATCHING_RESULT_API_AND_CV_JD_UI.md`
- `docs/MATCHING_RESULT_IMPLEMENTATION_NOTES.md`
- `docs/contracts/fixtures/matching-result-completed.json`
- `docs/contracts/fixtures/matching-result-pending.json`
- `frontend/src/fixtures/matching-result.fixture.json`
- `frontend/src/fixtures/matching-result-pending.fixture.json`
- `scripts/contract-tests/test_matching_contract.py`

## Files changed

- `backend/src/main/java/com/matchajob/cv/repository/ApplicationCvSnapshotRepository.java` — adds a snapshot query that fetches its `CvVersion` so the request is mapped from the persisted Application snapshot.
- `backend/src/main/java/com/matchajob/matching/controller/MatchController.java` — adds GET/POST public DTO endpoints, ownership check, OpenAPI responses, and `409 MATCHING_NOT_READY` response.
- `backend/src/main/java/com/matchajob/matching/service/MatchingService.java` — resolves Job/CV server-side, validates AI scores, returns stable processing state, and updates processing job lifecycle.
- `backend/pom.xml` — pins Lombok **1.18.44** for the dependency and annotation processor; project Java release remains **21**.
- `backend/src/main/java/com/matchajob/processing/repository/ProcessingJobRepository.java` — finds the most recent matching job for an application.
- `backend/src/main/java/com/matchajob/security/ResourceOwnershipService.java` — missing applications from ownership checks now raise a not-found exception for HTTP 404 semantics.
- `docs/API_CONTRACT.md` and `docs/contracts/fixtures/manifest.json` — document public contract and fixture provenance.
- `frontend/src/pages/employer/components/CandidateDetailModal.jsx` — adds CV–JD matching details UI and state/error handling.
- `frontend/src/services/api/apiApplicationService.js` — normalizes contract values and labels development fixtures clearly.
- `frontend/src/pages/employer/EmployerPortal.jsx` — passes the persisted Application ID to stage/rejection services while keeping the selected candidate view in sync.
- `.gitignore` — exempts the two new matching contract documents from the repository's broad `docs/**` ignore rule.

## Validation actually performed in this environment

- Toolchain: Temurin Java **21.0.11**, Maven Wrapper **3.9.16**, `pom.xml` release **21**, Lombok **1.18.44** pinned for both the dependency and annotation processor. Lombok added JDK 25 support in 1.18.40 and fixed JDK 25 javac false-positive errors in 1.18.44; this workspace has only JDK 21 installed, so an actual JDK 25 compile remains unverified.
- From `backend/`, `.\mvnw.cmd -DskipTests clean compile`: **PASS**, 141 production source files compiled with `javac --release 21`.
- From `backend/`, `.\mvnw.cmd -o org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree "-Dincludes=org.projectlombok:lombok"`: **PASS**, resolved Lombok **1.18.44**.
- From `backend/`, `.\mvnw.cmd -Dtest=MatchingResultMapperTest -DforkCount=0 test`: **PASS**, 5 tests, 0 failures/errors.
- From `backend/`, `.\mvnw.cmd test`: **BLOCKED** in this Windows test environment. Maven compiled all 41 test sources, then stalled after starting `JobServiceTest`; no Surefire report was produced. Matching tests using Mockito also stalled. An in-process attempt emitted a Byte Buddy attach pipe error (`could not open ... javatool ... pipe`).
- `python scripts/contract-tests/test_matching_contract.py`: **PASS**, 5 tests.
- From `ai-worker/`, `python -m pytest -q tests/test_contract_fixtures.py`: **PASS**, 11 tests. Full `python -m pytest -q` is **BLOCKED**: it stopped after the 11 fixture tests when the first FastAPI `TestClient` test began; a single health `TestClient` test also stalled after collection. No assertion failure was reported.
- From `frontend/`, `npm run build`: **PASS**. Vite emitted a bundle-size warning for the existing 1,117 kB JavaScript chunk.
- From `frontend/`, `npm run lint -- src/pages/employer/components/CandidateDetailModal.jsx src/pages/employer/EmployerPortal.jsx src/services/api/apiApplicationService.js`: **PASS**, exit 0, with three `react(set-state-in-effect)` warnings (two in `EmployerPortal.jsx`, one in the modal reset effect).
- `npm ci` was not rerun because `frontend/node_modules` was already present and the lockfile is unchanged; the production build completed using those installed dependencies.
- PostgreSQL/JWT/AI Worker live HTTP acceptance: **not run**; no runtime credentials or configured service request was provided.

## Before merge

1. Re-run the full backend suite where Surefire/Mockito agent attachment completes, including the matching service/controller tests.
2. Re-run the complete AI Worker `TestClient` suite in a runtime where FastAPI's test client can complete.
3. With a valid employer JWT and a real application fixture, verify GET statuses, successful synchronous POST, and `403` on an unrelated application.
4. Verify CV not ready returns `409 MATCHING_NOT_READY` and does not display fixture score for an API validation/permission failure.
5. Obtain review from Backend owner and AI Worker owner before marking the contract approved.
