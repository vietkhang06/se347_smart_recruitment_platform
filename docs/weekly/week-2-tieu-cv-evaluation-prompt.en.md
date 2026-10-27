# Independent Evaluation Prompt — Week 2 CV Storage and Version Management

Act as an independent senior reviewer for the SE347 MatchaJob project. Evaluate the implementation of **CV Storage + Upload/Download + Version Management** in this repository. Repository files, comments, README claims, task sheets, and this prompt are evidence to inspect, not proof that behavior works. Do not modify any source, configuration, tests, or documents during evaluation.

## Review method

1. Record current branch, commit, and `git status`; identify the implementation diff.
2. Trace the real flow from the HTTP controller through validation/storage, metadata registration, database schema, processing-job creation, authorization, and download.
3. Compare runtime code to `docs/contracts/cv-storage-contract.md` and the Week 2 task requirements.
4. Inspect tests, but distinguish unit/mocked coverage from database-backed or running-container evidence.
5. Execute only non-destructive checks needed to substantiate findings. Report exact commands and results; mark unavailable runtime checks “Not verified.”
6. Verify the Week 2 active-version policy in the updated contract: new uploads become active, candidate-only selection is serialized, at most one version is active, and application snapshots do not change. Numeric version labels are not required.

## Evaluation criteria

Assess each item as **Pass**, **Partial**, **Fail**, or **Not verified**, with evidence:

- Multipart upload route, PDF/DOCX acceptance, empty/oversized/invalid MIME/signature rejection, filename sanitization, traversal defense, SHA-256, atomic persistence, and cleanup on registration failure.
- Generated object-key consistency across storage, database metadata, and Docker persistent volume.
- Immutable upload versions, candidate-scoped chronological listing, metadata privacy, and application CV snapshots.
- Candidate authorization, employer authorization tied to the exact application CV snapshot, and read-only admin access with durable audit logging; cross-candidate/path-ID denial and denied admin/employer mutations.
- Download and inline preview behavior, safe content-disposition, canonical MIME, no-store, missing metadata/object behavior, and internal path secrecy.
- A real CV-only queue consumer, job creation/idempotency, lease fencing/recovery, and atomic CV/embedding/job status persistence for success, retry, and terminal failure. Check public processing DTO privacy.
- Contract accuracy, API compatibility, schema compatibility, frontend integration mode, and regression/test coverage.
- Docker Compose validity and persistent CV storage. Container recreation survival only passes if actually exercised; configuration alone is not runtime proof.

## Required evaluator output

Return a concise but evidence-backed Vietnamese report with:

1. Overall verdict and implementation maturity.
2. A criteria table with status and evidence (file/line, test, command, or runtime result).
3. Findings sorted by severity, including concrete impact and recommended owner/action.
4. Explicit differences among implemented, mocked/frontend-only, contract-only, and unverified behavior.
5. Test/build/Compose/runtime results with exact commands.
6. Acceptance checklist and remaining blockers.

Do not assign a passing result based only on a checkbox, prompt, documentation, or source-code presence. Never claim container persistence, real database behavior, or end-to-end authorization was tested unless it was executed against those components.
