"""Tests for CV Normalization and Canonical Taxonomy Engine."""

import pytest
from app.services.normalizer import (
    canonicalize_skill,
    extract_contact_info,
    extract_education,
    extract_experience_years,
    extract_languages_from_text,
    extract_skills_from_text,
    normalize_cv,
    normalize_job_title,
)


def test_skill_alias_canonicalization():
    assert canonicalize_skill("k8s") == "Kubernetes"
    assert canonicalize_skill("kubernetes") == "Kubernetes"
    assert canonicalize_skill("reactjs") == "React"
    assert canonicalize_skill("react.js") == "React"
    assert canonicalize_skill("golang") == "Go"
    assert canonicalize_skill("nodejs") == "Node.js"
    assert canonicalize_skill("postgres") == "PostgreSQL"
    assert canonicalize_skill("aws") == "AWS"
    assert canonicalize_skill("gcp") == "GCP"
    assert canonicalize_skill("cicd") == "CI/CD"
    assert canonicalize_skill("spring boot") == "Spring Boot"
    assert canonicalize_skill("fastapi") == "FastAPI"


def test_extract_skills_handles_casing_and_punctuation():
    text = "We use K8S, ReactJS, GoLang, and PostgreSQL for our microservices on AWS with CI/CD."
    skills = extract_skills_from_text(text)
    expected = ["AWS", "CI/CD", "Go", "Kubernetes", "Microservices", "PostgreSQL", "React"]
    for s in expected:
        assert s in skills


def test_extract_skills_vietnamese_context():
    text = "Kỹ năng chính: Lập trình Java, Spring Boot, cơ sở dữ liệu PostgreSQL và Docker."
    skills = extract_skills_from_text(text)
    assert "Java" in skills
    assert "Spring Boot" in skills
    assert "PostgreSQL" in skills
    assert "Docker" in skills


def test_ambiguous_prose_does_not_extract_false_skills():
    """Ordinary prose words ('rest', 'go', 'spring 2024', 'node 5') must not match technical skills."""
    text = "The rest of the company will go on vacation in spring 2024 to node 5."
    skills = extract_skills_from_text(text)
    assert skills == []


def test_spring_as_technical_skill_matches():
    """Spring matches when used in a technical context without a calendar year."""
    text = "Experienced in Spring Framework, Java, and Hibernate."
    skills = extract_skills_from_text(text)
    assert "Spring" in skills
    assert "Java" in skills


def test_experience_years_vietnamese_and_english():
    assert extract_experience_years("5 năm kinh nghiệm làm backend") == 5
    assert extract_experience_years("Có 3.5 năm kinh nghiệm phát triển phần mềm") == 4
    assert extract_experience_years("Over 4 years of experience with Python") == 4
    assert extract_experience_years("2 yrs of experience") == 2
    assert extract_experience_years("18 tháng kinh nghiệm") == 2


def test_unrelated_numbers_not_extracted_as_experience():
    """Birth years and study durations without working experience context must not be extracted."""
    text = "Học đại học 4 năm tại trường Bách Khoa. Sinh năm 1999. Chưa có kinh nghiệm đi làm."
    years = extract_experience_years(text)
    assert years == 0


def test_experience_years_does_not_invent_duration():
    assert extract_experience_years("") is None
    assert extract_experience_years("Lập trình viên nhiệt tình và đam mê học hỏi.") is None


def test_education_vietnamese_and_english():
    summary_vi, items_vi = extract_education("Tốt nghiệp Đại học Bách Khoa, Kỹ sư Công nghệ Thông tin, năm 2021.")
    assert summary_vi is not None
    assert "Đại học Bách Khoa" in summary_vi
    assert len(items_vi) >= 1
    assert items_vi[0].degree == "Bachelor"
    assert items_vi[0].graduation_year == 2021

    summary_en, items_en = extract_education("Master of Science in Computer Science, University of Science, 2022.")
    assert summary_en is not None
    assert "Master" in summary_en
    assert items_en[0].degree == "Master"
    assert items_en[0].graduation_year == 2022


def test_education_empty_does_not_invent_degree():
    summary, items = extract_education("Chưa có thông tin học vấn.")
    assert summary is None
    assert items == []


def test_job_title_normalization_and_seniority():
    title_vi, sen_vi = normalize_job_title("Senior Lập trình viên Backend")
    assert title_vi == "Backend Developer"
    assert sen_vi == "Senior"

    title_en, sen_en = normalize_job_title("Lead Software Engineer")
    assert title_en == "Software Engineer"
    assert sen_en == "Lead"

    title_fresher, sen_fresher = normalize_job_title("Fresher Frontend Developer")
    assert title_fresher == "Frontend Developer"
    assert sen_fresher == "Junior"


def test_language_extraction():
    text = """
    Ngoại ngữ:
    - Tiếng Anh: Thành thạo (IELTS 7.5)
    - Tiếng Nhật: Giao tiếp cơ bản (JLPT N3)
    - Tiếng Việt: Bản ngữ
    """
    langs = extract_languages_from_text(text)
    lang_map = {l.language: l.proficiency for l in langs}

    assert "English" in lang_map
    assert lang_map["English"] == "IELTS 7.5"
    assert "Japanese" in lang_map
    assert lang_map["Japanese"] == "JLPT N3"
    assert "Vietnamese" in lang_map
    assert lang_map["Vietnamese"] == "Native"


def test_contact_info_extraction_does_not_invent_defaults():
    text = "Nguyễn Văn Hùng\nEmail: hung.nv@example.com\nĐiện thoại: 0912345678"
    name, email, phone = extract_contact_info(text)
    assert name == "Nguyễn Văn Hùng"
    assert email == "hung.nv@example.com"
    assert phone == "0912345678"

    # Empty text must return None, not fake defaults
    name_empty, email_empty, phone_empty = extract_contact_info("")
    assert name_empty is None
    assert email_empty is None
    assert phone_empty is None


def test_normalize_cv_on_minimal_text_does_not_invent_data():
    minimal_cv = "Trần Trọng Nghĩa\nKhông có thông tin kỹ năng."
    parsed = normalize_cv(minimal_cv)

    assert parsed.full_name == "Trần Trọng Nghĩa"
    assert parsed.email is None
    assert parsed.phone is None
    assert parsed.skills == []
    assert parsed.experience_years is None
    assert parsed.education is None
    assert parsed.work_experience == []
    assert parsed.languages == []
