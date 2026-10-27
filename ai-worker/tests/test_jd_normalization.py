"""Tests for Job Description (JD) parsing and normalization."""

from pathlib import Path
import pytest
from app.services.normalizer import normalize_jd

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_normalize_jd_english():
    parsed = normalize_jd(
        job_title="Senior Backend Engineer",
        job_description="Join our team building distributed fintech services.",
        job_requirements="Must have 5+ years experience in Java, Spring Boot, PostgreSQL, and Docker. Good English.",
    )
    assert parsed.job_title == "Senior Backend Engineer"
    assert parsed.canonical_title == "Backend Developer"
    assert parsed.seniority == "Senior"
    assert "Java" in parsed.required_skills
    assert "Spring Boot" in parsed.required_skills
    assert "PostgreSQL" in parsed.required_skills
    assert "Docker" in parsed.required_skills
    assert parsed.required_experience_years == 5
    assert any(l.language == "English" for l in parsed.required_languages)


def test_normalize_jd_vietnamese():
    parsed = normalize_jd(
        job_title="Kỹ sư phần mềm (Fullstack)",
        job_description="Phát triển các ứng dụng web với React, Node.js và MongoDB.",
        job_requirements="Yêu cầu: 3 năm kinh nghiệm lập trình. Thành thạo JavaScript, TypeScript, React, Node.js.",
    )
    assert parsed.job_title == "Kỹ sư phần mềm (Fullstack)"
    assert parsed.canonical_title == "Software Engineer"
    assert "React" in parsed.required_skills
    assert "Node.js" in parsed.required_skills
    assert "JavaScript" in parsed.required_skills
    assert "TypeScript" in parsed.required_skills
    assert parsed.required_experience_years == 3


def test_normalize_jd_from_freeform_english_file():
    """Verify free-form English JD text parsing from static fixture file."""
    path = FIXTURES_DIR / "jd_en_freeform.txt"
    text = path.read_text(encoding="utf-8")

    parsed = normalize_jd(
        job_title="Senior Backend Developer",
        job_description=text,
        job_requirements=text,
    )

    assert parsed.canonical_title == "Backend Developer"
    assert parsed.seniority == "Senior"
    assert parsed.required_experience_years == 4
    for skill in ["Java", "Spring Boot", "PostgreSQL", "Docker", "AWS", "Kubernetes"]:
        assert skill in parsed.required_skills
    assert "Kafka" in parsed.preferred_skills
    # Preferred skill should not be in required_skills
    assert "Kafka" not in parsed.required_skills


def test_normalize_jd_from_freeform_vietnamese_file():
    """Verify free-form Vietnamese JD text parsing from static fixture file."""
    path = FIXTURES_DIR / "jd_vi_freeform.txt"
    text = path.read_text(encoding="utf-8")

    parsed = normalize_jd(
        job_title="Lập trình viên Backend Java (Senior)",
        job_description=text,
        job_requirements=text,
    )

    assert parsed.canonical_title == "Backend Developer"
    assert parsed.seniority == "Senior"
    assert parsed.required_experience_years == 3
    for skill in ["Java", "Spring Boot", "PostgreSQL", "Docker", "Microservices"]:
        assert skill in parsed.required_skills
    assert "Redis" in parsed.preferred_skills or "Kafka" in parsed.preferred_skills
    assert any(l.language == "English" for l in parsed.required_languages)


def test_normalize_jd_empty_fields_does_not_crash_or_fabricate():
    parsed = normalize_jd(
        job_title="Technical Lead",
        job_description="",
        job_requirements="",
    )
    assert parsed.job_title == "Technical Lead"
    assert parsed.seniority == "Lead"
    assert parsed.required_skills == []
    assert parsed.required_experience_years is None
    assert parsed.required_education is None
    assert parsed.required_languages == []
