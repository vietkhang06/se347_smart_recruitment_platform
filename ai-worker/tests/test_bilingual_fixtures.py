"""Tests exercising real static bilingual (EN & VI) fixtures and edge cases."""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.extractor import extract_cv_text
from app.services.normalizer import normalize_cv, normalize_jd
from app.services.providers import get_ai_provider
from app.schemas.ai import MatchScoreRequest

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_static_english_docx_cv_extraction():
    path = FIXTURES_DIR / "cv_en_backend.docx"
    content = path.read_bytes()
    text, pages = extract_cv_text("cv_en_backend.docx", content)

    assert "Johnathan Doe" in text
    assert "Backend Developer" in text
    assert pages >= 1

    parsed = normalize_cv(text)
    assert parsed.full_name == "Johnathan Doe"
    assert parsed.email == "john.doe@example.test"
    assert parsed.phone == "+84901234567"
    assert parsed.experience_years == 4
    for skill in ["Java", "Spring Boot", "PostgreSQL", "Docker", "AWS", "Kubernetes"]:
        assert skill in parsed.skills
    assert any(l.language == "English" and l.proficiency == "Fluent" for l in parsed.languages)


def test_static_vietnamese_docx_cv_extraction():
    path = FIXTURES_DIR / "cv_vi_backend.docx"
    content = path.read_bytes()
    text, pages = extract_cv_text("cv_vi_backend.docx", content)

    assert "Nguyễn Văn An" in text
    assert "Lập trình viên Backend" in text

    parsed = normalize_cv(text)
    assert parsed.full_name == "Nguyễn Văn An"
    assert parsed.email == "nguyen.van.an@example.test"
    assert parsed.phone == "0987654321"
    assert parsed.experience_years == 4
    assert "Đại học Bách Khoa" in (parsed.education or "")
    for skill in ["Java", "Spring Boot", "PostgreSQL", "Docker", "Microservices"]:
        assert skill in parsed.skills
    assert any(l.language == "English" and "TOEIC 850" in (l.proficiency or "") for l in parsed.languages)


def test_static_english_pdf_cv_extraction():
    path = FIXTURES_DIR / "cv_en_backend.pdf"
    content = path.read_bytes()
    text, pages = extract_cv_text("cv_en_backend.pdf", content)

    assert pages == 1
    assert "Johnathan Doe" in text
    parsed = normalize_cv(text)
    assert "Java" in parsed.skills
    assert parsed.experience_years == 4


def test_static_minimal_cv_does_not_fabricate_data():
    path = FIXTURES_DIR / "cv_minimal.docx"
    content = path.read_bytes()
    text, pages = extract_cv_text("cv_minimal.docx", content)

    parsed = normalize_cv(text)
    assert parsed.full_name == "Nguyen Minimal"
    assert parsed.email == "minimal@example.test"
    assert parsed.phone is None
    assert parsed.skills == []
    assert parsed.experience_years is None
    assert parsed.education is None


def test_static_corrupted_pdf_raises_error():
    path = FIXTURES_DIR / "corrupt.pdf"
    content = path.read_bytes()
    with pytest.raises(ValueError, match="Corrupted or invalid PDF header"):
        extract_cv_text("corrupt.pdf", content)


def test_static_corrupted_docx_raises_error():
    path = FIXTURES_DIR / "corrupt.docx"
    content = path.read_bytes()
    with pytest.raises(ValueError, match="Corrupted or invalid DOCX header"):
        extract_cv_text("corrupt.docx", content)


def test_static_unsupported_file_format_raises_error():
    path = FIXTURES_DIR / "unsupported.txt"
    content = path.read_bytes()
    with pytest.raises(ValueError, match="Unsupported file format"):
        extract_cv_text("unsupported.txt", content)


def test_end_to_end_matching_with_english_fixtures():
    # Load English CV text
    cv_path = FIXTURES_DIR / "cv_en_backend.docx"
    cv_text, _ = extract_cv_text("cv_en_backend.docx", cv_path.read_bytes())

    # Load English JD
    jd_path = FIXTURES_DIR / "jd_en_backend.json"
    jd_data = json.loads(jd_path.read_text(encoding="utf-8"))

    provider = get_ai_provider()
    request = MatchScoreRequest(
        job_id=jd_data["job_id"],
        job_title=jd_data["job_title"],
        job_description=jd_data["job_description"],
        job_requirements=jd_data["job_requirements"],
        cv_text=cv_text,
    )
    response = provider.calculate_match(request)

    assert response.overall_score >= 80
    assert response.skills_score >= 80
    assert "Java" in response.breakdown["required_skills_matched"]
    assert "Spring Boot" in response.breakdown["required_skills_matched"]
    assert response.breakdown["candidate_experience_years"] == 4


def test_end_to_end_matching_with_vietnamese_fixtures():
    # Load Vietnamese CV text
    cv_path = FIXTURES_DIR / "cv_vi_backend.docx"
    cv_text, _ = extract_cv_text("cv_vi_backend.docx", cv_path.read_bytes())

    # Load Vietnamese JD
    jd_path = FIXTURES_DIR / "jd_vi_backend.json"
    jd_data = json.loads(jd_path.read_text(encoding="utf-8"))

    provider = get_ai_provider()
    request = MatchScoreRequest(
        job_id=jd_data["job_id"],
        job_title=jd_data["job_title"],
        job_description=jd_data["job_description"],
        job_requirements=jd_data["job_requirements"],
        cv_text=cv_text,
    )
    response = provider.calculate_match(request)

    assert response.overall_score >= 80
    assert response.skills_score >= 80
    assert "Java" in response.breakdown["required_skills_matched"]
    assert "Spring Boot" in response.breakdown["required_skills_matched"]
    assert "Microservices" in response.breakdown["required_skills_matched"]
    assert response.breakdown["candidate_experience_years"] == 4


def test_end_to_end_matching_with_freeform_english_jd_file():
    """Verify matching using raw free-form English JD text file directly."""
    cv_path = FIXTURES_DIR / "cv_en_backend.docx"
    cv_text, _ = extract_cv_text("cv_en_backend.docx", cv_path.read_bytes())

    jd_path = FIXTURES_DIR / "jd_en_freeform.txt"
    jd_text = jd_path.read_text(encoding="utf-8")

    provider = get_ai_provider()
    request = MatchScoreRequest(
        job_title="Senior Backend Developer",
        job_description=jd_text,
        job_requirements=jd_text,
        cv_text=cv_text,
    )
    response = provider.calculate_match(request)

    assert response.overall_score >= 80
    assert response.skills_score >= 80
    assert "Java" in response.breakdown["required_skills_matched"]
    assert "Docker" in response.breakdown["required_skills_matched"]
    assert response.breakdown["candidate_experience_years"] == 4


def test_end_to_end_matching_with_freeform_vietnamese_jd_file():
    """Verify matching using raw free-form Vietnamese JD text file directly."""
    cv_path = FIXTURES_DIR / "cv_vi_backend.docx"
    cv_text, _ = extract_cv_text("cv_vi_backend.docx", cv_path.read_bytes())

    jd_path = FIXTURES_DIR / "jd_vi_freeform.txt"
    jd_text = jd_path.read_text(encoding="utf-8")

    provider = get_ai_provider()
    request = MatchScoreRequest(
        job_title="Lập trình viên Backend Java (Senior)",
        job_description=jd_text,
        job_requirements=jd_text,
        cv_text=cv_text,
    )
    response = provider.calculate_match(request)

    assert response.overall_score >= 80
    assert response.skills_score >= 80
    assert "Java" in response.breakdown["required_skills_matched"]
    assert "Spring Boot" in response.breakdown["required_skills_matched"]
    assert "PostgreSQL" in response.breakdown["required_skills_matched"]
    assert response.breakdown["candidate_experience_years"] == 4
