# MatchaJob AI Matching Evaluation & Freeze Framework

- **Owner:** Khải Vạn (`Zikenic`)
- **Module:** AI Model Freeze, Offline Evaluation, Stability & Latency Benchmark
- **Frozen Version:** `1.0.0-demo-freeze` ([`model_freeze_manifest.json`](./model_freeze_manifest.json))
- **Full Report:** [`docs/AI_MODEL_FREEZE_AND_METHODOLOGY_REPORT.md`](../docs/AI_MODEL_FREEZE_AND_METHODOLOGY_REPORT.md)

---

## 1. Overview

This directory contains the frozen configuration manifest, reproducible benchmark runner, and offline evaluation suite for the MatchaJob CV–JD parsing, normalization, and matching pipeline:
1. **Model & Contract Freeze Verification:** Validates live Python constants, Backend properties (`application.yml`, `MatchingScoringProperties.java`), pinned dependencies, and SHA-256 checksums of schemas/fixtures.
2. **Parsing & Normalization Verification:** Expected-vs-actual validation across 13 fixed CV/JD fixtures (PDF/DOCX, EN/VI, minimal, unrelated, corrupt, unsupported).
3. **Ranking Quality & Classification Accuracy:** Pairwise Ranking Accuracy, tie-aware NDCG@3, confusion matrices, threshold sweeps (`50–85`), and weight sweeps on the 18-pair frozen pilot dataset ([`datasets/pilot_cv_jd_eval_dataset.json`](./datasets/pilot_cv_jd_eval_dataset.json), `1.1.0-frozen`).
4. **Determinism, Stability & Fallback Resilience:** 30-iteration variance checks (`σ = 0.0`) and OpenAI outage fallback / experience-gating verification.
5. **Latency Profiling:** 18-stage processing time benchmark (`warmup=5`, `iterations=50`).

> **Important Transparency Note on Embedding Provider Mode:** All reproducible offline metrics in this folder execute under **`AI_PROVIDER=deterministic`** (`deterministic-sha256-1536d-v1`, zero-network SHA-256 + trigonometric 1536d vectors) and **not** live OpenAI `text-embedding-3-small` API calls. Because SHA-256 vectors are nearly orthogonal (`semantic_score ≈ 50.0`), hybrid scores for strong candidates are compressed into `72–80`, which explains why `shortlist_threshold=70` yields `Precision=1.0000` with `Recall=0.5000` in deterministic mode while `review_threshold=50` achieves `Recall=1.0000`.

---

## 2. Frozen Configurations Benchmarked

| Profile | Config Version | Rule / Semantic Weights | Shortlist / Review Thresholds | Embedding Mode |
|---|---|---|---|---|
| **Demo Default Hybrid** | `v1.0-hybrid-60-40` | `0.60` / `0.40` | `70` / `50` | `deterministic-sha256-1536d-v1` (or `text-embedding-3-small` in prod) |
| **Pure Rule Baseline / Fallback** | `v1.0-rule-baseline-100-0` | `1.00` / `0.00` | `70` / `50` | Disabled (`semantic_weight=0.00`) |

---

## 3. Key Verified Results (Seed `20261120`, Dataset `1.1.0-frozen`)

| Metric | Frozen Hybrid (`0.60 / 0.40`, SHA-256) | Pure Rule Baseline (`1.00 / 0.00`) |
|---|---:|---:|
| **Parsing & Normalization Fixed Fixtures** | **13 / 13 PASS** | **13 / 13 PASS** |
| **Pooled Pairwise Accuracy** | **97.62%** (`40/42` concordant, `0` discordant, `2` ties) | **95.24%** (`38/42` concordant, `0` discordant, `4` ties) |
| **Macro Pairwise Accuracy** | **98.67%** (Backend `0.96`, Fullstack `1.00`, Data Analyst `1.00`) | **97.33%** (Backend `0.92`, Fullstack `1.00`, Data Analyst `1.00`) |
| **Expected Macro NDCG@3** | **1.0000** (`has_top_k_ties=false` across all 3 JDs) | **1.0000** |
| **Shortlist Classification (`TH=70`)** | Precision `1.0000`, Recall `0.5000`, F1 `0.6667` (`TP=3, FP=0, TN=10, FN=3`) | Precision `1.0000`, Recall `0.6667`, F1 `0.8000` (`TP=4, FP=0, TN=10, FN=2`) |
| **Review Classification (`TH=50`)** | Precision `0.8571`, Recall `1.0000`, F1 `0.9231` (`TP=6, FP=1, TN=9, FN=0`) | Precision `0.8571`, Recall `1.0000`, F1 `0.9231` (`TP=6, FP=1, TN=9, FN=0`) |
| **30-Run Stability & Sanity** | Repeatability `100%` (`σ = 0.0`), Sanity `100%` | Repeatability `100%` (`σ = 0.0`), Sanity `100%` |
| **Fallback & Resilience Suite** | **6 / 6 PASS** | **6 / 6 PASS** |

Saved reproducible artifacts:
- Expected deterministic snapshot: [`results/expected_benchmark_snapshot.json`](./results/expected_benchmark_snapshot.json)
- Latest full run output (including 18-stage latencies): [`results/final_benchmark_results.json`](./results/final_benchmark_results.json)

---

## 4. Reproduction Commands

From repository root:

```powershell
$env:PYTHONPATH="ai-worker"

# 1. Run full reproducible benchmark and verify exact expected-vs-actual match
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python evaluation/run_final_benchmark.py `
  --seed 20261120 --warmup 5 --iterations 50 --stability-iterations 30 `
  --output evaluation/results/final_benchmark_results.json `
  --verify-expected evaluation/results/expected_benchmark_snapshot.json

# 2. Run ranking & threshold sweep engine standalone
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python evaluation/evaluate_matching.py

# 3. Run 30-iteration stability benchmark standalone
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python evaluation/evaluate_stability.py

# 4. Run full Python test suite (AI Worker + Evaluation + Freeze Reproducibility)
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python -m pytest -p no:cacheprovider -v `
  ai-worker/tests evaluation/test_ranking_metrics.py evaluation/test_input_robustness.py evaluation/test_model_freeze_reproducibility.py
```

---

## 5. Documented Limitations

1. **Synthetic SHA-256 Compression:** Local SHA-256 vectors score near `50.0` regardless of lexical similarity, compressing top hybrid scores below `80`.
2. **Closed Skill Taxonomy & Negation Blindness:** `CANONICAL_SKILL_MAP` covers 75 canonical skills without negation-scope awareness (observed on `pair-009` and `pair-010`, where negated skills such as *"Chưa có kinh nghiệm với React"* still match).
3. **Regex Experience Modifier Gap & Binary Gating Cliff:** Modified experience phrases (e.g., `"4+ years of hands-on experience"` in `job-en-backend-sr`) fall back to skills-only evaluation, and matching `>= 1` required skill unlocks 100% of experience credit.
4. **Pending Ground-Truth Annotations:** `pair-009` and `pair-010` remain `shortlist_eligible: null` pending human reviewer confirmation.
