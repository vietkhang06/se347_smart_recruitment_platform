# Owner packet — AI Worker / scoring

- **Owner in `Phân Công`:** Khải Vạn; workbook/docs also use `Vạn Khải` inconsistently. Confirm preferred display name.
- **Reviewers đề xuất:** Đại Hưng, Tiểu pro, Việt Khang
- **Trạng thái:** FastAPI health/CV/embedding/match endpoints and Pydantic schemas exist in source. Runtime and provider quality are not implied.

## Endpoints from source

| Endpoint | Request/response source | Fixture |
|---|---|---|
| `GET /health`, `/health/live`, `/health/ready`, `/health/startup` | `app/api/health.py`, `schemas/health.py` | Add health fixtures if consumers require them |
| `POST /api/v1/cv/extract` | multipart `file`; response `raw_text`, `parsed_data`, `char_count`, `page_count` | Need output fixture and 400/413 examples if included in MVP |
| `POST /api/v1/embeddings` | `EmbeddingsRequest.texts`, count 1–100; `EmbeddingsResponse` includes embeddings/dimension/model | Need valid/empty/over-limit fixtures; current tests don't prove model/provider quality |
| `POST /api/v1/match/score` | `MatchScoreRequest`/`MatchScoreResponse` in `app/schemas/ai.py` | `../fixtures/ai-match-score-request.json`, `../fixtures/ai-match-score-response.json` |

## Confirmed schema facts

- Internal AI schema names use `snake_case`.
- `overall_score`, `skills_score`, `experience_score` are constrained to 0–100 in response model; breakdown is an object/dict, rationale optional.
- CV extractor supports PDF/DOCX, max 10 MiB; PDF max 20 pages; text cap 500,000 chars in extractor.
- Embeddings schema says dimension 1536; handler currently responds `model="text-embedding-3-small"` fixed. Verify that this matches the actual provider returned vectors before freezing.
- Config has `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`; actual provider behavior must be described from provider implementation and tested without exposing secret.

## Owner decisions

1. CV parsed schema: canonical field names, optionality, skills/work experience representation, handling scanned/non-text CV.
2. JD input schema and whether the scorer receives normalized JSON or flattened text.
3. Scoring algorithm/weights and evidence trace. Do not write unsupported scores/weights in spec until owner commits to actual method.
4. Determinism / tolerance: what is expected for identical fixture inputs and provider/model.
5. Error behavior for missing key/quota/timeout/invalid document; ensure details don't leak provider credentials.
6. Provider/model names and embedding dimension verified from implementation.

## Acceptance criteria

- Positive and negative Pydantic tests for extraction/matching/embedding schemas.
- Score range tests and explanatory breakdown fixture validate.
- Evaluation fixture results are actually produced by the committed algorithm/provider mode; label fallback/stub if used.
- Runtime health checks do not require LLM/provider credentials.
- Backend contract maps `snake_case` worker DTO to `camelCase` public DTO.

## Owner response

- Status: `Pending`
- Provider/model actually executed:
- Schema/scoring approach:
- Evaluation cases/expected results:
- Timeout and error semantics:
- Reviewer/date/PR/evidence:
