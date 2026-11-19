"""
Offline Evaluation Engine for MatchaJob AI Matching System.

Features:
1. Evaluates accuracy & ranking:
   - Pairwise Ranking Accuracy (per JD and globally)
   - NDCG@3 (Normalized Discounted Cumulative Gain)
   - Score separation across relevance groups (0-4)
2. Classification & Threshold Evaluation:
   - Confusion Matrix (TP, FP, TN, FN)
   - Precision, Recall, F1-score
   - Threshold sweep analysis
3. Controlled Weight Sweeps:
   - Rule weight vs Semantic weight combinations
4. Config Fingerprinting & Reproducibility tracking
"""

import math
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from app.schemas.ai import MatchScoreRequest
from app.services.providers import DeterministicTestProvider

DATASET_PATH = Path(__file__).resolve().parent / "datasets" / "pilot_cv_jd_eval_dataset.json"


def compute_dcg(relevance_scores: List[int], k: int = 3) -> float:
    """Computes Discounted Cumulative Gain at rank K."""
    dcg = 0.0
    for i, rel in enumerate(relevance_scores[:k]):
        dcg += (2**rel - 1) / math.log2(i + 2)
    return dcg


def compute_ndcg(actual_rels: List[int], k: int = 3) -> float:
    """Computes Normalized Discounted Cumulative Gain at rank K."""
    if not actual_rels or all(r == 0 for r in actual_rels):
        return 1.0  # Undefined/trivial cases where all items are irrelevant
    ideal_rels = sorted(actual_rels, reverse=True)
    idcg = compute_dcg(ideal_rels, k)
    if idcg == 0.0:
        return 1.0
    dcg = compute_dcg(actual_rels, k)
    return dcg / idcg


def compute_tie_aware_ndcg(ranked_candidates: List[Dict[str, Any]], k: int = 3) -> Dict[str, Any]:
    """
    Computes tie-aware NDCG@K taking into account possible predicted score ties.
    If multiple candidates share identical predicted scores that span or fall within top-k,
    we compute the expected DCG across all permutations of the tied candidates,
    as well as the minimum (adversarial) and maximum (optimal) NDCG.
    """
    import itertools
    from collections import defaultdict

    if not ranked_candidates:
        return {"expected_ndcg": 1.0, "min_ndcg": 1.0, "max_ndcg": 1.0, "has_top_k_ties": False}

    all_rels = sorted([c["relevance_grade"] for c in ranked_candidates], reverse=True)
    idcg = compute_dcg(all_rels, k)
    if idcg == 0.0:
        return {"expected_ndcg": 1.0, "min_ndcg": 1.0, "max_ndcg": 1.0, "has_top_k_ties": False}

    groups = defaultdict(list)
    for c in ranked_candidates:
        groups[c["hybrid_score"]].append(c)

    sorted_scores = sorted(groups.keys(), reverse=True)
    tier_permutations = []
    has_top_k_ties = False

    accumulated = 0
    for s in sorted_scores:
        tier_cands = groups[s]
        if accumulated < k and len(tier_cands) > 1:
            has_top_k_ties = True
            tier_permutations.append(list(itertools.permutations(tier_cands)))
        else:
            tier_permutations.append([tuple(tier_cands)])
        accumulated += len(tier_cands)

    all_orderings = []
    for product in itertools.product(*tier_permutations):
        flat = []
        for tier_order in product:
            flat.extend(tier_order)
        all_orderings.append(flat)

    dcgs = []
    for ordering in all_orderings:
        rels = [c["relevance_grade"] for c in ordering[:k]]
        dcgs.append(compute_dcg(rels, k))

    exp_dcg = sum(dcgs) / len(dcgs)
    min_dcg = min(dcgs)
    max_dcg = max(dcgs)

    return {
        "idcg": round(idcg, 4),
        "expected_dcg": round(exp_dcg, 4),
        "min_dcg": round(min_dcg, 4),
        "max_dcg": round(max_dcg, 4),
        "expected_ndcg": round(exp_dcg / idcg, 4),
        "min_ndcg": round(min_dcg / idcg, 4),
        "max_ndcg": round(max_dcg / idcg, 4),
        "has_top_k_ties": has_top_k_ties,
    }


