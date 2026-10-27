# MatchaJob CV Storage API Contract

## Scope and base URL

- Browser base URL: `http://localhost:8081/api`
- CV API prefix: `/api/v1/candidates/{candidateId}/cv`
- Accepted files: PDF and DOCX
- Default maximum file size: 10 MiB (10,485,760 bytes; configured as Spring `10MB`).
- Error media type: `application/problem+json`

Authentication uses Bearer JWT. The controller derives the user ID from the authenticated principal; route IDs are never accepted as identity. Candidate upload/list/active selection is limited to the owning profile. Metadata/download is allowed to the candidate owner, an employer managing a job whose application snapshot references that exact version, or an admin under the read-only audit policy below.

## Data model

Public CV metadata:

```json
{
  "id": "f6eec143-9e92-4637-8963-7cb586e674c0",
  "candidate_id": "c600a0b0-a479-41b6-a551-65246c18e781",
  "file_name": "resume.pdf",
  "file_size_bytes": 245760,
  "mime_type": "application/pdf",
  "sha256_hash": "64-character-lowercase-hex",
  "status": "uploaded",
  "created_at": "2026-10-12T02:00:00Z",
  "updated_at": "2026-10-12T02:00:00Z",
  "is_active": true,
  "processing_job_id": "2b60e47e-e31f-4336-84ba-e074d199e462"
}
```

The physical storage path, parsed CV content and raw extracted text are internal and must not be returned by metadata endpoints.

Week 3 adds nullable `processing_job_id` to list/get/active metadata, preserving every existing field and route.
It refers only to the latest `CV_TEXT_EXTRACTION` / `cv_version` job for that exact CV, never a matching job.
List metadata uses one batch job lookup, not one query per version. Legacy/imported CVs with no job return null.
The job endpoint retains its own resource authorization; possession of a job UUID grants no access.

### Storage and object-key rules

- The backend generates the object key; clients cannot provide one.
- New objects use `candidates/{candidateId}/{generatedUuid}.{extension}`.
- The database column named `file_path` is retained for migration compatibility but stores the logical object key for new uploads.
- `file_name` is the sanitized display filename, not the storage key.
- The service resolves object keys only inside `MATCHAJOB_UPLOAD_DIR` and rejects traversal outside that root.
- Docker stores the objects in the named volume `matchajob_cv_storage`, mounted at `/data/cv`.
- Database reset must not remove the CV volume.

### Status values

CV status:

| Value | Meaning |
|---|---|
| `uploaded` | File and metadata are stored; extraction is pending or processing. |
| `extracted` | Text extraction completed and results were persisted. |
| `failed` | Non-retryable processing failure, exhausted retries, or an expired lease with no attempts left. |

Processing-job status remains separate: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

### Frontend processing observation (Week 3)

- Resolve candidate profile ID using authenticated `GET /api/v1/candidates/profile`; do not substitute user ID.
- Upload: multipart part `file`, Bearer JWT, browser-generated boundary, `sync=false` by default; retain the returned CV/job UUIDs.
- Reload: list metadata restores the job UUID; poll existing `GET /api/v1/processing-jobs/{id}` every 2 seconds, without overlapping requests.
- UI mapping: `PENDING` -> queued, `PROCESSING` -> processing, `COMPLETED` -> completed, `FAILED` -> failed. Progress is a state, not a fabricated percentage or CV/JD score.
- On terminal job status, refetch exact CV metadata; completed requires `extracted`, failed requires `failed`.
- Legacy metadata without a job UUID falls back to bounded metadata polling (`uploaded` means waiting or processing, not a verified running job).
- Stop on completion/failure, 401/403/404, three consecutive transient errors, unmount, account/version change, or a 3-minute observation budget. Observation timeout does **not** mark a backend job failed.
- Manual refresh only reads current status; it never creates another extraction job. A new corrected upload creates a new immutable version.
- Download/preview uses authenticated fetch -> Blob URL, never a public object key or direct unauthenticated link. Revoke URLs on close/unmount/session change. PDF preview depends on browser support; DOCX is downloaded.
- API mode never falls back to IndexedDB/mock when a request fails. Demo mode remains explicitly separate.

The CV-only scheduler polls every 2000 ms by default and claims only `CV_TEXT_EXTRACTION` jobs. Retryable failures return the job to `PENDING` with backoff, leaving CV `uploaded`; terminal failures set job `FAILED` and CV `failed` in one transaction. Success persists extraction, embedding and job completion in one transaction. Leases last 120 seconds and use tokens to prevent a stale worker from overwriting a newer attempt. Configure `MATCHAJOB_CV_PROCESSING_ENABLED` and `MATCHAJOB_CV_PROCESSING_POLL_DELAY_MS` when needed; normal uploads use `sync=false`.

