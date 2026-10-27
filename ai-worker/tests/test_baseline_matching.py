"""Tests for Deterministic Baseline Scoring and Explanation Engine."""

import pytest
from app.schemas.ai import MatchScoreRequest
from app.services.providers import DeterministicTestProvider


@pytest.fixture
def provider():
    return DeterministicTestProvider()


def test_zero_match_candidate_scores_zero(provider):
    """
    Candidate with zero matching skills and no experience must score 0,
    NOT an inflated floor of 40 or fabricated skills.
    """
    request = MatchScoreRequest(
        job_title="Senior Java Developer",
        job_description="We need an expert in microservices.",
        job_requirements="Must have Java, Spring Boot, PostgreSQL, Docker.",
        cv_text="Graphic designer with experience in Photoshop, Figma, and Illustrator.",
        candidate_skills=["Photoshop", "Figma", "Illustrator"],
    )
    response = provider.calculate_match(request)

    assert response.skills_score == 0
    assert response.experience_score is None  # JD specifies no experience requirement
    assert response.overall_score == 0
    assert response.breakdown["required_skills_matched"] == []
    assert len(response.breakdown["missing_skills"]) == 4
    for skill in ["Java", "Spring Boot", "PostgreSQL", "Docker"]:
        assert skill in response.breakdown["missing_skills"]
    assert "Candidate matches 0 of 4 required skill(s)" in response.rationale
    assert "Missing skills: " in response.rationale


def test_complete_match_candidate_scores_100(provider):
    """Candidate with all required skills and full required experience scores 100."""
    request = MatchScoreRequest(
        job_title="Backend Developer",
        job_description="Build services with Java and Spring Boot.",
        job_requirements="Requires 3 years of experience in Java, Spring Boot, PostgreSQL.",
        cv_text="Backend engineer with 4 years of experience specializing in Java, Spring Boot, and PostgreSQL.",
        candidate_skills=["Java", "Spring Boot", "PostgreSQL"],
    )
    response = provider.calculate_match(request)

    # 3/3 skills = 100%, 4/3 exp >= 100% -> overall = 100
    assert response.skills_score == 100
    assert response.experience_score == 100
    assert response.overall_score == 100
    assert len(response.breakdown["required_skills_matched"]) == 3
    assert response.breakdown["missing_skills"] == []
    assert "Candidate matches all 3 required skill(s)" in response.rationale


def test_partial_match_exact_scoring_calculation(provider):
    """
    Test exact mathematical formula: 0.6 * skills_score + 0.4 * exp_score.
    Job requires 4 skills: Java, Spring Boot, PostgreSQL, Docker (4 years exp).
    Candidate has 2 skills (Java, PostgreSQL) and 2 years exp.
    Skills score: 2/4 = 50.
    Exp score: 2/4 = 50.
    Overall score: round(0.6 * 50 + 0.4 * 50) = 50.
    """
    request = MatchScoreRequest(
        job_title="Backend Developer",
        job_description="Develop microservices.",
        job_requirements="Requires 4 years experience. Skills: Java, Spring Boot, PostgreSQL, Docker.",
        cv_text="Software engineer with 2 years experience. Skilled in Java and PostgreSQL.",
        candidate_skills=["Java", "PostgreSQL"],
    )
    response = provider.calculate_match(request)

    assert response.skills_score == 50
    assert response.experience_score == 50
    assert response.overall_score == 50
    assert sorted(response.breakdown["required_skills_matched"]) == ["Java", "PostgreSQL"]
    assert sorted(response.breakdown["missing_skills"]) == ["Docker", "Spring Boot"]
    assert response.breakdown["candidate_experience_years"] == 2
    assert response.breakdown["required_experience_years"] == 4
    assert "Candidate matches 2 of 4 required skill(s)" in response.rationale
    assert "Docker, Spring Boot" in response.rationale or "Spring Boot, Docker" in response.rationale


def test_job_with_no_required_skills_does_not_divide_by_zero(provider):
    """If JD contains no extractable skills, scoring must not raise ZeroDivisionError and must not award unearned score."""
    request = MatchScoreRequest(
        job_title="General Office Worker",
        job_description="Daily administrative tasks.",
        job_requirements="Be hardworking and punctual.",
        cv_text="Office assistant with 3 years experience.",
    )
    response = provider.calculate_match(request)

    assert 0 <= response.overall_score <= 100
    assert response.skills_score is None  # Skills not evaluable
    assert response.experience_score is None  # JD specifies no required experience
    assert response.overall_score == 0  # Neither criterion evaluable
    assert response.breakdown["required_skills"] == []
    assert response.breakdown["required_skills_matched"] == []
    assert response.breakdown["missing_skills"] == []
    assert response.breakdown["candidate_experience_years"] == 3


def test_matching_is_deterministic_across_repeated_runs(provider):
    """Identical requests must produce identical scores across 20 repetitions."""
    request = MatchScoreRequest(
        job_title="Senior Python Developer",
        job_description="Backend web services using FastAPI.",
        job_requirements="Requirements: 3 years experience with Python, FastAPI, Docker, and PostgreSQL.",
        cv_text="Python Developer with 3 years experience in Python and FastAPI. Familiar with Git and Linux.",
        candidate_skills=["Python", "FastAPI"],
    )
    first_response = provider.calculate_match(request)

    for _ in range(20):
        subsequent = provider.calculate_match(request)
        assert subsequent.overall_score == first_response.overall_score
        assert subsequent.skills_score == first_response.skills_score
        assert subsequent.experience_score == first_response.experience_score
        assert subsequent.breakdown == first_response.breakdown
        assert subsequent.rationale == first_response.rationale


# =============================================================================
# Targeted Scoring Semantics & Edge-Case Audit Scenarios
# =============================================================================

def test_scenario_1_no_recognizable_requirements_zero_candidate_exp(provider):
    """Scenario 1: No recognizable requirements in JD, confirmed 0 candidate experience."""
    request = MatchScoreRequest(
        job_title="Staff",
        job_description="Join our energetic team.",
        job_requirements="",
        cv_text="Chưa có kinh nghiệm, tốt nghiệp cấp 3.",
    )
    res = provider.calculate_match(request)

    assert res.skills_score is None
    assert res.experience_score is None
    assert res.overall_score == 0
    assert res.breakdown["required_skills"] == []
    assert res.breakdown["required_skills_matched"] == []
    assert res.breakdown["missing_skills"] == []
    assert res.breakdown["candidate_experience_years"] == 0
    assert "No evaluable skill or experience requirements identified in job description" in res.rationale


def test_scenario_2_no_recognizable_requirements_nonzero_candidate_exp(provider):
    """Scenario 2: No recognizable requirements in JD, nonzero candidate experience (2 yrs)."""
    request = MatchScoreRequest(
        job_title="Team Member",
        job_description="Be hardworking and cooperative.",
        job_requirements="Good communication skills.",
        cv_text="Candidate with 2 years experience.",
    )
    res = provider.calculate_match(request)

    assert res.skills_score is None
    assert res.experience_score is None
    assert res.overall_score == 0
    assert res.breakdown["required_skills"] == []
    assert res.breakdown["required_skills_matched"] == []
    assert res.breakdown["missing_skills"] == []
    assert res.breakdown["candidate_experience_years"] == 2
    assert "No evaluable skill or experience requirements identified in job description" in res.rationale


def test_scenario_3_explicit_experience_no_skills_required(provider):
    """Scenario 3: Explicit experience requirement (3 yrs) but no required skills."""
    request = MatchScoreRequest(
        job_title="General Manager",
        job_description="Office management role.",
        job_requirements="Requires 3 years of work experience.",
        cv_text="Experienced professional with 3 years experience.",
    )
    res = provider.calculate_match(request)

    assert res.skills_score is None
    assert res.experience_score == 100
    assert res.overall_score == 100  # 100% on active experience criterion
    assert res.breakdown["required_skills"] == []
    assert res.breakdown["required_skills_matched"] == []
    assert res.breakdown["missing_skills"] == []
    assert res.breakdown["candidate_experience_years"] == 3
    assert res.breakdown["required_experience_years"] == 3
    assert "No specific technical skills required by job description" in res.rationale
    assert "Candidate meets experience requirement with 3 of 3 year(s)" in res.rationale

    # Sub-case: candidate has 0 years -> must receive 0 overall, NOT 60!
    zero_req = MatchScoreRequest(
        job_title="General Manager",
        job_description="Office management role.",
        job_requirements="Requires 3 years of work experience.",
        cv_text="Chưa có kinh nghiệm quản lý.",
    )
    zero_res = provider.calculate_match(zero_req)
    assert zero_res.skills_score is None
    assert zero_res.experience_score == 0
    assert zero_res.overall_score == 0


def test_scenario_4_required_skills_with_unknown_candidate_experience(provider):
    """Scenario 4: Required skills present, but candidate experience duration is unknown/unspecified."""
    request = MatchScoreRequest(
        job_title="Java Developer",
        job_description="Backend services",
        job_requirements="Requires Java, Spring Boot and 3 years experience.",
        cv_text="Java and Spring Boot developer. Graduated from university.",
        candidate_skills=["Java", "Spring Boot"],
    )
    res = provider.calculate_match(request)

    assert res.skills_score == 100
    assert res.experience_score is None  # Experience unknown, cannot be verified
    # Verified fit: 0.6 * 100 + 0.0 unverified exp = 60
    assert res.overall_score == 60
    assert sorted(res.breakdown["required_skills"]) == ["Java", "Spring Boot"]
    assert sorted(res.breakdown["required_skills_matched"]) == ["Java", "Spring Boot"]
    assert "candidate_experience_years" not in res.breakdown  # Not fabricated as 0
    assert res.breakdown["required_experience_years"] == 3
    assert "60% verified match" in res.rationale
    assert "Required experience (3 year(s)) could not be verified from CV" in res.rationale


