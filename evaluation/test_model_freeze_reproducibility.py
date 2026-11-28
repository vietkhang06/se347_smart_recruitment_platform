"""
Verification tests for AI Model Freeze integrity and deterministic benchmark reproducibility.

Ensures:
1. Live AI Worker constants/settings match evaluation/model_freeze_manifest.json.
2. Backend scoring configuration (application.yml & MatchingScoringProperties.java) matches manifest.
3. SHA-256 checksums of all frozen schemas, datasets, fixtures, and snapshots match disk.
4. Re-running the deterministic benchmark produces output byte-for-byte consistent with
   evaluation/results/expected_benchmark_snapshot.json.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
AI_WORKER_DIR = REPO_ROOT / "ai-worker"
EVAL_DIR = REPO_ROOT / "evaluation"
MANIFEST_PATH = EVAL_DIR / "model_freeze_manifest.json"
EXPECTED_SNAPSHOT_PATH = EVAL_DIR / "results" / "expected_benchmark_snapshot.json"

for p in (str(REPO_ROOT), str(AI_WORKER_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.config import Settings
from app.services.extractor import (
    EXTRACTOR_VERSION,
    MAX_CHARACTERS,
    MAX_FILE_SIZE_BYTES,
    MAX_PDF_PAGES,
)
from app.services.normalizer import CANONICAL_SKILL_MAP, NORMALIZER_VERSION
from app.services.providers import (
    DETERMINISTIC_EMBEDDING_FALLBACK_MODEL,
    DETERMINISTIC_EMBEDDING_MODEL,
    RULE_ALGORITHM_VERSION,
    RULE_EXPERIENCE_WEIGHT,
    RULE_SKILLS_WEIGHT,
)
from evaluation.evaluate_stability import evaluate_stability
from evaluation.run_final_benchmark import (
    DEFAULT_SEED,
    benchmark_fallback_resilience,
    benchmark_matching_and_ranking,
    benchmark_parsing_and_normalization,
    build_deterministic_snapshot,
)


def _load_manifest():
    assert MANIFEST_PATH.is_file(), f"Missing freeze manifest: {MANIFEST_PATH}"
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def test_python_frozen_constants_match_manifest():
    manifest = _load_manifest()
    settings = Settings()

    sv = manifest["service_versions"]
    assert settings.SERVICE_NAME == sv["ai_worker_service_name"]
    assert settings.VERSION == sv["ai_worker_version"]
    assert settings.AI_MODEL_FREEZE_VERSION == manifest["freeze_version"]
    assert EXTRACTOR_VERSION == sv["extractor_version"]
    assert NORMALIZER_VERSION == sv["normalizer_version"]
    assert RULE_ALGORITHM_VERSION == sv["rule_algorithm_version"]

    limits = manifest["extraction_limits"]
    assert MAX_FILE_SIZE_BYTES == limits["max_file_size_bytes"]
    assert MAX_PDF_PAGES == limits["max_pdf_pages"]
    assert MAX_CHARACTERS == limits["max_characters"]

    tax = manifest["normalization_taxonomy"]
    assert len(CANONICAL_SKILL_MAP) == tax["canonical_skill_entries"]
    assert len(set(CANONICAL_SKILL_MAP.values())) == tax["canonical_skills_unique"]

    emb = manifest["embedding_providers"]
    assert settings.AI_PROVIDER == emb["demo_default_provider"]
    assert DETERMINISTIC_EMBEDDING_MODEL == emb["deterministic_embedding_model"]
    assert DETERMINISTIC_EMBEDDING_FALLBACK_MODEL == emb["deterministic_fallback_model"]
    assert settings.AI_EMBEDDING_MODEL == emb["production_embedding_model"]
    assert settings.AI_MODEL == emb["production_llm_model_placeholder"]
    assert settings.AI_EMBEDDING_DIMENSION == emb["embedding_dimension"]
    assert settings.AI_TIMEOUT_SECONDS == emb["ai_timeout_seconds"]
    assert settings.AI_EMBEDDING_FALLBACK_ENABLED is emb["ai_embedding_fallback_enabled"]

    rule_weights = manifest["scoring_weights"]["rule_internal"]
    assert RULE_SKILLS_WEIGHT == rule_weights["skills_weight"]
    assert RULE_EXPERIENCE_WEIGHT == rule_weights["experience_weight"]


def test_pinned_requirements_match_manifest():
    manifest = _load_manifest()
    req_lines = [
        line.strip()
        for line in (AI_WORKER_DIR / "requirements.txt").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    parsed = {}
    for line in req_lines:
        pkg, ver = line.split("==", 1)
        parsed[pkg] = ver
    assert parsed == manifest["pinned_runtime_dependencies"]


def test_backend_config_matches_manifest():
    manifest = _load_manifest()
    sv = manifest["service_versions"]
    hybrid = manifest["scoring_weights"]["hybrid_demo_default"]
    thresholds = manifest["decision_thresholds"]

    yml_text = (REPO_ROOT / "backend" / "src" / "main" / "resources" / "application.yml").read_text(encoding="utf-8")
    assert f"MATCHAJOB_SCORING_CONFIG_VERSION:{sv['backend_config_version']}" in yml_text
    assert f"MATCHAJOB_SCORING_ALGORITHM_ID:{sv['backend_algorithm_id']}" in yml_text
    assert f"MATCHAJOB_SCORING_RULE_WEIGHT:{hybrid['rule_weight']:.2f}" in yml_text
    assert f"MATCHAJOB_SCORING_SEMANTIC_WEIGHT:{hybrid['semantic_weight']:.2f}" in yml_text
    assert f"MATCHAJOB_SCORING_SHORTLIST_THRESHOLD:{thresholds['shortlist_threshold']}" in yml_text
    assert f"MATCHAJOB_SCORING_REVIEW_THRESHOLD:{thresholds['review_threshold']}" in yml_text

    java_text = (
        REPO_ROOT / "backend" / "src" / "main" / "java" / "com" / "matchajob" / "matching" / "service" / "MatchingScoringProperties.java"
    ).read_text(encoding="utf-8")
    assert f'configVersion = "{sv["backend_config_version"]}"' in java_text
    assert f'algorithmId = "{sv["backend_algorithm_id"]}"' in java_text
    assert re.search(rf"ruleWeight\s*=\s*{hybrid['rule_weight']:.2f}\s*;", java_text)
    assert re.search(rf"semanticWeight\s*=\s*{hybrid['semantic_weight']:.2f}\s*;", java_text)
    assert re.search(rf"shortlistThreshold\s*=\s*{thresholds['shortlist_threshold']}\s*;", java_text)
    assert re.search(rf"reviewThreshold\s*=\s*{thresholds['review_threshold']}\s*;", java_text)


def test_frozen_artifact_sha256_checksums():
    manifest = _load_manifest()
    checksums = manifest["frozen_artifact_sha256"]
    assert len(checksums) >= 20
    for rel_path, expected_sha in checksums.items():
        target = REPO_ROOT / rel_path
        assert target.is_file(), f"Frozen artifact missing: {rel_path}"
        actual_sha = hashlib.sha256(target.read_bytes()).hexdigest()
        assert actual_sha == expected_sha, f"Checksum drift detected for {rel_path}: {actual_sha} != {expected_sha}"


def test_deterministic_benchmark_matches_expected_snapshot():
    manifest = _load_manifest()
    assert EXPECTED_SNAPSHOT_PATH.is_file(), f"Missing expected snapshot: {EXPECTED_SNAPSHOT_PATH}"
    expected = json.loads(EXPECTED_SNAPSHOT_PATH.read_text(encoding="utf-8"))

    actual = build_deterministic_snapshot(
        seed=manifest["benchmark_reproducibility"]["seed"],
        parsing_res=benchmark_parsing_and_normalization(),
        matching_res=benchmark_matching_and_ranking(),
        stability_res=evaluate_stability(30),
        fallback_res=benchmark_fallback_resilience(),
    )
    assert manifest["benchmark_reproducibility"]["seed"] == DEFAULT_SEED
    assert actual == expected