File validation checks extension/MIME and signature; DOCX must be a readable ZIP package with `[Content_Types].xml`, `_rels/.rels`, and `word/document.xml`. The archive is inspected without extracting files, with at most 2048 entries and total expanded content at most the smaller of ten times the upload limit and 100 MiB. These checks do not replace complete document parsing or malware scanning. Filenames over 255 sanitized characters are rejected.

## 1. Upload a CV

**Implementation:** implemented.

- Method: `POST`
- Route: `/api/v1/candidates/{candidateId}/cv`
- Path parameter: `candidateId` (UUID), candidate profile that owns the new version.
- Query parameter: `sync` (optional boolean, default `false`).
- Request content type: `multipart/form-data`
- Response content type: `application/json`
- Parts:
  - `file`: required PDF or DOCX file.
  - `sync`: optional boolean query parameter; defaults to `false`. It exists for controlled integration testing and should not be used as the normal UI flow.
- Success: `202 Accepted`, `application/json`

Example:

```bash
curl -X POST "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F "file=@synthetic-resume.pdf;type=application/pdf"
```

```json
{
  "cv_version_id": "f6eec143-9e92-4637-8963-7cb586e674c0",
  "candidate_id": "c600a0b0-a479-41b6-a551-65246c18e781",
  "file_name": "synthetic-resume.pdf",
  "file_size_bytes": 245760,
  "mime_type": "application/pdf",
  "status": "uploaded",
  "processing_job_id": "2b60e47e-e31f-4336-84ba-e074d199e462",
  "message": "CV uploaded successfully. Processing queued.",
  "is_active": true
}
```

Errors:

| Status | Condition |
|---|---|
| `400` | Empty file, unsupported extension, MIME mismatch, invalid signature or invalid identifier. |
| `401` | Missing, invalid or expired JWT. |
| `403` | Authenticated user does not own the candidate profile. |
| `413` | Multipart request exceeds the configured request limit. |
| `500` | Storage or persistence failure. The backend attempts to remove an orphan file if database registration fails. |

Example validation error:

```json
{
  "type": "https://matchajob.com/errors/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "The file signature does not match the declared CV format.",
  "timestamp": "2026-10-12T02:00:00Z"
}
```

## 2. List CV versions

**Implementation:** implemented.

- Method: `GET`
- Route: `/api/v1/candidates/{candidateId}/cv`
- Path parameter: `candidateId` (UUID), candidate whose versions are requested.
- Query parameters: none.
- Request content type: none.
- Response content type: `application/json`.
- Success: `200 OK`
- Response: an array of public CV metadata, newest first.

```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv"
```

```json
[
  {
    "id": "f6eec143-9e92-4637-8963-7cb586e674c0",
    "candidate_id": "c600a0b0-a479-41b6-a551-65246c18e781",
    "file_name": "synthetic-resume.pdf",
    "file_size_bytes": 245760,
    "mime_type": "application/pdf",
    "sha256_hash": "64-character-lowercase-hex",
    "status": "uploaded",
    "created_at": "2026-10-12T02:00:00Z",
    "updated_at": "2026-10-12T02:00:00Z",
    "is_active": true
  }
]
```

An empty list is returned when the candidate has no CV version. Missing authentication returns `401`; a valid identity that does not own the candidate profile returns `403`. Example access-denied response:

```json
{
  "type": "https://matchajob.com/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "Access is denied: insufficient permissions or invalid role",
  "code": "FORBIDDEN",
  "timestamp": "2026-10-12T02:00:00Z"
}
```

## 3. Get one CV version's metadata

**Implementation:** implemented with candidate/CV relationship validation.

- Method: `GET`
- Route: `/api/v1/candidates/{candidateId}/cv/{cvVersionId}`
- Path parameters: `candidateId` (UUID) and `cvVersionId` (UUID).
- Query parameters: none.
- Request content type: none.
- Response content type: `application/json`.
- Success: `200 OK`
- Response: public CV metadata.
- `404 Not Found`: the version does not exist or does not belong to the route candidate.
- `401 Unauthorized`: JWT is missing, invalid or expired.
- `403 Forbidden`: the authenticated user is neither the candidate owner nor an eligible reviewing employer.

```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/CV_VERSION_UUID"
```

The success response has the public metadata shape shown in **Data model**. Example error:

```json
{
  "type": "https://matchajob.com/errors/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "CV version was not found for this candidate.",
  "timestamp": "2026-10-12T02:00:00Z"
}
```

## 4. Download or preview CV content

**Implementation:** implemented with authenticated ownership checks.

- Method: `GET`
- Route: `/api/v1/candidates/{candidateId}/cv/{cvVersionId}/download`
- Path parameters: `candidateId` (UUID) and `cvVersionId` (UUID).
- Query parameter:
  - `disposition=attachment` (default): download.
  - `disposition=inline`: browser preview when supported.
- Request content type: none.
- Success: `200 OK`
- Response content type: stored canonical PDF or DOCX MIME type.
- Headers: safe UTF-8 `Content-Disposition`, `Cache-Control: no-store`.

