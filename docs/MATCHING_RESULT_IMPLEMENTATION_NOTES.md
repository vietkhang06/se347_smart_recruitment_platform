# Matching task — implementation notes (27/10/2026)

## Changes

- API application adapter uses real Backend responses throughout matching/list/detail/history/stage/ranking methods; no fixture/mock fallback or local mockStore write after failed API calls.
- Shared strict public response validator detects missing/unknown fields, enum, nullability, integer score bounds, skill arrays, ID correlation and retry metadata. Shared JSON Schema supports independent checks.
- MatchingResultPanel owns GET/POST state, renders all result fields, guards duplicate clicks, aborts/discards stale requests, distinguishes HTTP errors from FAILED, applies backoff and bounds polling.
- Candidate modal uses the panel and does not merge mock candidate/application data in API mode. Employer list updates the selected record after a completed result.
- Null scores remain null in application/ranking adapters and default models. Overview displays a missing-score label.
- Backend uses short transactions in MatchingPersistenceService. Application row lock serializes claim creation; unique idempotency key is reused; attempts have leases. Result/job/application score are committed together. No Worker HTTP inside these transactions.
- Worker payload is checked as a JSON tree before Jackson can coerce strings/floats/booleans to integers.
- Worker Pydantic score validation is strict. Request validation errors use Problem Details and do not echo CV data.
- Matching exceptions have safe status/code/retryability metadata. Retryable Worker connection/429/5xx errors are persisted with backoff; terminal errors stop.
- POST and subsequent GET timestamps agree at PostgreSQL microsecond precision.
- Mockito uses a startup Byte Buddy agent from Maven-resolved test dependencies.

## Boundaries

No new database migration; no scoring weights/algorithm change; no new asynchronous matching consumer; no external LLM call is claimed. Other business areas retain their existing demo facilities. Matching JSON examples are test inputs only.

The implementation has been compiled/tested on the attached baseline. See docs/MATCHING_TASK_COPY_GUIDE_VI.md for copy and execution steps and VERIFY_RESULTS.md in the delivery archive for the actual verification record. Team contract approval and native PostgreSQL 16/browser/concurrency acceptance remain group activities.
