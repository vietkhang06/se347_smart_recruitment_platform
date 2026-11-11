"""
Benchmark script measuring component processing times for MatchaJob AI Worker.

Evaluates:
1. Document text extraction (PDF, DOCX)
2. CV and JD data normalization (EN, VI)
3. Deterministic weighted baseline matching
4. Full end-to-end processing pipeline

Uses high-resolution monotonic timer (time.perf_counter).
"""

import os
import sys
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any

# Suppress pypdf log noise
logging.getLogger("pypdf").setLevel(logging.ERROR)

# Ensure ai-worker is in PYTHONPATH
CURRENT_DIR = Path(__file__).resolve().parent
AI_WORKER_DIR = CURRENT_DIR.parent
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_WORKER_DIR))

from app.services.extractor import extract_cv_text
from app.services.normalizer import normalize_cv, normalize_jd
from app.services.providers import DeterministicTestProvider
from app.schemas.ai import MatchScoreRequest

FIXTURES_DIR = AI_WORKER_DIR / "tests" / "fixtures"


def compute_stats(latencies_ms: List[float]) -> Dict[str, float]:
    sorted_lats = sorted(latencies_ms)
    n = len(sorted_lats)
    mean = sum(sorted_lats) / n
    p50 = sorted_lats[int(n * 0.50)]
    p95 = sorted_lats[min(int(n * 0.95), n - 1)]
    return {
        "mean_ms": round(mean, 3),
        "p50_ms": round(p50, 3),
        "p95_ms": round(p95, 3),
        "min_ms": round(sorted_lats[0], 3),
        "max_ms": round(sorted_lats[-1], 3),
    }


