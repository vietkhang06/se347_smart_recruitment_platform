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

- Status: `Frozen v1.0.0-demo-freeze` (`2026-11-21`, manifest: [`evaluation/model_freeze_manifest.json`](../../../evaluation/model_freeze_manifest.json))
- Owner display name confirmed: `Khải Vạn (Zikenic)`
- Provider/model actually executed:
  - Default demo/CI mode (`AI_PROVIDER=deterministic`): `DeterministicTestProvider` returning `model="deterministic-sha256-1536d-v1"` (1536-dim unit vectors, zero-network).
  - Production mode (`AI_PROVIDER=openai` + valid `AI_API_KEY`): `OpenAIProvider` calls `POST https://api.openai.com/v1/embeddings` via `httpx` (`embedding_model="text-embedding-3-small"`, `dimensions=1536`, `timeout=10.0s`) and reports `"text-embedding-3-small"` on success; falls back to `"deterministic-sha256-1536d-v1-fallback"` when `AI_EMBEDDING_FALLBACK_ENABLED=true`, or raises HTTP `503` when `AI_EMBEDDING_FALLBACK_ENABLED=false` to avoid vector-space mixing.
  - `/api/v1/cv/extract` & `/api/v1/match/score` run inside `run_in_threadpool` using deterministic `extractor-v1.0.0`, `normalizer-v1.0.0` (116 aliases -> 75 canonical skills), and `baseline-rule-v1.0.0`.
- Schema/scoring approach:
  - Internal worker DTOs stay strictly `snake_case` (`MatchScoreRequest` / `MatchScoreResponse` with `ConfigDict(extra="forbid")`); Backend `MatchingResultMapper` translates to public `camelCase` (`MatchingResultResponse`).
  - Rule scoring (`baseline-rule-v1.0.0`): 60% skills / 40% experience with applicability-aware normalization and zero-skill experience gating (`experience_score=0`, `experience_gated=true`).
  - Backend hybrid scoring (`v1.0-hybrid-60-40`, `hybrid-rule-semantic-v1`): `0.60 * rule_score + 0.40 * semantic_score` (pgvector cosine distance normalized `(1 - d/2)*100`), with `shortlist_threshold=70` and `review_threshold=50`.
- Evaluation cases/expected results:
  - Verified on fixed fixtures via `evaluation/run_final_benchmark.py --seed 20261120 --verify-expected evaluation/results/expected_benchmark_snapshot.json`: Parsing/Normalization `13/13 PASS`, Fallback/Resilience `6/6 PASS`, Hybrid 60/40 Pooled Pairwise Accuracy `97.62%` / Macro `98.67%` / NDCG@3 `1.0000`, Stability 30 runs `σ = 0.0`.
  - Full methodology, limitations, bias analysis, and fallback runbook: [`docs/AI_MODEL_FREEZE_AND_METHODOLOGY_REPORT.md`](../../AI_MODEL_FREEZE_AND_METHODOLOGY_REPORT.md).
- Timeout and error semantics:
  - Invalid/corrupt/double-extension uploads -> HTTP `400`; >10 MiB payload -> HTTP `413`; schema validation failure -> RFC 7807 `422` (`VALIDATION_ERROR`, never echoes `cv_text`); upstream OpenAI failure with `AI_EMBEDDING_FALLBACK_ENABLED=false` -> HTTP `503` (Backend transitions to `scoring_mode="rule_based_fallback"`).
- Reviewer/date/PR/evidence: `2026-11-21` — PR #39 review defects resolved; verified via `pytest` (`ai-worker/tests`, `evaluation/`), `mvn -B test`, and `evaluation/run_final_benchmark.py --verify-expected`.
