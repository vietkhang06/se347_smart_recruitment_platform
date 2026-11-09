"""
Tests for input robustness, boundaries, edge cases, and graceful degradations.
"""

import math
import sys
from pathlib import Path
import pytest

AI_WORKER_DIR = Path(__file__).resolve().parent.parent / "ai-worker"
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_WORKER_DIR))

from app.schemas.ai import MatchScoreRequest, MatchScoreResponse
from app.services.providers import DeterministicTestProvider, OpenAIProvider
from app.services.normalizer import normalize_cv, normalize_jd


@pytest.fixture
def provider():
    return DeterministicTestProvider()


def test_empty_cv_and_jd(provider):
    """Empty CV or minimal job title should be safely rejected or return 0, without uncaught 500 crashes."""
    # 1. Pydantic schema validation rejects empty job_title
    with pytest.raises(Exception):
        MatchScoreRequest(
            job_title="",
            cv_text="Some text",
        )

    # 2. Valid title but empty requirements & empty CV text evaluates cleanly to score 0
    req = MatchScoreRequest(
        job_title="General Role",
        job_description="",
        job_requirements="",
        cv_text="",
    )
    res = provider.calculate_match(req)
    assert res.overall_score == 0
    assert not math.isnan(res.overall_score)
    assert not math.isinf(res.overall_score)
    assert res.skills_score is None
    assert res.experience_score is None


def test_extremely_long_cv_and_jd(provider):
    """Very long CV text (>100KB) should parse safely without crashing or hanging."""
    long_cv = "Experienced Senior Java Developer with 5 years experience in Java, Spring Boot, Docker, PostgreSQL. " + ("Extra boilerplate text describing tasks and responsibilities. " * 3000)
    long_jd = "Senior Backend Engineer. " + ("Required experience with Java, Spring Boot, PostgreSQL, Docker, Microservices. " * 500)

    req = MatchScoreRequest(
        job_title="Senior Backend Engineer",
        job_requirements=long_jd,
        cv_text=long_cv,
    )
    res = provider.calculate_match(req)
    assert res.overall_score >= 80
    assert not math.isnan(res.overall_score)
    assert not math.isinf(res.overall_score)


def test_vietnamese_diacritics_and_mixed_language(provider):
    """Vietnamese diacritics and mixed English-Vietnamese text are preserved and matched."""
    req = MatchScoreRequest(
        job_title="Kỹ sư Lập trình Backend (Java)",
        job_requirements="Yêu cầu 3 năm kinh nghiệm với Java, Spring Boot, Docker, Cơ sở dữ liệu PostgreSQL.",
        cv_text="Kỹ sư phần mềm có 4 năm kinh nghiệm phát triển hệ thống với Java, Spring Boot, Docker và PostgreSQL.",
    )
    res = provider.calculate_match(req)
    assert res.overall_score >= 80
    assert "Java" in res.breakdown["required_skills_matched"]
    assert "Spring Boot" in res.breakdown["required_skills_matched"]


def test_embedding_dimension_and_finite_values(provider):
    """Vector embeddings must be finite, unit-norm, and match expected 1536 dimensions."""
    texts = ["", "Short test", "A " * 1000]
    vecs = provider.generate_embeddings(texts)
    assert len(vecs) == 3
    for v in vecs:
        assert len(v) == 1536
        assert all(math.isfinite(x) for x in v)
        # Check unit norm
        norm = math.sqrt(sum(x * x for x in v))
        assert abs(norm - 1.0) < 1e-4


def test_unrelated_candidate_with_high_experience_does_not_inflate_score(provider):
    """
    Regression test for experience inflation defect:
    An unrelated candidate with extensive experience (e.g., 8 years cooking) applying for
    a role requiring technical skills + experience must receive 0 experience credit when
    zero required skills are matched.
    """
    req_unrelated = MatchScoreRequest(
        job_title="Senior Backend Engineer",
        job_requirements="Requires 4 years experience with Java, Spring Boot, PostgreSQL, Docker, Microservices.",
        cv_text="Executive Chef with 8 years experience managing kitchen staff, food preparation, and menu safety.",
        candidate_skills=["Cooking", "Menu Planning", "Food Safety"],
    )
    res_unrelated = provider.calculate_match(req_unrelated)
    assert res_unrelated.skills_score == 0
    assert res_unrelated.overall_score == 0
    assert res_unrelated.breakdown["required_skills_matched"] == []

    # Contrast with a partially qualified candidate who has 2 years and matched skills
    req_partial = MatchScoreRequest(
        job_title="Senior Backend Engineer",
        job_requirements="Requires 4 years experience with Java, Spring Boot, PostgreSQL, Docker, Microservices.",
        cv_text="Software Developer with 2 years experience in Java and MySQL.",
        candidate_skills=["Java", "MySQL"],
    )
    res_partial = provider.calculate_match(req_partial)
    assert res_partial.skills_score > 0
    assert res_partial.overall_score > res_unrelated.overall_score