def run_benchmark(warmup: int = 5, iterations: int = 50):
    print(f"=== MatchaJob AI Worker Processing Time Benchmark ===")
    print(f"Python: {sys.version.split()[0]} | Platform: {sys.platform}")
    print(f"Warmup runs: {warmup} | Measured iterations: {iterations}")
    print("NOTE: Stages 1-4 benchmark real document extractors and rule normalizers.")
    print("      Stage 5 reflects in-memory synthetic provider embeddings (SHA-256 derivation).")
    print("      Stage 6 reflects local deterministic batch ranking simulation.\n")

    provider = DeterministicTestProvider()

    # Load fixture files
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

    def rank_candidates_benchmark(p, base_req, count):
        items = []
        for i in range(count):
            req = MatchScoreRequest(
                job_id=base_req.job_id,
                job_title=base_req.job_title,
                job_description=base_req.job_description,
                job_requirements=base_req.job_requirements,
                cv_text=base_req.cv_text + (f" Additional experience: {i} years with Java" if i % 2 == 0 else ""),
            )
            score_resp = p.calculate_match(req)
            items.append({
                "id": f"app-{i:03d}",
                "overall_score": score_resp.overall_score,
                "applied_at": 1700000000 + i * 60,
            })
        # Stable deterministic sort: score DESC, applied_at ASC, id ASC
        items.sort(key=lambda x: (-x["overall_score"], x["applied_at"], x["id"]))
        for rank_idx, itm in enumerate(items, start=1):
            itm["rank"] = rank_idx
        return items

    stages = [
        # 1. Document Extraction
        {
            "stage": "Document Extraction",
            "name": "PDF Extraction (EN, 873 B)",
            "fn": lambda: extract_cv_text("cv_en_backend.pdf", en_pdf_bytes),
        },
        {
            "stage": "Document Extraction",
            "name": "PDF Extraction (Minimal, 598 B)",
            "fn": lambda: extract_cv_text("cv_minimal.pdf", min_pdf_bytes),
        },
        {
            "stage": "Document Extraction",
            "name": "DOCX Extraction (EN, 36.9 KB)",
            "fn": lambda: extract_cv_text("cv_en_backend.docx", en_docx_bytes),
        },
        {
            "stage": "Document Extraction",
            "name": "DOCX Extraction (VI, 36.9 KB)",
            "fn": lambda: extract_cv_text("cv_vi_backend.docx", vi_docx_bytes),
        },
        # 2. Normalization
        {
            "stage": "Normalization",
            "name": "CV Normalization (EN text, ~1.2 KB)",
            "fn": lambda: normalize_cv(en_cv_text),
        },
        {
            "stage": "Normalization",
            "name": "CV Normalization (VI text, ~1.2 KB)",
            "fn": lambda: normalize_cv(vi_cv_text),
        },
        {
            "stage": "Normalization",
            "name": "JD Normalization (EN free-form, 633 B)",
            "fn": lambda: normalize_jd("Backend Engineer", "", en_jd_text),
        },
        {
            "stage": "Normalization",
            "name": "JD Normalization (VI free-form, 839 B)",
            "fn": lambda: normalize_jd("Kỹ sư Backend", "", vi_jd_text),
        },
        # 3. Deterministic Baseline Matching
        {
            "stage": "Baseline Matching",
            "name": "Matching Calculation (EN candidate & JD)",
            "fn": lambda: provider.calculate_match(en_match_req),
        },
        {
            "stage": "Baseline Matching",
            "name": "Matching Calculation (VI candidate & JD)",
            "fn": lambda: provider.calculate_match(vi_match_req),
        },
        # 4. End-to-End Pipeline
        {
            "stage": "End-to-End Pipeline",
            "name": "End-to-End EN (DOCX extract -> Match)",
            "fn": lambda: provider.calculate_match(
                MatchScoreRequest(
                    job_id="job-en-e2e",
                    job_title="Senior Java Developer",
                    job_description="",
                    job_requirements=en_jd_text,
                    cv_text=extract_cv_text("cv_en_backend.docx", en_docx_bytes)[0],
                )
            ),
        },
        {
            "stage": "End-to-End Pipeline",
            "name": "End-to-End VI (DOCX extract -> Match)",
            "fn": lambda: provider.calculate_match(
                MatchScoreRequest(
                    job_id="job-vi-e2e",
                    job_title="Kỹ sư Backend",
                    job_description="",
                    job_requirements=vi_jd_text,
                    cv_text=extract_cv_text("cv_vi_backend.docx", vi_docx_bytes)[0],
                )
            ),
        },
        # 5. In-Memory Synthetic Embedding Generation
        {
            "stage": "Embedding (Synthetic)",
            "name": "Synthetic 1536d SHA-256 (1 chunk)",
            "fn": lambda: provider.generate_embeddings([en_cv_text]),
        },
        {
            "stage": "Embedding (Synthetic)",
            "name": "Synthetic 1536d SHA-256 (Batch 10 chunks)",
            "fn": lambda: provider.generate_embeddings([en_cv_text + f" chunk {i}" for i in range(10)]),
        },
        {
            "stage": "Embedding (Synthetic)",
            "name": "Synthetic 1536d SHA-256 (Batch 50 chunks)",
            "fn": lambda: provider.generate_embeddings([en_cv_text + f" chunk {i}" for i in range(50)]),
        },
        # 6. Local Batch Ranking Simulation (Score + Deterministic Tie-Break)
        {
            "stage": "Batch Rank (Local Sim)",
            "name": "Local Simulation (1 candidate vs 1 JD)",
            "fn": lambda: rank_candidates_benchmark(provider, en_match_req, 1),
        },
        {
            "stage": "Batch Rank (Local Sim)",
            "name": "Local Simulation (10 candidates vs 1 JD)",
            "fn": lambda: rank_candidates_benchmark(provider, en_match_req, 10),
        },
        {
            "stage": "Batch Rank (Local Sim)",
            "name": "Local Simulation (50 candidates vs 1 JD)",
            "fn": lambda: rank_candidates_benchmark(provider, en_match_req, 50),
        },
    ]

    results = []
    print(f"{'Stage':<22} | {'Input / Fixture':<42} | {'Iter':<5} | {'Mean (ms)':<10} | {'p50 (ms)':<10} | {'p95 (ms)':<10}")
    print("-" * 115)

    for item in stages:
        fn = item["fn"]
        # Warmup
        for _ in range(warmup):
            fn()

        # Measurement
        lats = []
        for _ in range(iterations):
            start = time.perf_counter()
            fn()
            duration_ms = (time.perf_counter() - start) * 1000.0
            lats.append(duration_ms)

        stats = compute_stats(lats)
        row = {
            "stage": item["stage"],
            "fixture": item["name"],
            "iterations": iterations,
            **stats,
        }
        results.append(row)
        print(f"{row['stage']:<22} | {row['fixture']:<42} | {iterations:<5} | {row['mean_ms']:<10.3f} | {row['p50_ms']:<10.3f} | {row['p95_ms']:<10.3f}")

    print("\n" + "=" * 115)
    return results


if __name__ == "__main__":
    warmup_count = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    iter_count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    run_benchmark(warmup=warmup_count, iterations=iter_count)