def test_scenario_4b_partial_skills_with_unknown_candidate_experience(provider):
    """Scenario 4b: Partial skill match (2 of 4) with required experience unknown."""
    request = MatchScoreRequest(
        job_title="Backend Developer",
        job_description="Backend microservices",
        job_requirements="Requires 3 years of experience. Skills: Java, Spring Boot, PostgreSQL, Docker.",
        cv_text="Developer skilled in Java and Spring Boot.",
        candidate_skills=["Java", "Spring Boot"],
    )
    res = provider.calculate_match(request)

    assert res.skills_score == 50  # 2 of 4 skills matched
    assert res.experience_score is None  # Experience unknown
    # Verified fit: 0.6 * 50 + 0.0 unverified exp = 30
    assert res.overall_score == 30
    assert sorted(res.breakdown["required_skills_matched"]) == ["Java", "Spring Boot"]
    assert sorted(res.breakdown["missing_skills"]) == ["Docker", "PostgreSQL"]
    assert "30% verified match" in res.rationale
    assert "Required experience (3 year(s)) could not be verified from CV" in res.rationale


def test_scenario_5_required_skills_with_confirmed_zero_experience(provider):
    """Scenario 5: Required skills present, and candidate experience is confirmed 0 years."""
    request = MatchScoreRequest(
        job_title="Java Developer",
        job_description="Backend services",
        job_requirements="Requires Java, Spring Boot and 3 years experience.",
        cv_text="Java and Spring Boot developer. Chưa có kinh nghiệm đi làm.",
        candidate_skills=["Java", "Spring Boot"],
    )
    res = provider.calculate_match(request)

    assert res.skills_score == 100
    assert res.experience_score == 0
    # Both criteria evaluable: 0.6 * 100 + 0.4 * 0 = 60
    assert res.overall_score == 60
    assert sorted(res.breakdown["required_skills"]) == ["Java", "Spring Boot"]
    assert sorted(res.breakdown["required_skills_matched"]) == ["Java", "Spring Boot"]
    assert res.breakdown["candidate_experience_years"] == 0
    assert res.breakdown["required_experience_years"] == 3
    assert "Candidate matches all 2 required skill(s) with 0 of 3 required year(s) of experience" in res.rationale


def test_scenario_6_required_skills_known_exp_no_jd_exp_specified(provider):
    """Scenario 6: Required skills present, candidate has 3 yrs exp, JD has no exp specified."""
    request = MatchScoreRequest(
        job_title="Java Developer",
        job_description="Backend development.",
        job_requirements="Skills needed: Java, Spring Boot.",
        cv_text="Developer with 3 years experience in Java and Spring Boot.",
        candidate_skills=["Java", "Spring Boot"],
    )
    res = provider.calculate_match(request)

    assert res.skills_score == 100
    assert res.experience_score is None  # JD did not specify required experience
    assert res.overall_score == 100  # Normalized 100% on active skills criterion
    assert sorted(res.breakdown["required_skills"]) == ["Java", "Spring Boot"]
    assert sorted(res.breakdown["required_skills_matched"]) == ["Java", "Spring Boot"]
    assert res.breakdown["candidate_experience_years"] == 3
    assert "required_experience_years" not in res.breakdown
    assert "Candidate matches all 2 required skill(s) (with 3 year(s) of relevant experience)" in res.rationale


def test_scenario_7_normal_case_both_criteria_evaluable_60_40(provider):
    """Scenario 7: Normal case where both skills and experience are specified in JD and CV."""
    request = MatchScoreRequest(
        job_title="Full Stack Engineer",
        job_description="Web application development",
        job_requirements="Requires 4 years of experience with Java, Spring Boot, PostgreSQL, Docker.",
        cv_text="Developer with 2 years of experience specializing in Java and PostgreSQL.",
        candidate_skills=["Java", "PostgreSQL"],
    )
    res = provider.calculate_match(request)

    assert res.skills_score == 50  # 2 of 4 skills matched
    assert res.experience_score == 50  # 2 of 4 years experience
    assert res.overall_score == int(round(0.6 * 50 + 0.4 * 50))  # 50
    assert sorted(res.breakdown["required_skills"]) == ["Docker", "Java", "PostgreSQL", "Spring Boot"]
    assert sorted(res.breakdown["required_skills_matched"]) == ["Java", "PostgreSQL"]
    assert sorted(res.breakdown["missing_skills"]) == ["Docker", "Spring Boot"]
    assert res.breakdown["candidate_experience_years"] == 2
    assert res.breakdown["required_experience_years"] == 4
    assert "Candidate matches 2 of 4 required skill(s) with 2 of 4 required year(s) of experience" in res.rationale