def test_missing_skill_or_experience_information_behavior(provider):
    """
    Candidates with missing skill information or missing experience duration
    should not crash and should not be awarded unearned points.
    """
    # 1. Missing candidate skills in CV
    req_no_skills = MatchScoreRequest(
        job_title="Backend Engineer",
        job_requirements="Requires 3 years experience with Java, Spring Boot.",
        cv_text="Professional with 4 years general experience in business analysis.",
        candidate_skills=[],
    )
    res_no_skills = provider.calculate_match(req_no_skills)
    assert res_no_skills.skills_score == 0
    assert res_no_skills.overall_score == 0

    # 2. Known skills but unspecified experience duration
    req_no_exp = MatchScoreRequest(
        job_title="Backend Engineer",
        job_requirements="Requires 3 years experience with Java, Spring Boot.",
        cv_text="Software Engineer skilled in Java and Spring Boot.",
        candidate_skills=["Java", "Spring Boot"],
    )
    res_no_exp = provider.calculate_match(req_no_exp)
    assert res_no_exp.skills_score == 100
    assert res_no_exp.experience_score is None
    # Receives skill points only (60 points)
    assert res_no_exp.overall_score == 60


def test_openai_provider_fallback_on_invalid_credentials():
    """Unconfigured OpenAI provider falls back safely without leaking or throwing."""
    p = OpenAIProvider(api_key="")
    req = MatchScoreRequest(
        job_title="Java Developer",
        job_requirements="Java, Spring Boot",
        cv_text="Java Developer with Spring Boot",
    )
    res = p.calculate_match(req)
    assert res.overall_score > 0
    assert not math.isnan(res.overall_score)


def test_experience_gating_boundary_and_empty_skill_set(provider):
    """
    Validates all 7 experience-gating scenarios per DO 3.2:
    1. Five required skills, zero matched -> unrelated candidate gets 0 exp credit.
    2. Five required skills, one matched -> binary gating grants full experience credit.
    3. Five required skills, all matched -> full skills and experience credit.
    4. No required skills, but explicit experience requirement -> experience evaluated independently.
    5. No required skills and no experience requirement -> score 0.
    6. Required skills matched, but candidate experience missing -> only skills credited.
    7. Required skills missing from candidate input -> unrelated experience receives 0 points.
    """
    # Case 1: 5 required skills, 0 matched, 5 yrs exp vs 5 yrs required
    r1 = provider.calculate_match(MatchScoreRequest(
        job_id="case1", job_title="Backend Engineer",
        job_requirements="Required skills: Python, Django, PostgreSQL, Docker, AWS. Requires 5 years experience.",
        candidate_skills=["Cooking", "Pastry"],
        cv_text="Head Chef with 5 years experience in culinary arts."
    ))
    assert r1.skills_score == 0
    assert r1.overall_score == 0
    assert r1.breakdown["required_skills_matched"] == []

    # Case 2 (Boundary): 5 required skills, 1 matched, 5 yrs exp vs 5 yrs required
    # Binary gating gives 100% of experience points (40 pts) + 20% of skill points (12 pts) = 52 pts
    r2 = provider.calculate_match(MatchScoreRequest(
        job_id="case2", job_title="Backend Engineer",
        job_requirements="Required skills: Python, Django, PostgreSQL, Docker, AWS. Requires 5 years experience.",
        candidate_skills=["Python"],
        cv_text="Developer with 5 years experience in Python programming."
    ))
    assert r2.skills_score == 20
    assert r2.experience_score == 100
    assert r2.overall_score == 52

    # Case 3: 5 required skills, 5 matched, 5 yrs exp vs 5 yrs required
    r3 = provider.calculate_match(MatchScoreRequest(
        job_id="case3", job_title="Backend Engineer",
        job_requirements="Required skills: Python, Django, PostgreSQL, Docker, AWS. Requires 5 years experience.",
        candidate_skills=["Python", "Django", "PostgreSQL", "Docker", "AWS"],
        cv_text="Senior Developer with 5 years experience in Python, Django, PostgreSQL, Docker, AWS."
    ))
    assert r3.skills_score == 100
    assert r3.experience_score == 100
    assert r3.overall_score == 100

    # Case 4: No required skills, but explicit experience requirement
    r4 = provider.calculate_match(MatchScoreRequest(
        job_id="case4", job_title="Operations Associate",
        job_requirements="Experience: at least 5 years experience. No specific software required.",
        candidate_skills=[],
        cv_text="Professional with 5 years experience in logistics."
    ))
    assert r4.skills_score is None
    assert r4.experience_score == 100
    assert r4.overall_score == 100

    # Case 5: No required skills and no experience requirement
    r5 = provider.calculate_match(MatchScoreRequest(
        job_id="case5", job_title="Intern",
        job_requirements="No prerequisites required.",
        candidate_skills=[],
        cv_text="Recent graduate."
    ))
    assert r5.skills_score is None
    assert r5.experience_score is None
    assert r5.overall_score == 0

    # Case 6: Required skills matched, but candidate experience missing
    r6 = provider.calculate_match(MatchScoreRequest(
        job_id="case6", job_title="Backend Engineer",
        job_requirements="Required skills: Python, Django, PostgreSQL, Docker, AWS. Requires 5 years experience.",
        candidate_skills=["Python", "Django", "PostgreSQL", "Docker", "AWS"],
        cv_text="Developer skilled in Python, Django, PostgreSQL, Docker, AWS."
    ))
    assert r6.skills_score == 100
    assert r6.experience_score is None
    assert r6.overall_score == 60

    # Case 7: Required skills missing from candidate input, 5 yrs exp
    r7 = provider.calculate_match(MatchScoreRequest(
        job_id="case7", job_title="Backend Engineer",
        job_requirements="Required skills: Python, Django, PostgreSQL, Docker, AWS. Requires 5 years experience.",
        candidate_skills=[],
        cv_text="Operations worker with 5 years experience."
    ))
    assert r7.skills_score == 0
    assert r7.overall_score == 0