```bash
curl -OJ -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/CV_VERSION_UUID/download"
```

Errors:

| Status | Condition |
|---|---|
| `400` | `disposition` is not `attachment` or `inline`. |
| `401` | Missing, invalid or expired JWT. |
| `403` | Authenticated user is neither the candidate owner nor an eligible reviewing employer. |
| `404` | Metadata does not match the candidate, or the stored object no longer exists. |

The success body is the binary CV content. Example invalid-query response:

```json
{
  "type": "https://matchajob.com/errors/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "Disposition must be either 'attachment' or 'inline'.",
  "timestamp": "2026-10-12T02:00:00Z"
}
```

## Error shape

```json
{
  "type": "https://matchajob.com/errors/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "The file signature does not match the declared CV format.",
  "timestamp": "2026-10-12T02:00:00Z"
}
```

Unexpected server errors use a generic detail and do not expose stack traces or internal file paths.

## Versioning rules

1. Every accepted upload creates a new immutable `cv_versions` row and a new generated object key.
2. Previous CV objects are not overwritten.
3. Applications should reference a selected CV version through `application_cv_snapshots`.
4. Duplicate SHA-256 values are recorded but are not rejected during Week 1; product rules for duplicate versions remain a later decision.
5. Week 2 adds `is_active` without changing existing routes or removing response fields. The latest accepted upload becomes active. Candidates may select an earlier version using the endpoint below. Changing the selection never changes a stored file or an application snapshot. Activation is independent of processing state, so a candidate may still download an active CV whose AI processing failed.
6. Migration `V6__cv_active_version.sql` selects the newest existing version for each candidate. A partial unique index permits at most one active row; per-candidate row locking serializes uploads and active changes. UUIDs are the version identifiers; no numeric version label is required.

## Authorization rules

- Candidate: upload/list/view/download only their own versions.
- Employer: view/download only through an application for a job owned by their company.
- Admin: read metadata or download/preview a specific candidate/version only. Each authorization is recorded in `audit_logs` (`VIEW_CV_METADATA`, `DOWNLOAD_CV`, or `PREVIEW_CV`) before returning content; audit persistence failure denies the response. The log means access was authorized, not that a stream finished transferring. Admin cannot upload, list a candidate's versions, or change active selection through these APIs.
- A path `candidateId` must never be trusted as identity by itself.
- Unauthorized identity returns `401`; authenticated but disallowed access returns `403`.

These checks cover the defined application-level policy. Production readiness also requires deployment/integration evidence, limits on concurrent uploads, and operational controls.

## 5. Get the active version (Week 2)

- Method: `GET`
- Route: `/api/v1/candidates/{candidateId}/cv/active`
- Path parameter: candidate profile UUID; query/body: none.
- Response: `200 application/json`, the public metadata shape with `is_active: true`.
- Errors: `401` missing/invalid JWT, `403` non-owning candidate or other role, `404` no active CV.
- Authorization: candidate owner only. Implemented; database migration V6 is required.

```bash
curl -H "Authorization: Bearer JWT_TOKEN" "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/active"
```

Success example: the metadata JSON in **Data model**. Missing selection example:

```json
{"type":"https://matchajob.com/errors/not-found","title":"Resource not found","status":404,"detail":"No active CV was found for this candidate."}
```

## 6. Select an active version (Week 2)

- Method: `PUT`
- Route: `/api/v1/candidates/{candidateId}/cv/{cvVersionId}/active`
- Path parameters: candidate profile UUID and CV version UUID; query/body: none (request content type not required).
- Response: `200 application/json`, metadata of the selected version with `is_active: true`.
- Errors: `401` missing/invalid JWT, `403` non-owner/other role, `404` unknown version or version outside the candidate.
- Authorization: candidate owner only; selecting an already active version is idempotent.
- Implemented; uses a transaction and the candidate row lock. No file is rewritten or deleted.

```bash
curl -X PUT -H "Authorization: Bearer JWT_TOKEN" "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/CV_VERSION_UUID/active"
```

Success example: the metadata JSON in **Data model**. Unknown version example:

```json
{"type":"https://matchajob.com/errors/not-found","title":"Resource not found","status":404,"detail":"CV version was not found for this candidate."}
```

Application submission still requires an explicit `cvVersionId` in the current application API. A frontend may preselect the ID returned by `/cv/active`; the Backend does not silently replace an application's chosen snapshot.

## Processing progress and download compatibility

`GET /api/v1/processing-jobs/{id}` keeps its existing progress fields and ownership rules but returns a DTO. Internal `leaseToken`, `leaseExpiresAt`, and `idempotencyKey` are excluded; `lastError`, when present, is a generic public message. HTTP response field names remain camelCase for this pre-existing endpoint; CV metadata retains snake_case.

Download now returns a Spring file resource to stream bytes with the same public URL/status/MIME/content-disposition. `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` apply. Missing objects return `404`; storage/audit failures return a generic `500`. DOCX inline rendering depends on browser support.
