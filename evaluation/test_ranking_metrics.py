"""
Unit tests for Pairwise Ranking Accuracy and Ranking Metrics.
Validates concordant, discordant, ties, edge cases, and multi-JD pooling.
"""

import sys
from pathlib import Path
import pytest

EVAL_DIR = Path(__file__).resolve().parent
if str(EVAL_DIR) not in sys.path:
    sys.path.insert(0, str(EVAL_DIR))

AI_WORKER_DIR = Path(__file__).resolve().parent.parent / "ai-worker"
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_WORKER_DIR))

from evaluate_matching import evaluate_job_ranking, compute_dcg, compute_ndcg


def test_pairwise_ranking_accuracy_perfect_order():
    """Candidates ordered in strict accordance with relevance grades score 1.0 (100%)."""
    cands = [
        {"pair_id": "p1", "cv_id": "c1", "cv_text": "text1", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 4, "shortlist_eligible": True},
        {"pair_id": "p2", "cv_id": "c2", "cv_text": "text2", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 2, "shortlist_eligible": False},
        {"pair_id": "p3", "cv_id": "c3", "cv_text": "text3", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 0, "shortlist_eligible": False},
    ]
    # Synthetic ranking mock: simulate candidates scored as 90, 50, 10
    class MockProvider:
        def calculate_match(self, req):
            class R:
                overall_score = 90 if "text1" in req.cv_text else (50 if "text2" in req.cv_text else 10)
            return R()
        def generate_embeddings(self, texts):
            return [[1.0] * 1536, [1.0] * 1536]

    res = evaluate_job_ranking("job-test", cands, provider=MockProvider())
    assert res["comparable_pairs"] == 3
    assert res["concordant_pairs"] == 3
    assert res["discordant_pairs"] == 0
    assert res["tie_pairs"] == 0
    assert res["pairwise_accuracy"] == 1.0


def test_pairwise_ranking_accuracy_reversed_order():
    """Completely reversed ranking scores 0.0 (0%)."""
    cands = [
        {"pair_id": "p1", "cv_id": "c1", "cv_text": "text1", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 4, "shortlist_eligible": True},
        {"pair_id": "p2", "cv_id": "c2", "cv_text": "text2", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 1, "shortlist_eligible": False},
    ]
    class InvertedProvider:
        def calculate_match(self, req):
            class R:
                overall_score = 10 if "text1" in req.cv_text else 90
            return R()
        def generate_embeddings(self, texts):
            return [[1.0] * 1536, [1.0] * 1536]

    res = evaluate_job_ranking("job-test", cands, provider=InvertedProvider())
    assert res["comparable_pairs"] == 1
    assert res["concordant_pairs"] == 0
    assert res["discordant_pairs"] == 1
    assert res["pairwise_accuracy"] == 0.0


def test_pairwise_ranking_accuracy_equal_relevance_not_in_denominator():
    """Candidates with equal relevance grades are not comparable and must not inflate/deflate denominator."""
    cands = [
        {"pair_id": "p1", "cv_id": "c1", "cv_text": "text1", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 3, "shortlist_eligible": True},
        {"pair_id": "p2", "cv_id": "c2", "cv_text": "text2", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 3, "shortlist_eligible": True},
    ]
    class DummyProvider:
        def calculate_match(self, req):
            class R:
                overall_score = 70
            return R()
        def generate_embeddings(self, texts):
            return [[1.0] * 1536, [1.0] * 1536]

    res = evaluate_job_ranking("job-test", cands, provider=DummyProvider())
    assert res["comparable_pairs"] == 0
    assert res["pairwise_accuracy"] == 1.0  # Trivial case


def test_pairwise_ranking_accuracy_predicted_tie_credit():
    """When predicted scores tie for candidates with different relevance, exactly 0.5 credit is awarded."""
    cands = [
        {"pair_id": "p1", "cv_id": "c1", "cv_text": "text1", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 4, "shortlist_eligible": True},
        {"pair_id": "p2", "cv_id": "c2", "cv_text": "text2", "candidate_skills": [], "job_title": "Role", "job_description": "", "job_requirements": "", "relevance_grade": 2, "shortlist_eligible": False},
    ]
    class TiedProvider:
        def calculate_match(self, req):
            class R:
                overall_score = 50
            return R()
        def generate_embeddings(self, texts):
            return [[1.0] * 1536, [1.0] * 1536]

    res = evaluate_job_ranking("job-test", cands, provider=TiedProvider())
    assert res["comparable_pairs"] == 1
    assert res["concordant_pairs"] == 0
    assert res["tie_pairs"] == 1
    assert res["pairwise_accuracy"] == 0.5


def test_ndcg_at_3_computation():
    """Verify NDCG calculation on known vectors."""
    # Ideal: [4, 3, 2] -> NDCG = 1.0
    assert compute_ndcg([4, 3, 2], k=3) == 1.0
    # Degraded order: [2, 3, 4]
    ndcg_rev = compute_ndcg([2, 3, 4], k=3)
    assert 0.0 < ndcg_rev < 1.0
    # All zeroes -> 1.0
    assert compute_ndcg([0, 0, 0], k=3) == 1.0


def test_evaluator_score_consistency_and_threshold_classification():
    """
    Ensures that every candidate score is identical between the per-candidate list
    and the threshold sweeps, explicitly verifying pair-002, pair-003, pair-014, and pair-015.
    """
    from evaluation.evaluate_matching import evaluate_dataset, run_threshold_sweep, DATASET_PATH
    import json

    res_eval = evaluate_dataset(DATASET_PATH, rule_weight=0.60, semantic_weight=0.40, shortlist_threshold=70)
    raw_data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    # Collect per-pair scores and ground-truth labels directly from per_job_breakdown
    pair_scores = {}
    for job_res in res_eval["per_job_breakdown"]:
        for cand in job_res["ranked_candidates"]:
            pair_scores[cand["pair_id"]] = cand["hybrid_score"]

    assert len(pair_scores) == len(raw_data["pairs"])
    assert pair_scores["pair-014"] > pair_scores["pair-015"], (
        "Fixed BI taxonomy (Power BI, Tableau, Data Warehousing) must disambiguate pair-014 above pair-015"
    )
    assert pair_scores["pair-002"] == 55
    assert pair_scores["pair-003"] == 38
    assert pair_scores["pair-014"] == 58
    assert pair_scores["pair-015"] == 51

    labels_by_pair = {p["pair_id"]: p["shortlist_eligible"] for p in raw_data["pairs"]}

    # Sweep thresholds and verify exact alignment with per-pair scores
    sweep = run_threshold_sweep(DATASET_PATH, rule_weight=0.60, semantic_weight=0.40, thresholds=[50, 60, 65, 70, 75, 80])
    sweep_by_th = {s["threshold"]: s for s in sweep}

    for th, stats in sweep_by_th.items():
        expected_tp = sum(1 for pid, lbl in labels_by_pair.items() if lbl is True and pair_scores[pid] >= th)
        expected_fp = sum(1 for pid, lbl in labels_by_pair.items() if lbl is False and pair_scores[pid] >= th)
        expected_tn = sum(1 for pid, lbl in labels_by_pair.items() if lbl is False and pair_scores[pid] < th)
        expected_fn = sum(1 for pid, lbl in labels_by_pair.items() if lbl is True and pair_scores[pid] < th)
        assert stats["TP"] == expected_tp
        assert stats["FP"] == expected_fp
        assert stats["TN"] == expected_tn
        assert stats["FN"] == expected_fn

    # Verify threshold 50 behavior (recall=1.0, only pair-015 at 51 is FP):
    th50 = sweep_by_th[50]
    assert th50["TP"] == 6
    assert th50["FP"] == 1
    assert th50["TN"] == 9
    assert th50["FN"] == 0

    # Verify threshold 60 behavior:
    # pair-002 (Grade 3, shortlist: True, hybrid: 55) and pair-014 (Grade 3, shortlist: True, hybrid: 58) are FN
    # pair-015 (Grade 2, shortlist: False, hybrid: 51) is correctly rejected (TN) -> 0 FP!
    th60 = sweep_by_th[60]
    assert th60["TP"] == 4
    assert th60["FP"] == 0
    assert th60["TN"] == 10
    assert th60["FN"] == 2

    # Verify threshold 70 behavior:
    th70 = sweep_by_th[70]
    assert th70["TP"] == 3
    assert th70["FP"] == 0
    assert th70["TN"] == 10
    assert th70["FN"] == 3


def test_data_analyst_ndcg_tie_handling_and_dual_orderings():
    """
    Verifies Data Analyst NDCG@3 under both orderings of the tied candidates
    pair-014 (Score 62, Grade 3) and pair-015 (Score 62, Grade 2),
    verifying IDCG, DCG1, DCG2, and tie-aware expected NDCG.
    """
    from evaluation.evaluate_matching import compute_dcg, compute_tie_aware_ndcg

    # Ideal ranking: [Grade 4, Grade 3, Grade 2]
    idcg = compute_dcg([4, 3, 2], k=3)
    assert round(idcg, 4) == 20.9165

    # Ordering 1 (favorable: pair-014 ranked 2nd, pair-015 ranked 3rd)
    dcg1 = compute_dcg([4, 3, 2], k=3)
    ndcg1 = dcg1 / idcg
    assert round(dcg1, 4) == 20.9165
    assert round(ndcg1, 4) == 1.0000

    # Ordering 2 (adversarial: pair-015 ranked 2nd, pair-014 ranked 3rd)
    dcg2 = compute_dcg([4, 2, 3], k=3)
    ndcg2 = dcg2 / idcg
    assert round(dcg2, 4) == 20.3928
    assert round(ndcg2, 4) == 0.9750

    # Tie-aware expected NDCG
    expected_dcg = (dcg1 + dcg2) / 2.0
    expected_ndcg = expected_dcg / idcg
    assert round(expected_dcg, 4) == 20.6546
    assert round(expected_ndcg, 4) == 0.9875

    # Verify tie-aware function gives same result
    candidates = [
        {"hybrid_score": 80, "relevance_grade": 4},
        {"hybrid_score": 62, "relevance_grade": 3},
        {"hybrid_score": 62, "relevance_grade": 2},
    ]
    metrics = compute_tie_aware_ndcg(candidates, k=3)
    assert metrics["idcg"] == 20.9165
    assert metrics["expected_ndcg"] == 0.9875
    assert metrics["min_ndcg"] == 0.9750
    assert metrics["max_ndcg"] == 1.0000
    assert metrics["has_top_k_ties"] is True