def evaluate_job_ranking(
    job_id: str,
    candidates: List[Dict[str, Any]],
    rule_weight: float = 0.60,
    semantic_weight: float = 0.40,
    provider: Optional[DeterministicTestProvider] = None
) -> Dict[str, Any]:
    """
    Evaluates ranking for candidates competing under the same job.
    Computes pairwise accuracy and NDCG@3.
    """
    if provider is None:
        provider = DeterministicTestProvider()

    scored_candidates = []
    for cand in candidates:
        req = MatchScoreRequest(
            job_id=job_id,
            job_title=cand["job_title"],
            job_description=cand["job_description"],
            job_requirements=cand["job_requirements"],
            cv_text=cand["cv_text"],
            candidate_skills=cand.get("candidate_skills", []),
        )
        # 1. Rule score from baseline provider
        rule_resp = provider.calculate_match(req)
        rule_score = rule_resp.overall_score

        # 2. Semantic score from deterministic embedding cosine distance
        jd_text = f"{cand['job_title']} {cand['job_requirements']}"
        embeddings = provider.generate_embeddings([jd_text, cand["cv_text"]])
        v_jd, v_cv = embeddings[0], embeddings[1]

        # Dot product of unit vectors = cosine similarity
        cos_sim = sum(a * b for a, b in zip(v_jd, v_cv))
        cos_dist = max(0.0, min(2.0, 1.0 - cos_sim))
        # Normalized similarity to [0, 100]
        semantic_score = max(0.0, min(100.0, (1.0 - cos_dist / 2.0) * 100.0))

        # 3. Hybrid overall score
        hybrid_score = int(round(rule_weight * rule_score + semantic_weight * semantic_score))
        hybrid_score = max(0, min(100, hybrid_score))

        scored_candidates.append({
            "pair_id": cand["pair_id"],
            "cv_id": cand["cv_id"],
            "relevance_grade": cand["relevance_grade"],
            "shortlist_eligible": cand["shortlist_eligible"],
            "rule_score": rule_score,
            "semantic_score": round(semantic_score, 1),
            "hybrid_score": hybrid_score,
        })

    # Sort predicted candidates by hybrid_score DESC
    ranked = sorted(scored_candidates, key=lambda c: -c["hybrid_score"])

    # 1. Compute Pairwise Ranking Accuracy within this job
    # For every pair (A, B) where ground truth Grade(A) != Grade(B):
    # Concordant: (Grade(A) > Grade(B) and Score(A) > Score(B)) or (Grade(A) < Grade(B) and Score(A) < Score(B))
    # Tie: Score(A) == Score(B) (awarded 0.5 credit)
    # Discordant: (Grade(A) > Grade(B) and Score(A) < Score(B)) or (Grade(A) < Grade(B) and Score(A) > Score(B))
    concordant = 0
    discordant = 0
    ties = 0
    total_comparable_pairs = 0

    n = len(scored_candidates)
    for i in range(n):
        for j in range(i + 1, n):
            c1 = scored_candidates[i]
            c2 = scored_candidates[j]
            g1, g2 = c1["relevance_grade"], c2["relevance_grade"]
            s1, s2 = c1["hybrid_score"], c2["hybrid_score"]
            if g1 != g2:
                total_comparable_pairs += 1
                if (g1 > g2 and s1 > s2) or (g1 < g2 and s1 < s2):
                    concordant += 1
                elif s1 == s2:
                    ties += 1
                else:
                    discordant += 1

    pairwise_acc = (concordant + 0.5 * ties) / total_comparable_pairs if total_comparable_pairs > 0 else 1.0

    # 2. Compute NDCG@3
    ordered_rels = [c["relevance_grade"] for c in ranked]
    ndcg_3 = compute_ndcg(ordered_rels, k=3)
    tie_metrics = compute_tie_aware_ndcg(ranked, k=3)

    return {
        "job_id": job_id,
        "candidate_count": len(ranked),
        "comparable_pairs": total_comparable_pairs,
        "concordant_pairs": concordant,
        "discordant_pairs": discordant,
        "tie_pairs": ties,
        "pairwise_accuracy": round(pairwise_acc, 4),
        "ndcg_at_3": round(ndcg_3, 4),
        "ndcg_at_3_expected": tie_metrics["expected_ndcg"],
        "ndcg_at_3_min": tie_metrics["min_ndcg"],
        "ndcg_at_3_max": tie_metrics["max_ndcg"],
        "has_top_k_ties": tie_metrics["has_top_k_ties"],
        "ranked_candidates": ranked,
    }


def evaluate_dataset(
    dataset_path: Path = DATASET_PATH,
    rule_weight: float = 0.60,
    semantic_weight: float = 0.40,
    shortlist_threshold: int = 70
) -> Dict[str, Any]:
    """Runs end-to-end evaluation across all JDs and pairs in the evaluation dataset."""
    data = json.loads(dataset_path.read_text(encoding="utf-8"))
    jobs = {j["jd_id"]: j for j in data["jobs"]}

    # Group candidate pairs by job_id
    grouped_candidates = {}
    for pair in data["pairs"]:
        jid = pair["jd_id"]
        job_info = jobs[jid]
        cand_record = {**pair, **job_info}
        grouped_candidates.setdefault(jid, []).append(cand_record)

    provider = DeterministicTestProvider()

    job_results = []
    all_scored = []
    total_comparable = 0
    total_concordant = 0
    total_ties = 0

    for jid, cands in grouped_candidates.items():
        res = evaluate_job_ranking(jid, cands, rule_weight, semantic_weight, provider)
        job_results.append(res)
        all_scored.extend(res["ranked_candidates"])
        total_comparable += res["comparable_pairs"]
        total_concordant += res["concordant_pairs"]
        total_ties += res["tie_pairs"]

    pooled_pairwise_acc = (
        (total_concordant + 0.5 * total_ties) / total_comparable
        if total_comparable > 0
        else 1.0
    )
    macro_pairwise_acc = (
        sum(r["pairwise_accuracy"] for r in job_results) / len(job_results)
        if job_results
        else 1.0
    )
    mean_ndcg_3 = sum(r["ndcg_at_3"] for r in job_results) / len(job_results) if job_results else 0.0
    mean_ndcg_3_expected = sum(r["ndcg_at_3_expected"] for r in job_results) / len(job_results) if job_results else 0.0

    # Relevance grade separation stats
    grade_scores = {}
    for item in all_scored:
        grade = item["relevance_grade"]
        grade_scores.setdefault(grade, []).append(item["hybrid_score"])

    separation_stats = {}
    for g in sorted(grade_scores.keys()):
        scores = grade_scores[g]
        separation_stats[f"Grade_{g}"] = {
            "count": len(scores),
            "mean_score": round(sum(scores) / len(scores), 1),
            "min_score": min(scores),
            "max_score": max(scores),
        }

    # Classification Metrics (TP, FP, TN, FN) against shortlist_eligible
    tp = fp = tn = fn = 0
    unresolved_count = 0
    for item in all_scored:
        label = item["shortlist_eligible"]
        if label is None:
            unresolved_count += 1
            continue
        predicted_shortlist = item["hybrid_score"] >= shortlist_threshold
        if label is True:
            if predicted_shortlist:
                tp += 1
            else:
                fn += 1
        elif label is False:
            if predicted_shortlist:
                fp += 1
            else:
                tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    config_str = f"rw={rule_weight:.2f}_sw={semantic_weight:.2f}_th={shortlist_threshold}"
    config_hash = hashlib.sha256(config_str.encode("utf-8")).hexdigest()[:8]

    return {
        "config": {
            "rule_weight": rule_weight,
            "semantic_weight": semantic_weight,
            "shortlist_threshold": shortlist_threshold,
            "config_fingerprint": config_hash,
        },
        "overall_summary": {
            "total_pairs_evaluated": len(all_scored),
            "total_jobs_evaluated": len(job_results),
            "pairwise_ranking": {
                "total_comparable_pairs": total_comparable,
                "total_concordant_pairs": total_concordant,
                "total_discordant_pairs": total_comparable - total_concordant - total_ties,
                "total_tie_pairs": total_ties,
                "formula": "(concordant + 0.5 * ties) / comparable",
                "pooled_pairwise_accuracy": round(pooled_pairwise_acc, 4),
                "macro_pairwise_accuracy": round(macro_pairwise_acc, 4),
            },
            "mean_ndcg_at_3": round(mean_ndcg_3, 4),
            "mean_ndcg_at_3_expected": round(mean_ndcg_3_expected, 4),
        },
        "classification": {
            "evaluated_pairs": len(all_scored) - unresolved_count,
            "unresolved_pairs_pending_reviewer": unresolved_count,
            "shortlist_threshold": shortlist_threshold,
            "confusion_matrix": {"TP": tp, "FP": fp, "TN": tn, "FN": fn},
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
        },
        "score_separation": separation_stats,
        "per_job_breakdown": [
            {
                "job_id": r["job_id"],
                "candidate_count": r["candidate_count"],
                "comparable_pairs": r["comparable_pairs"],
                "concordant_pairs": r["concordant_pairs"],
                "discordant_pairs": r["discordant_pairs"],
                "tie_pairs": r["tie_pairs"],
                "pairwise_accuracy": r["pairwise_accuracy"],
                "ndcg_at_3": r["ndcg_at_3"],
                "ndcg_at_3_expected": r["ndcg_at_3_expected"],
                "has_top_k_ties": r["has_top_k_ties"],
            }
            for r in job_results
        ],
    }


