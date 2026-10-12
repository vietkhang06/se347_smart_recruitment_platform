# Owner packet — Frontend adapter contract

- **Owners from workbook:** `PN Thông` (candidate) and `Khanh` (recruiter). A different sheet uses `Nguyễn Thông`; confirm canonical display name with the group.
- **Reviewer:** Việt Khang plus respective API owners.
- **Status:** source includes mock/localStorage-backed paths; API adapter use via `VITE_API_BASE_URL` has not been verified under `frontend/src`.

## Candidate UI owner — PN Thông

Required screen/action mapping:

| UI area | API domain | Required adapter behavior |
|---|---|---|
| Register/login/current user | Auth (target) | Map validation/401/403, store token safely under team decision, no fake login success in API mode |
| Job list/search/detail | Job | Serialize query params with `page=0` default and approved filter/sort options; loading/empty/error states |
| Profile | Profile/Auth (target) | Current user/profile routes; never trust UI-provided owner ID |
| CV upload/list/select | CV | `multipart/form-data` file field `file`; progress/error; poll processing only after backend executor decision |
| Apply/history | Application (target) | Prevent duplicate click as UX only, rely on Backend for duplicate rule; reflect persisted status |

## Recruiter UI owner — Khanh

| UI area | API domain | Required adapter behavior |
|---|---|---|
| Company/current employer | Auth/Profile/Company target | Company context follows authenticated identity |
| Job CRUD/status | Employer Job | Map 201/200/204 and validation/403/404; no arbitrary companyId trust |
| Applications/status history | Application target | Stage list comes from contract; update state only after API success |
| Matching details/ranking | Matching target | Distinguish no result / pending / complete / failed; show only persisted results; do not calculate fake scores in UI |
| Statistics | Recruiter stats | Confirm whether endpoint is in MVP; do not present hard-coded sample data as live |

## Acceptance criteria for both FE owners

- Single API client uses `import.meta.env.VITE_API_BASE_URL` and avoids duplicated `/api` prefixes.
- Components use service adapter/view model, not direct `mockStore` in MVP happy path.
- All failures are rendered with actionable state; API mode and mock/demo mode are explicit and not mixed silently.
- Fixtures used by adapter tests match `manifest.json` classification.
- Evidence includes unit/component test or documented manual browser test on a running Backend.

## Review response

- Candidate owner status: `Pending`; reviewer/date/evidence:
- Recruiter owner status: `Pending`; reviewer/date/evidence:
- Canonical display name for PN Thông/Nguyễn Thông:
