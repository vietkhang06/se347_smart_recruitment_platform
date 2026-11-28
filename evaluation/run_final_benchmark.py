"""
Reproducible Final Benchmark Runner for MatchaJob AI Worker & Hybrid Matching.

Executes 5 fixed-fixture benchmark suites under a pinned random seed (default: 20261120):
1. Document Parsing & Bilingual Normalization (PDF/DOCX CVs, EN/VI JDs, negative files)
2. Matching, Ranking & Explanation on Fixed 18-Pair Pilot Dataset (Hybrid 60/40 & Rule Baseline 100/0)
3. 30-Iteration Determinism & Stability
4. Fallback & Failure Resilience (empty key, timeout/HTTP failures, experience gating)
5. 18-Stage Processing Time / Latency Profile

Supports writing a deterministic expected snapshot (--write-expected) and verifying
exact deterministic reproducibility (--verify-expected), failing with exit code 1 on drift.
"""

import argparse
import hashlib
import json
import logging
import platform
import random
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch

import httpx

REPO_ROOT = Path(__file__).resolve().parent.parent
AI_WORKER_DIR = REPO_ROOT / "ai-worker"
EVAL_DIR = REPO_ROOT / "evaluation"
FIXTURES_DIR = AI_WORKER_DIR / "tests" / "fixtures"
DATASET_PATH = EVAL_DIR / "datasets" / "pilot_cv_jd_eval_dataset.json"

for p in (str(REPO_ROOT), str(AI_WORKER_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

logging.getLogger("pypdf").setLevel(logging.ERROR)

from app.core.config import get_settings
from app.schemas.ai import MatchScoreRequest
from app.services.extractor import EXTRACTOR_VERSION, extract_cv_text
from app.services.normalizer import (
    CANONICAL_SKILL_MAP,
    NORMALIZER_VERSION,
    normalize_cv,
    normalize_jd,
)
from app.services.providers import (
    DETERMINISTIC_EMBEDDING_FALLBACK_MODEL,
    DETERMINISTIC_EMBEDDING_MODEL,
    RULE_ALGORITHM_VERSION,
    RULE_EXPERIENCE_WEIGHT,
    RULE_SKILLS_WEIGHT,
    DeterministicTestProvider,
    OpenAIProvider,
)
from benchmarks.benchmark_processing_time import compute_stats
from evaluation.evaluate_matching import (
    evaluate_dataset,
    run_threshold_sweep,
    run_weight_sweep,
)
from evaluation.evaluate_stability import evaluate_stability


DEFAULT_SEED = 20261120


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def get_git_commit() -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(REPO_ROOT),
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out.strip()
    except Exception:
        return "unknown"


def benchmark_parsing_and_normalization() -> Dict[str, Any]:
    """Suite 1: Fixed-fixture parsing & normalization (expected vs actual)."""
    cv_cases = [
        {
            "fixture": "cv_en_backend.pdf",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Johnathan Doe",
                "email": "john.doe@example.test",
                "experience_years": 4,
                "required_skills_subset": ["AWS", "Docker", "Java", "Kubernetes", "PostgreSQL", "Spring Boot"],
            },
        },
        {
            "fixture": "cv_en_backend.docx",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Johnathan Doe",
                "email": "john.doe@example.test",
                "phone": "+84901234567",
                "experience_years": 4,
                "required_skills_subset": ["AWS", "Docker", "Java", "Kubernetes", "PostgreSQL", "Spring Boot"],
                "languages": ["English", "Vietnamese"],
            },
        },
        {
            "fixture": "cv_vi_backend.docx",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Nguyễn Văn An",
                "email": "nguyen.van.an@example.test",
                "phone": "0987654321",
                "experience_years": 4,
                "required_skills_subset": ["Docker", "Java", "Microservices", "PostgreSQL", "Spring Boot"],
                "languages": ["English", "Vietnamese"],
            },
        },
        {
            "fixture": "cv_minimal.docx",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Nguyen Minimal",
                "email": "minimal@example.test",
                "phone": None,
                "skills": [],
                "experience_years": None,
                "education": None,
            },
        },
        {
            "fixture": "cv_minimal.pdf",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Candidate Name Only",
                "email": None,
                "phone": None,
                "skills": [],
                "experience_years": None,
            },
        },
        {
            "fixture": "cv_unrelated.docx",
            "expected": {
                "status": "OK",
                "page_count": 1,
                "full_name": "Jane Designer",
                "skills": [],
                "experience_years": 3,
            },
        },
        {
            "fixture": "corrupt.pdf",
            "expected": {"status": "ERROR", "error_contains": "Corrupted or invalid PDF header"},
        },
        {
            "fixture": "corrupt.docx",
            "expected": {"status": "ERROR", "error_contains": "Corrupted or invalid DOCX header"},
        },
        {
            "fixture": "unsupported.txt",
            "expected": {"status": "ERROR", "error_contains": "Unsupported file format"},
        },
    ]

    cv_results = []
    for case in cv_cases:
        name = case["fixture"]
        exp = case["expected"]
        content = (FIXTURES_DIR / name).read_bytes()
        try:
            raw_text, pages = extract_cv_text(name, content)
            parsed = normalize_cv(raw_text)
            actual = {
                "status": "OK",
                "page_count": pages,
                "char_count": len(raw_text),
                "full_name": parsed.full_name,
                "email": parsed.email,
                "phone": parsed.phone,
                "experience_years": parsed.experience_years,
                "skills": parsed.skills,
                "languages": [l.language for l in parsed.languages],
                "education": parsed.education,
            }
            passed = exp["status"] == "OK"
            if passed:
                for key, val in exp.items():
                    if key == "status":
                        continue
                    if key == "required_skills_subset":
                        if not set(val).issubset(set(actual["skills"])):
                            passed = False
                    elif key == "languages":
                        if not set(val).issubset(set(actual["languages"])):
                            passed = False
                    elif actual.get(key) != val:
                        passed = False
        except Exception as exc:
            actual = {"status": "ERROR", "error_type": type(exc).__name__, "error": str(exc)}
            passed = exp["status"] == "ERROR" and exp["error_contains"] in str(exc)

        cv_results.append({
            "fixture": name,
            "kind": "CV",
            "expected": exp,
            "actual": actual,
            "passed": passed,
        })

    jd_cases = []
    for name in ("jd_en_backend.json", "jd_vi_backend.json"):
        data = json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))
        parsed = normalize_jd(data["job_title"], data["job_description"], data["job_requirements"])
        exp = {
            "canonical_title": "Backend Developer",
            "seniority": "Senior",
            "required_skills": sorted(data["expected_skills"]),
            "required_experience_years": data["expected_experience_years"],
        }
        actual = {
            "canonical_title": parsed.canonical_title,
            "seniority": parsed.seniority,
            "required_skills": parsed.required_skills,
            "preferred_skills": parsed.preferred_skills,
            "required_experience_years": parsed.required_experience_years,
        }
        passed = (
            actual["canonical_title"] == exp["canonical_title"]
            and actual["seniority"] == exp["seniority"]
            and actual["required_skills"] == exp["required_skills"]
            and actual["required_experience_years"] == exp["required_experience_years"]
        )
        jd_cases.append({"fixture": name, "kind": "JD_JSON", "expected": exp, "actual": actual, "passed": passed})

    for name, title, exp in (
        (
            "jd_en_freeform.txt",
            "Senior Backend Developer",
            {
                "canonical_title": "Backend Developer",
                "seniority": "Senior",
                "required_skills_subset": ["AWS", "CI/CD", "Docker", "Java", "Kubernetes", "Microservices", "PostgreSQL", "REST API", "Spring Boot"],
                "preferred_skills_subset": ["Kafka"],
                "required_experience_years": 4,
            },
        ),
        (
            "jd_vi_freeform.txt",
            "Lập trình viên Backend Java (Senior)",
            {
                "canonical_title": "Backend Developer",
                "seniority": "Senior",
                "required_skills_subset": ["CI/CD", "Docker", "Java", "Microservices", "PostgreSQL", "Spring Boot"],
                "preferred_skills_subset": ["Kafka", "Redis"],
                "required_experience_years": 3,
            },
        ),
    ):
        text = (FIXTURES_DIR / name).read_text(encoding="utf-8")
        parsed = normalize_jd(title, text, text)
        actual = {
            "canonical_title": parsed.canonical_title,
            "seniority": parsed.seniority,
            "required_skills": parsed.required_skills,
            "preferred_skills": parsed.preferred_skills,
            "required_experience_years": parsed.required_experience_years,
        }
        passed = (
            actual["canonical_title"] == exp["canonical_title"]
            and actual["seniority"] == exp["seniority"]
            and actual["required_experience_years"] == exp["required_experience_years"]
            and set(exp["required_skills_subset"]).issubset(set(actual["required_skills"]))
            and set(exp["preferred_skills_subset"]).issubset(set(actual["preferred_skills"]))
            and not set(exp["preferred_skills_subset"]).intersection(set(actual["required_skills"]))
        )
        jd_cases.append({"fixture": name, "kind": "JD_TEXT", "expected": exp, "actual": actual, "passed": passed})

    all_cases = cv_results + jd_cases
    passed_count = sum(1 for c in all_cases if c["passed"])
    return {
        "total_checks": len(all_cases),
        "passed_checks": passed_count,
        "failed_checks": len(all_cases) - passed_count,
        "all_passed": passed_count == len(all_cases),
        "cases": all_cases,
    }


def benchmark_matching_and_ranking() -> Dict[str, Any]:
    """Suite 2: Matching, Ranking & Explanation on Fixed 18-Pair Dataset."""
    hybrid_eval = evaluate_dataset(DATASET_PATH, rule_weight=0.60, semantic_weight=0.40, shortlist_threshold=70)
    rule_eval = evaluate_dataset(DATASET_PATH, rule_weight=1.00, semantic_weight=0.00, shortlist_threshold=70)

    threshold_sweep_hybrid = run_threshold_sweep(DATASET_PATH, rule_weight=0.60, semantic_weight=0.40)
    threshold_sweep_rule = run_threshold_sweep(DATASET_PATH, rule_weight=1.00, semantic_weight=0.00)
    weight_sweep = run_weight_sweep(DATASET_PATH, threshold=70)

    hybrid_by_pair = {p["pair_id"]: p for p in hybrid_eval["per_pair_results"]}
    rule_by_pair = {p["pair_id"]: p for p in rule_eval["per_pair_results"]}
    raw_dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    per_pair_expected_vs_actual = []
    for raw_pair in raw_dataset["pairs"]:
        pid = raw_pair["pair_id"]
        hp = hybrid_by_pair[pid]
        rp = rule_by_pair[pid]
        per_pair_expected_vs_actual.append({
            "pair_id": pid,
            "jd_id": raw_pair["jd_id"],
            "cv_id": raw_pair["cv_id"],
            "cv_char_count": len(raw_pair["cv_text"]),
            "expected": {
                "relevance_grade": raw_pair["relevance_grade"],
                "expected_relative_order": raw_pair["expected_relative_order"],
                "shortlist_eligible": raw_pair["shortlist_eligible"],
            },
            "actual": {
                "predicted_rank_hybrid": hp["predicted_rank"],
                "predicted_rank_rule_baseline": rp["predicted_rank"],
                "rule_score": hp["rule_score"],
                "skills_score": hp["skills_score"],
                "experience_score": hp["experience_score"],
                "semantic_score": hp["semantic_score"],
                "hybrid_score": hp["hybrid_score"],
                "predicted_shortlist_70_hybrid": hp["hybrid_score"] >= 70,
                "predicted_review_50_hybrid": hp["hybrid_score"] >= 50,
                "predicted_shortlist_70_rule_baseline": rp["hybrid_score"] >= 70,
                "predicted_review_50_rule_baseline": rp["hybrid_score"] >= 50,
                "required_skills": hp["required_skills"],
                "matched_skills": hp["matched_skills"],
                "missing_skills": hp["missing_skills"],
                "experience_gated": hp["experience_gated"],
                "rationale": hp["rationale"],
            },
        })

    return {
        "dataset_version": raw_dataset.get("dataset_version"),
        "dataset_sha256": sha256_file(DATASET_PATH),
        "hybrid_demo_frozen_60_40": hybrid_eval,
        "rule_baseline_fallback_100_0": rule_eval,
        "threshold_sweep_hybrid_60_40": threshold_sweep_hybrid,
        "threshold_sweep_rule_baseline_100_0": threshold_sweep_rule,
        "weight_sweep_threshold_70": weight_sweep,
        "per_pair_expected_vs_actual": per_pair_expected_vs_actual,
    }


def benchmark_fallback_resilience() -> Dict[str, Any]:
    """Suite 4: Fallback & Failure Resilience (expected vs actual)."""
    cases = []

    # 1. Empty OpenAI API key -> deterministic provider without raising
    p_empty = OpenAIProvider(api_key="")
    vecs, model = p_empty.generate_embeddings_with_model(["Senior Java Developer"])
    cases.append({
        "scenario": "openai_empty_api_key",
        "expected": {"dimension": 1536, "model": DETERMINISTIC_EMBEDDING_MODEL},
        "actual": {"dimension": len(vecs[0]), "model": model},
        "passed": len(vecs) == 1 and len(vecs[0]) == 1536 and model == DETERMINISTIC_EMBEDDING_MODEL,
    })

    # 2. HTTP 429 / 500 with fallback enabled
    for code in (429, 500):
        with patch("app.services.providers.httpx.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = code
            mock_post.return_value = mock_resp
            p = OpenAIProvider(api_key="sk-test-only", allow_fallback=True)
            vecs, model = p.generate_embeddings_with_model(["Fallback test"])
            cases.append({
                "scenario": f"openai_http_{code}_fallback_enabled",
                "expected": {"dimension": 1536, "model": DETERMINISTIC_EMBEDDING_FALLBACK_MODEL},
                "actual": {"dimension": len(vecs[0]), "model": model},
                "passed": len(vecs[0]) == 1536 and model == DETERMINISTIC_EMBEDDING_FALLBACK_MODEL,
            })

    # 3. Timeout with fallback enabled vs disabled
    with patch("app.services.providers.httpx.post") as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Timed out")
        p_fb = OpenAIProvider(api_key="sk-test-only", allow_fallback=True)
        vecs, model = p_fb.generate_embeddings_with_model(["Timeout test"])
        cases.append({
            "scenario": "openai_timeout_fallback_enabled",
            "expected": {"dimension": 1536, "model": DETERMINISTIC_EMBEDDING_FALLBACK_MODEL},
            "actual": {"dimension": len(vecs[0]), "model": model},
            "passed": len(vecs[0]) == 1536 and model == DETERMINISTIC_EMBEDDING_FALLBACK_MODEL,
        })

        p_strict = OpenAIProvider(api_key="sk-test-only", allow_fallback=False)
        raised = False
        err_msg = ""
        try:
            p_strict.generate_embeddings_with_model(["Timeout strict test"])
        except RuntimeError as exc:
            raised = True
            err_msg = str(exc)
        cases.append({
            "scenario": "openai_timeout_fallback_disabled_strict",
            "expected": {"raises": "RuntimeError", "prevents_vector_space_mixing": True},
            "actual": {"raised": raised, "message": err_msg},
            "passed": raised and "vector-space mixing" in err_msg,
        })

    # 4. Zero-skill experience gating
    det = DeterministicTestProvider()
    gated = det.calculate_match(
        MatchScoreRequest(
            job_title="Senior Backend Engineer",
            job_requirements="Requires 4 years experience with Java, Spring Boot, PostgreSQL.",
            cv_text="Executive Chef with 8 years experience in culinary management.",
            candidate_skills=["Cooking", "Menu Design"],
        )
    )
    cases.append({
        "scenario": "zero_skill_experience_gating",
        "expected": {"overall_score": 0, "skills_score": 0, "experience_score": 0, "experience_gated": True},
        "actual": {
            "overall_score": gated.overall_score,
            "skills_score": gated.skills_score,
            "experience_score": gated.experience_score,
            "experience_gated": gated.breakdown.get("experience_gated"),
            "rationale": gated.rationale,
        },
        "passed": (
            gated.overall_score == 0
            and gated.skills_score == 0
            and gated.experience_score == 0
            and gated.breakdown.get("experience_gated") is True
            and "gated to 0%" in (gated.rationale or "")
        ),
    })

    passed_count = sum(1 for c in cases if c["passed"])
    return {
        "total_checks": len(cases),
        "passed_checks": passed_count,
        "failed_checks": len(cases) - passed_count,
        "all_passed": passed_count == len(cases),
        "cases": cases,
    }


def benchmark_latency(warmup: int, iterations: int) -> List[Dict[str, Any]]:
    """Suite 5: 18-stage processing time benchmark."""
    provider = DeterministicTestProvider()

    en_pdf_bytes = (FIXTURES_DIR / "cv_en_backend.pdf").read_bytes()
    en_docx_bytes = (FIXTURES_DIR / "cv_en_backend.docx").read_bytes()
    vi_docx_bytes = (FIXTURES_DIR / "cv_vi_backend.docx").read_bytes()
    min_pdf_bytes = (FIXTURES_DIR / "cv_minimal.pdf").read_bytes()

    en_cv_text, _ = extract_cv_text("cv_en_backend.docx", en_docx_bytes)
    vi_cv_text, _ = extract_cv_text("cv_vi_backend.docx", vi_docx_bytes)
    en_jd_text = (FIXTURES_DIR / "jd_en_freeform.txt").read_text(encoding="utf-8")
    vi_jd_text = (FIXTURES_DIR / "jd_vi_freeform.txt").read_text(encoding="utf-8")

    en_match_req = MatchScoreRequest(
        job_id="job-en-1",
        job_title="Senior Java Developer",
        job_description="Microservices with Java and Spring Boot.",
        job_requirements="Requires 4 years experience with Java, Spring Boot, PostgreSQL, Docker.",
        cv_text=en_cv_text,
    )
    vi_match_req = MatchScoreRequest(
        job_id="job-vi-1",
        job_title="Kỹ sư Backend Senior",
        job_description="Phát triển hệ thống microservices.",
        job_requirements="Yêu cầu 3 năm kinh nghiệm với Java, Spring Boot, Docker, PostgreSQL.",
        cv_text=vi_cv_text,
    )

    def rank_candidates(count: int):
        items = []
        for i in range(count):
            req = MatchScoreRequest(
                job_id=en_match_req.job_id,
                job_title=en_match_req.job_title,
                job_description=en_match_req.job_description,
                job_requirements=en_match_req.job_requirements,
                cv_text=en_match_req.cv_text + (f" Additional experience: {i} years with Java" if i % 2 == 0 else ""),
            )
            score_resp = provider.calculate_match(req)
            items.append({"id": f"app-{i:03d}", "overall_score": score_resp.overall_score, "applied_at": 1700000000 + i * 60})
        items.sort(key=lambda x: (-x["overall_score"], x["applied_at"], x["id"]))
        return items

    stages = [
        ("Document Extraction", "PDF Extraction (EN, 873 B)", lambda: extract_cv_text("cv_en_backend.pdf", en_pdf_bytes)),
        ("Document Extraction", "PDF Extraction (Minimal, 598 B)", lambda: extract_cv_text("cv_minimal.pdf", min_pdf_bytes)),
        ("Document Extraction", "DOCX Extraction (EN, 36.9 KB)", lambda: extract_cv_text("cv_en_backend.docx", en_docx_bytes)),
        ("Document Extraction", "DOCX Extraction (VI, 36.9 KB)", lambda: extract_cv_text("cv_vi_backend.docx", vi_docx_bytes)),
        ("Normalization", "CV Normalization (EN text, ~1.2 KB)", lambda: normalize_cv(en_cv_text)),
        ("Normalization", "CV Normalization (VI text, ~1.2 KB)", lambda: normalize_cv(vi_cv_text)),
        ("Normalization", "JD Normalization (EN free-form, 633 B)", lambda: normalize_jd("Backend Engineer", "", en_jd_text)),
        ("Normalization", "JD Normalization (VI free-form, 839 B)", lambda: normalize_jd("Kỹ sư Backend", "", vi_jd_text)),
        ("Baseline Matching", "Matching Calculation (EN candidate & JD)", lambda: provider.calculate_match(en_match_req)),
        ("Baseline Matching", "Matching Calculation (VI candidate & JD)", lambda: provider.calculate_match(vi_match_req)),
        (
            "End-to-End Pipeline",
            "End-to-End EN (DOCX extract -> Match)",
            lambda: provider.calculate_match(
                MatchScoreRequest(
                    job_id="job-en-e2e",
                    job_title="Senior Java Developer",
                    job_description="",
                    job_requirements=en_jd_text,
                    cv_text=extract_cv_text("cv_en_backend.docx", en_docx_bytes)[0],
                )
            ),
        ),
        (
            "End-to-End Pipeline",
            "End-to-End VI (DOCX extract -> Match)",
            lambda: provider.calculate_match(
                MatchScoreRequest(
                    job_id="job-vi-e2e",
                    job_title="Kỹ sư Backend",
                    job_description="",
                    job_requirements=vi_jd_text,
                    cv_text=extract_cv_text("cv_vi_backend.docx", vi_docx_bytes)[0],
                )
            ),
        ),
        ("Embedding (Synthetic)", "Synthetic 1536d SHA-256 (1 chunk)", lambda: provider.generate_embeddings([en_cv_text])),
        ("Embedding (Synthetic)", "Synthetic 1536d SHA-256 (Batch 10 chunks)", lambda: provider.generate_embeddings([en_cv_text + f" chunk {i}" for i in range(10)])),
        ("Embedding (Synthetic)", "Synthetic 1536d SHA-256 (Batch 50 chunks)", lambda: provider.generate_embeddings([en_cv_text + f" chunk {i}" for i in range(50)])),
        ("Batch Rank (Local Sim)", "Local Simulation (1 candidate vs 1 JD)", lambda: rank_candidates(1)),
        ("Batch Rank (Local Sim)", "Local Simulation (10 candidates vs 1 JD)", lambda: rank_candidates(10)),
        ("Batch Rank (Local Sim)", "Local Simulation (50 candidates vs 1 JD)", lambda: rank_candidates(50)),
    ]

    results = []
    for stage, fixture_name, fn in stages:
        for _ in range(warmup):
            fn()
        lats = []
        for _ in range(iterations):
            t0 = time.perf_counter()
            fn()
            lats.append((time.perf_counter() - t0) * 1000.0)
        results.append({
            "stage": stage,
            "fixture": fixture_name,
            "warmup": warmup,
            "iterations": iterations,
            **compute_stats(lats),
        })
    return results


def build_deterministic_snapshot(
    seed: int,
    parsing_res: Dict[str, Any],
    matching_res: Dict[str, Any],
    stability_res: Dict[str, Any],
    fallback_res: Dict[str, Any],
) -> Dict[str, Any]:
    """Build the strictly deterministic expected-vs-actual payload (no volatile timestamps/latencies)."""
    settings = get_settings()
    return {
        "seed": seed,
        "frozen_versions": {
            "ai_model_freeze_version": settings.AI_MODEL_FREEZE_VERSION,
            "extractor_version": EXTRACTOR_VERSION,
            "normalizer_version": NORMALIZER_VERSION,
            "canonical_skill_entries": len(CANONICAL_SKILL_MAP),
            "canonical_skills_unique": len(set(CANONICAL_SKILL_MAP.values())),
            "rule_algorithm_version": RULE_ALGORITHM_VERSION,
            "rule_weights": {"skills": RULE_SKILLS_WEIGHT, "experience": RULE_EXPERIENCE_WEIGHT},
            "hybrid_weights": {"rule_weight": 0.60, "semantic_weight": 0.40},
            "deterministic_embedding_model": DETERMINISTIC_EMBEDDING_MODEL,
        },
        "parsing_and_normalization": parsing_res,
        "matching_and_ranking": matching_res,
        "stability": stability_res,
        "fallback_resilience": fallback_res,
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run reproducible MatchaJob AI final benchmark.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--warmup", type=int, default=5)
    parser.add_argument("--iterations", type=int, default=50)
    parser.add_argument("--stability-iterations", type=int, default=30)
    parser.add_argument(
        "--output",
        type=Path,
        default=EVAL_DIR / "results" / "final_benchmark_results.json",
    )
    parser.add_argument("--write-expected", type=Path, default=None)
    parser.add_argument("--verify-expected", type=Path, default=None)
    args = parser.parse_args(argv)

    random.seed(args.seed)

    parsing_res = benchmark_parsing_and_normalization()
    matching_res = benchmark_matching_and_ranking()
    stability_res = evaluate_stability(args.stability_iterations)
    fallback_res = benchmark_fallback_resilience()
    latency_res = benchmark_latency(args.warmup, args.iterations)

    snapshot = build_deterministic_snapshot(
        seed=args.seed,
        parsing_res=parsing_res,
        matching_res=matching_res,
        stability_res=stability_res,
        fallback_res=fallback_res,
    )

    if args.write_expected is not None:
        args.write_expected.parent.mkdir(parents=True, exist_ok=True)
        args.write_expected.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote deterministic expected snapshot: {args.write_expected}")

    verification_status = "NOT_REQUESTED"
    verification_mismatches: List[str] = []
    if args.verify_expected is not None:
        if not args.verify_expected.is_file():
            print(f"ERROR: Expected snapshot not found: {args.verify_expected}", file=sys.stderr)
            return 1
        expected_snapshot = json.loads(args.verify_expected.read_text(encoding="utf-8"))
        if snapshot == expected_snapshot:
            verification_status = "PASS"
        else:
            verification_status = "FAIL"
            for key in snapshot:
                if snapshot.get(key) != expected_snapshot.get(key):
                    verification_mismatches.append(f"Mismatch in top-level section '{key}'")

    full_report = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "git_commit": get_git_commit(),
            "reproduction_command": (
                f"PYTHONPATH=ai-worker uv run --python 3.12 --with-requirements ai-worker/requirements.txt "
                f"python evaluation/run_final_benchmark.py --seed {args.seed} --warmup {args.warmup} "
                f"--iterations {args.iterations} --stability-iterations {args.stability_iterations} "
                f"--output evaluation/results/final_benchmark_results.json "
                f"--verify-expected evaluation/results/expected_benchmark_snapshot.json"
            ),
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "seed": args.seed,
            "verification_status": verification_status,
        },
        **snapshot,
        "latency_benchmark": latency_res,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(full_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    hybrid_sum = matching_res["hybrid_demo_frozen_60_40"]["overall_summary"]
    hybrid_cls = matching_res["hybrid_demo_frozen_60_40"]["classification"]
    rule_sum = matching_res["rule_baseline_fallback_100_0"]["overall_summary"]
    rule_cls = matching_res["rule_baseline_fallback_100_0"]["classification"]

    print("=== MatchaJob Final Reproducible AI Benchmark ===")
    print(f"Seed: {args.seed} | Git Commit: {full_report['metadata']['git_commit']} | Dataset: {matching_res['dataset_version']}")
    print(f"Parsing & Normalization: {parsing_res['passed_checks']}/{parsing_res['total_checks']} PASS")
    print(
        f"Matching (Frozen Hybrid 60/40): Pooled Acc={hybrid_sum['pairwise_ranking']['pooled_pairwise_accuracy']:.4f}, "
        f"Macro Acc={hybrid_sum['pairwise_ranking']['macro_pairwise_accuracy']:.4f}, "
        f"NDCG@3={hybrid_sum['mean_ndcg_at_3_expected']:.4f}, "
        f"TH=70 P={hybrid_cls['precision']:.4f} R={hybrid_cls['recall']:.4f} F1={hybrid_cls['f1_score']:.4f}"
    )
    print(
        f"Matching (Rule Baseline 100/0): Pooled Acc={rule_sum['pairwise_ranking']['pooled_pairwise_accuracy']:.4f}, "
        f"Macro Acc={rule_sum['pairwise_ranking']['macro_pairwise_accuracy']:.4f}, "
        f"NDCG@3={rule_sum['mean_ndcg_at_3_expected']:.4f}, "
        f"TH=70 P={rule_cls['precision']:.4f} R={rule_cls['recall']:.4f} F1={rule_cls['f1_score']:.4f}"
    )
    print(
        f"Stability ({args.stability_iterations} runs): "
        f"Identical={stability_res['repeatability']['all_scores_identical_across_runs']}, "
        f"MaxStdDev={stability_res['repeatability']['score_std_dev_max']}, "
        f"Sanity={stability_res['ranking_sanity']['ranking_sanity_passed']}"
    )
    print(f"Fallback & Resilience: {fallback_res['passed_checks']}/{fallback_res['total_checks']} PASS")
    print(f"Latency Stages Measured: {len(latency_res)} (warmup={args.warmup}, iter={args.iterations})")
    print(f"Output saved: {args.output}")
    if args.verify_expected is not None:
        print(f"EXPECTED VS ACTUAL VERIFICATION: {verification_status}")
        for m in verification_mismatches:
            print(f"  - {m}", file=sys.stderr)

    if not parsing_res["all_passed"] or not fallback_res["all_passed"] or verification_status == "FAIL":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