def run_threshold_sweep(
    dataset_path: Path = DATASET_PATH,
    rule_weight: float = 0.60,
    semantic_weight: float = 0.40,
    thresholds: List[int] = [50, 60, 65, 70, 75, 80, 85]
) -> List[Dict[str, Any]]:
    """Sweeps multiple shortlist thresholds to analyze trade-offs."""
    sweep_results = []
    for th in thresholds:
        res = evaluate_dataset(dataset_path, rule_weight, semantic_weight, shortlist_threshold=th)
        c = res["classification"]
        sweep_results.append({
            "threshold": th,
            "TP": c["confusion_matrix"]["TP"],
            "FP": c["confusion_matrix"]["FP"],
            "TN": c["confusion_matrix"]["TN"],
            "FN": c["confusion_matrix"]["FN"],
            "precision": c["precision"],
            "recall": c["recall"],
            "f1_score": c["f1_score"],
        })
    return sweep_results


def run_weight_sweep(
    dataset_path: Path = DATASET_PATH,
    weights: List[Tuple[float, float]] = [(1.0, 0.0), (0.7, 0.3), (0.6, 0.4), (0.5, 0.5), (0.4, 0.6), (0.0, 1.0)],
    threshold: int = 70
) -> List[Dict[str, Any]]:
    """Evaluates candidate hybrid weights against the evaluation dataset."""
    results = []
    for rw, sw in weights:
        res = evaluate_dataset(dataset_path, rule_weight=rw, semantic_weight=sw, shortlist_threshold=threshold)
        results.append({
            "rule_weight": rw,
            "semantic_weight": sw,
            "pooled_pairwise_accuracy": res["overall_summary"]["pairwise_ranking"]["pooled_pairwise_accuracy"],
            "macro_pairwise_accuracy": res["overall_summary"]["pairwise_ranking"]["macro_pairwise_accuracy"],
            "mean_ndcg_3": res["overall_summary"]["mean_ndcg_at_3"],
            "f1_score": res["classification"]["f1_score"],
            "precision": res["classification"]["precision"],
            "recall": res["classification"]["recall"],
        })
    return results


if __name__ == "__main__":
    print("=== MatchaJob AI Evaluation Engine ===")
    eval_res = evaluate_dataset()
    print(json.dumps(eval_res, indent=2, ensure_ascii=False))

    print("\n=== Shortlist Threshold Sweep ===")
    sweep = run_threshold_sweep()
    print(f"{'Threshold':<10} | {'TP':<4} | {'FP':<4} | {'TN':<4} | {'FN':<4} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 75)
    for row in sweep:
        print(f"{row['threshold']:<10} | {row['TP']:<4} | {row['FP']:<4} | {row['TN']:<4} | {row['FN']:<4} | {row['precision']:<10.4f} | {row['recall']:<10.4f} | {row['f1_score']:<10.4f}")

    print("\n=== Weight Combination Sweep ===")
    w_sweep = run_weight_sweep()
    print(f"{'Rule Wt':<8} | {'Sem Wt':<8} | {'Pooled Acc':<11} | {'Macro Acc':<11} | {'NDCG@3':<10} | {'Precision':<10} | {'Recall':<10} | {'F1':<10}")
    print("-" * 92)
    for row in w_sweep:
        print(f"{row['rule_weight']:<8.2f} | {row['semantic_weight']:<8.2f} | {row['pooled_pairwise_accuracy']:<11.4f} | {row['macro_pairwise_accuracy']:<11.4f} | {row['mean_ndcg_3']:<10.4f} | {row['precision']:<10.4f} | {row['recall']:<10.4f} | {row['f1_score']:<10.4f}")
