# MatchaJob AI Matching Evaluation Framework

**Owner:** Khải Vạn (Zikenic)  
**Reviewer:** lpKhang  
**Module:** Offline Evaluation, Stability & Latency Benchmark  
**Baseline Configuration:** Rule Weight: `0.60`, Semantic Weight: `0.40`, Shortlist Threshold: `70`

---

## 1. Overview

This directory contains the reproducible offline evaluation framework for the MatchaJob CV–JD matching and scoring pipeline. It evaluates:
1. **Ranking Quality & Accuracy:** Pairwise Ranking Accuracy and tie-aware NDCG@3.
2. **Classification Performance:** Precision, Recall, and F1 across decision thresholds (50–80).
3. **Determinism & Stability:** Score variance across 30 repeated iterations and candidate ranking sanity.
4. **Input Robustness & Boundary Conditions:** Behavior under empty, malformed, excessively long inputs, and partial/unrelated profiles.

---

## 2. Dataset Structure

Located in [`datasets/pilot_cv_jd_eval_dataset.json`](./datasets/pilot_cv_jd_eval_dataset.json):
- **Jobs ($N=3$):**
  - `job-en-backend-sr`: Senior Backend Engineer (Java, Kafka, Microservices).
  - `job-vi-fullstack-mid`: Lập trình viên Fullstack (React, Node.js).
  - `job-en-data-analyst`: Data Analyst (Python, SQL, Power BI).
- **Candidate Pairs ($N=18$):**
  - Ground truth relevance grades: 0 (Unrelated), 1 (Minimal), 2 (Partial/Tangential), 3 (Meets Requirements), 4 (Exceeds Requirements).
  - Binary shortlist eligibility: 6 positives, 10 negatives, 2 pending review (`pair-009`, `pair-010`).

---

## 3. Evaluation Methodology

### Pairwise Ranking Accuracy
Evaluates whether candidates with higher relevance grades score strictly above candidates with lower relevance grades:
$$\text{Pairwise Accuracy} = \frac{\text{Concordant Pairs} + 0.5 \times \text{Tie Pairs}}{\text{Total Comparable Pairs}}$$
- Candidate pairs with identical ground truth grades ($g_i = g_j$) are excluded from the denominator.
- Predicted score ties ($s_i = s_j$) between candidates with $g_i \ne g_j$ receive 0.5 credit.

### Tie-Aware NDCG@3
Computed at rank $k=3$ with exponential gain:
$$\text{DCG@3} = \sum_{i=1}^{3} \frac{2^{g_i} - 1}{\log_2(i + 1)}$$
When multiple candidates share identical predicted scores within the top-3 cutoff (e.g. `pair-014` and `pair-015` in `job-en-data-analyst`), the evaluator evaluates both ordering permutations and reports the expected value $\mathbb{E}[\text{NDCG@3}]$.

### Deterministic Stability
Evaluated over 30 repeated runs:
- **Repeatability:** Measures score variance ($\sigma$) per candidate across runs.
- **Ranking Sanity:** Confirms that domain-ordered candidate hierarchies (Strong > Partial > Unrelated) are strictly preserved.

---

## 4. Key Verified Results (Baseline Configuration)

- **Pooled Pairwise Accuracy:** **96.43%** ($40.5 / 42$ comparable pairs)
- **Macro Pairwise Accuracy:** **97.00%** (Backend: 96.00%, Fullstack: 100.00%, Data Analyst: 95.00%)
- **Expected Macro NDCG@3:** **0.9958** (Worst-case lower bound: 0.9917)
- **Shortlist Classification ($\text{Threshold} = 70$):**
  - Precision: **1.0000** (Zero false positives)
  - Recall: **0.5000**
  - F1-Score: **0.6667**
- **Shortlist Classification ($\text{Threshold} = 50$):**
  - Precision: **0.8571**
  - Recall: **1.0000** (Captures all qualified candidates)
  - F1-Score: **0.9231**
- **Stability:** Repeatability = **100%** ($\sigma = 0.0$ across 30 runs), Ranking Sanity = **100%**.

---

## 5. Execution Commands

From repository root:

```powershell
# Run ranking evaluation, threshold sweeps, and weight sweeps
$env:PYTHONPATH="ai-worker"
python evaluation/evaluate_matching.py

# Run 30-iteration stability and determinism benchmark
$env:PYTHONPATH="ai-worker"
python evaluation/evaluate_stability.py

# Run evaluation test suite (15 tests)
$env:PYTHONPATH="ai-worker"
python -m pytest evaluation/test_ranking_metrics.py evaluation/test_input_robustness.py -v
```

---

## 6. Documented Limitations

1. **Binary Experience Gating:** A candidate matching $\ge 1$ required skill currently unlocks 100% of experience credit.
2. **Integer Score Granularity:** Tied candidates (`pair-014` and `pair-015` at score 62) require secondary sorting in UI display.
3. **Pending Annotations:** `pair-009` and `pair-010` remain marked `shortlist_eligible: null` pending reviewer confirmation.
