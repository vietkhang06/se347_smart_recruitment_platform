# MatchaJob CV Storage API Contract

## Scope and base URL

- Browser base URL: `http://localhost:8081/api`
- CV API prefix: `/api/v1/candidates/{candidateId}/cv`
- Accepted files: PDF and DOCX
- Default maximum file size: 10 MB
- Error media type: `application/problem+json`

Authentication is implemented with Bearer JWT. The controller derives the user ID from the authenticated principal and applies resource-ownership checks; the `candidateId` in the route is never trusted as identity by itself. Candidate upload/list is limited to the owning profile. Metadata/download is allowed to the candidate owner or to an employer who manages a job receiving an application from that candidate.

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
  "updated_at": "2026-10-12T02:00:00Z"
}
```

The physical storage path, parsed CV content and raw extracted text are internal and must not be returned by metadata endpoints.

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
| `failed` | Contract target for a permanently failed CV. The current orchestrator does not set this value yet; clients must inspect the processing-job status until the state machine is completed. |

Processing-job status remains separate: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

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
  "message": "CV uploaded successfully. Processing queued."
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
    "updated_at": "2026-10-12T02:00:00Z"
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
5. Deletion and active-version selection are not part of the Week 1 contract.

## Authorization rules

- Candidate: upload/list/view/download only their own versions.
- Employer: view/download only through an application for a job owned by their company.
- Admin: no CV-specific bypass is implemented; an audited administrative use case must be designed separately.
- A path `candidateId` must never be trusted as identity by itself.
- Unauthorized identity returns `401`; authenticated but disallowed access returns `403`.

These checks cover route-level authentication and current ownership rules. Production readiness still requires runtime integration tests, audit logging and an explicit administrative-access policy.
