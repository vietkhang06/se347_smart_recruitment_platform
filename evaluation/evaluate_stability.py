"""
Stability and Repeatability Evaluator for MatchaJob AI Matching System.

Measures score variability, rank changes, and rank reversals across repeated runs.
Covers:
1. Deterministic Local Test Provider (Rule + Trigonometric SHA-256 Embeddings)
2. Hybrid Score Fusion Repeatability
3. Batch Ranking Consistency
4. Repeated executions (default: 30 iterations)
"""

import sys
import math
from pathlib import Path
from typing import List, Dict, Any

AI_WORKER_DIR = Path(__file__).resolve().parent.parent / "ai-worker"
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_WORKER_DIR))

from app.schemas.ai import MatchScoreRequest
from app.services.providers import DeterministicTestProvider


def evaluate_stability(iterations: int = 30) -> Dict[str, Any]:
    provider = DeterministicTestProvider()

    job_title = "Senior Backend Engineer"
    job_reqs = "Requires 4 years experience with Java, Spring Boot, PostgreSQL, Docker, Microservices."

    candidates = [
        {
            "id": "cand-01-strong",
            "name": "Strong Candidate",
            "cv": "Senior Backend Engineer with 5 years experience in Java, Spring Boot, PostgreSQL, Docker, Microservices.",
            "skills": ["Java", "Spring Boot", "PostgreSQL", "Docker", "Microservices"]
        },
        {
            "id": "cand-02-partial",
            "name": "Partial Candidate",
            "cv": "Developer with 2 years experience in Java and MySQL.",
            "skills": ["Java", "MySQL"]
        },
        {
            "id": "cand-03-unrelated",
            "name": "Unrelated Candidate",
            "cv": "Graphic Designer with 5 years experience in Figma, Photoshop.",
            "skills": ["Figma", "Photoshop"]
        }
    ]

    history_scores = {c["id"]: [] for c in candidates}
    history_rankings = []

    for it in range(iterations):
        current_scores = []
        for c in candidates:
            # 1. Rule score
            req = MatchScoreRequest(
                job_title=job_title,
                job_requirements=job_reqs,
                cv_text=c["cv"],
                candidate_skills=c["skills"],
            )
            rule_score = provider.calculate_match(req).overall_score

            # 2. Embedding similarity
            vecs = provider.generate_embeddings([job_title + " " + job_reqs, c["cv"]])
            sim = sum(a * b for a, b in zip(vecs[0], vecs[1]))
            dist = max(0.0, min(2.0, 1.0 - sim))
            sem_score = (1.0 - dist / 2.0) * 100.0

            # 3. Hybrid score
            hybrid = int(round(0.60 * rule_score + 0.40 * sem_score))
            history_scores[c["id"]].append(hybrid)
            current_scores.append({"id": c["id"], "score": hybrid})

        # Rank candidates DESC by score
        current_scores.sort(key=lambda x: -x["score"])
        ranking_order = [x["id"] for x in current_scores]
        history_rankings.append(ranking_order)

    # Compute statistics
    stats = {}
    for c in candidates:
        cid = c["id"]
        scores = history_scores[cid]
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        std_dev = math.sqrt(variance)
        stats[cid] = {
            "name": c["name"],
            "iterations": iterations,
            "mean": round(mean, 4),
            "std_dev": round(std_dev, 6),
            "min": min(scores),
            "max": max(scores),
            "exact_repeatability": (min(scores) == max(scores)),
        }

    # Analyze ranking changes / reversals
    baseline_ranking = history_rankings[0]
    rank_changes = 0
    rank_reversals = 0
    for r in history_rankings[1:]:
        if r != baseline_ranking:
            rank_changes += 1
            rank_reversals += 1

    # Quality sanity check: Ensure the baseline ranking itself makes domain sense
    # Strong candidate must outrank Partial, and Partial must outrank Unrelated.
    strong_score = stats["cand-01-strong"]["mean"]
    partial_score = stats["cand-02-partial"]["mean"]
    unrelated_score = stats["cand-03-unrelated"]["mean"]

    ranking_sanity_passed = (strong_score > partial_score > unrelated_score)
    expected_order = ["cand-01-strong", "cand-02-partial", "cand-03-unrelated"]
    order_matches_expected = (baseline_ranking == expected_order)

    return {
        "execution_iterations": iterations,
        "provider": "DeterministicTestProvider (Local SHA-256 trigonometric embedding)",
        "candidate_stats": stats,
        "repeatability": {
            "all_scores_identical_across_runs": all(s["exact_repeatability"] for s in stats.values()),
            "score_std_dev_max": max(s["std_dev"] for s in stats.values()),
            "ranking_consistency_rate": round((iterations - rank_changes) / iterations, 4),
            "observed_rank_changes": rank_changes,
            "observed_rank_reversals": rank_reversals,
        },
        "ranking_sanity": {
            "baseline_order": baseline_ranking,
            "expected_order": expected_order,
            "order_matches_expected": order_matches_expected,
            "ranking_sanity_passed": ranking_sanity_passed,
            "score_progression": f"Strong ({strong_score}) > Partial ({partial_score}) > Unrelated ({unrelated_score})",
        },
        "notes": (
            "Covers deterministic local engine. Repeatability (low variance across runs) is evaluated "
            "separately from Ranking Sanity (ensuring domain-correct candidate ordering). "
            "External OpenAI API temperature drift is zero when local provider is active."
        ),
    }


if __name__ == "__main__":
    res = evaluate_stability(30)
    import json
    print(json.dumps(res, indent=2))
