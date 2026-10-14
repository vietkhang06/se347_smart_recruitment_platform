# Contract fixtures

These JSON files are **synthetic examples for contract review**, not production data, database seeds, or evidence that an endpoint is implemented. IDs, emails, text, dates and scores are illustrative. `manifest.json` classifies current-source, source-aligned, and target-contract fixtures.

## Key classifications

- `current-source-shape`: field names/types inferred from current controller/entity; not proof of a live HTTP response.
- `source-aligned-example`: matches DTO/Pydantic schema found in source; may still require endpoint runtime verification.
- `target-contract`: proposed shape not yet implemented or not yet agreed by owners.

## Owner use

- Auth: register request, login response, current-user target response. Auth implementation is not found in the inspected Backend source; these are proposals.
- Job: search response is aligned with `PageResponse`/`JobSummaryResponse`; create request follows current `JobCreateRequest` shape, but `createdBy` should be derived from principal once JWT is implemented rather than trusted from a client body.
- CV: retain current snake_case response and proposed camelCase response side by side until owners approve the public DTO.
- Application: create request/response are target proposals; reconcile with DB constraints/state machine before implementation.
- Backend Matching: keep current entity response (`breakdown` string) beside proposed DTO (`breakdown` object); don't hide the difference.
- AI Worker: match request/response and extraction response are shaped against the Pydantic schemas, not outputs captured from a live AI model.
- Errors: Problem Details fixture is a proposed public contract; backend parity still needs tests.

## Freeze rule

When a contract decision is approved, update the same change set: `docs/API_CONTRACT.md`, `docs/INTEGRATION_CONTRACT.md` where applicable, `manifest.json`, the related fixture(s), tests, `OWNER_CONTRACT_MATRIX.md` and `DECISION_LOG.md`. Do not load fixtures into database automatically.
