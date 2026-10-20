# Week 2 Implementation Prompt — CV Storage, Upload/Download, and Version Management

You are a senior Full-Stack Engineer working on the SE347 MatchaJob Smart Recruitment Platform. Implement the Week 2 task **CV Storage + Upload/Download + Version Management** in the existing repository. Inspect the live source before changing anything; this prompt is a task brief, not proof that any feature is implemented.

## Repository and boundaries

- Work in the current repository and preserve the existing stack, module boundaries, public routes, and working behavior.
- The CV API prefix is `/api/v1/candidates` after the Spring servlet context path `/api` and controller mapping `/v1/candidates`.
- Existing CV files may include `CvController`, `CvStorageService`, `CvRegistrationService`, `CvProcessingOrchestrator`, `CvVersion`, repositories, DTOs, Flyway migrations, CV tests, Docker Compose, and `docs/contracts/cv-storage-contract.md`. Verify their current content first.
- Authentication and candidate/employer resource ownership already belong to the shared security module. Reuse the existing security and ownership services; do not build a parallel authorization system or bypass existing checks.
- The CV processing and AI integration are shared with another owner. Avoid unrelated changes to AI parsing, matching, application workflows, or authentication.
- Do not commit, push, merge, delete user data, or store real CVs in the repository.

## Required workflow

1. Inspect `git status`, current branch, and recent relevant history. Preserve all existing user changes.
2. Read the CV API contract, controller, storage and registration services, entity/repository/DTOs, Flyway schema, ownership/security rules, processing flow, Docker volume configuration, frontend CV integration, and existing tests.
3. Make a concise evidence-based gap list before editing. Classify each requested capability as implemented, partial, missing, or unverified.
4. Implement only the missing or defective parts required by the task below. Keep changes small and compatible with existing callers and database records.
5. Run the relevant existing checks and tests because verification is part of this task. Record exact commands and results; never report an unrun check as passing.
6. Review the final diff for API/schema compatibility, authorization regressions, data loss, generated files, secrets, and unrelated changes.
7. Produce the Vietnamese implementation and evaluation report described at the end.

## Functional acceptance requirements

### Upload and validation

- Accept the project's supported PDF and DOCX formats through the existing multipart route.
- Validate empty files, configured maximum size, extension, declared MIME type, file signature, and sanitized filename. Prevent path traversal and avoid returning internal filesystem paths.
- Generate a server-controlled object key and SHA-256 digest. Persist files atomically where supported and clean up a newly written file if metadata registration fails.
- Preserve existing duplicate-file behavior unless the product contract explicitly specifies otherwise.

### Storage and version management

- Store each accepted upload as an immutable CV version for its candidate; a later upload must not overwrite an earlier file.
- Keep the object key, CV metadata, database row, Docker persistent volume, and documented storage rules consistent.
- The assigned Week 2 task row requires active-version management. Define it in the Week 2 contract: a new accepted upload becomes active, the candidate can select an older version, at most one version per candidate is active, and previously submitted application snapshots never change. Use an additive migration and compatible endpoints/fields. Numeric version labels are not required; UUIDs identify versions.
- Ensure version listing is candidate-scoped and ordered consistently with the current contract. Ensure a CV ID from another candidate cannot be accessed by changing a path parameter.
- Preserve the existing processing status/job workflow. Handle failure and retry transitions consistently where the current module owns them; do not redesign the AI worker.

### Download and preview

- Reuse the current authenticated download/preview route if present; retain its route and response compatibility.
- Authorize the candidate owner and any currently supported eligible employer according to the existing ownership service.
- Employer access must reference the exact CV version in an application snapshot for their job. Support the assigned task's admin read use case with an explicit read-only policy and a persistent audit event; admin must not gain upload or active-selection rights.
- Validate disposition values, return the stored canonical MIME type and safe filename headers, and prevent caching of private CV content.
- Avoid loading large files fully into memory if a compatible streaming response can be implemented safely within the existing architecture. Do not undertake unrelated performance refactors.
- Return a safe not-found response when metadata exists but the underlying object is missing. Do not expose server paths or stack traces.

### API contract and Docker persistence

- Update `docs/contracts/cv-storage-contract.md` only where actual runtime behavior changes or the existing document is inaccurate.
- Cover upload, list versions, get metadata, download/preview, status fields, validation errors, authorization, version rules, storage/object-key rules, and size/type limits.
- Check that the configured upload directory is mounted to the existing named persistent Docker volume so files survive Backend container recreation. Do not add external object storage.

## Required verification

Run relevant existing backend tests, including CV storage/controller/processing tests, and the backend build or test command supported by the repository. If Docker and dependencies are available, validate Compose configuration and test storage persistence across Backend recreation without deleting the named CV volume. Use synthetic files/data only.

At minimum, inspect or verify:

- Valid PDF and DOCX upload.
- Empty, oversized, wrong MIME/extension, invalid signature, and path traversal inputs.
- Version list ordering and metadata privacy.
- Owner access and cross-candidate denial for metadata and download.
- Download/preview headers and missing-object handling.
- CV and processing-job status behavior on success and failure.
- CV object persistence after container recreation, when Docker is available.

If an environment or dependency is unavailable, record the exact command and mark that check **Not verified** with the reason. Do not fabricate runtime results.

## Vietnamese deliverables

Create `docs/weekly/week-2-tieu-cv-implementation-evaluation-report.vi.md` containing:

1. Task scope and repository/branch/initial Git status.
2. Verified implementation state before changes, with file paths and relevant classes/endpoints.
3. Concrete gaps found and why each matters.
4. Changes made, grouped by file/module, including compatibility decisions.
5. End-to-end upload, storage, version listing, processing, and download flow; clearly distinguish implemented behavior from contract-only behavior.
6. Authorization and privacy behavior, plus any unresolved limitation or product decision.
7. Verification table with exact command, Pass/Fail/Not verified, and evidence.
8. Remaining risks/blockers and their responsible module/role.
9. Acceptance checklist and concise instructions for a teammate to verify the feature locally.

The report must reflect actual source and executed command results, not this prompt's assumptions. The task is complete only when the appropriate implementation is verified or remaining limitations are explicitly documented.
