"""Validate shared MatchaJob contract fixtures against source-aligned schemas/shapes.

These tests validate fixture structure. They do not call external AI providers or claim
that a Backend endpoint is deployed and reachable.
"""
import json
from pathlib import Path
from typing import Any

import pytest
from app.schemas.ai import MatchScoreRequest, MatchScoreResponse

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES = REPO_ROOT / "docs" / "contracts" / "fixtures"


def load_fixture(name: str) -> Any:
    path = FIXTURES / name
    assert path.is_file(), f"Required contract fixture missing: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_all_contract_fixtures_are_valid_json() -> None:
    files = sorted(FIXTURES.glob("*.json"))
    assert files, "No contract fixtures found"
    for path in files:
        json.loads(path.read_text(encoding="utf-8"))


def test_ai_match_request_matches_pydantic_schema() -> None:
    payload = load_fixture("ai-match-score-request.json")
    parsed = MatchScoreRequest.model_validate(payload)
    assert parsed.job_title.strip()
    assert parsed.cv_text.strip()
    assert isinstance(parsed.candidate_skills, list)


def test_ai_match_response_matches_pydantic_schema_and_score_ranges() -> None:
    payload = load_fixture("ai-match-score-response.json")
    parsed = MatchScoreResponse.model_validate(payload)
    assert 0 <= parsed.overall_score <= 100
    if parsed.skills_score is not None:
        assert 0 <= parsed.skills_score <= 100
    if parsed.experience_score is not None:
        assert 0 <= parsed.experience_score <= 100
    assert isinstance(parsed.breakdown, dict)


def test_job_search_fixture_matches_pagination_and_job_summary_shape() -> None:
    payload = load_fixture("job-search-response.json")
    assert set(payload) == {
        "content", "page", "size", "totalElements", "totalPages", "last"
    }
    assert isinstance(payload["content"], list)
    assert isinstance(payload["page"], int) and payload["page"] >= 0
    assert isinstance(payload["size"], int) and payload["size"] > 0
    assert isinstance(payload["totalElements"], int) and payload["totalElements"] >= 0
    assert isinstance(payload["totalPages"], int) and payload["totalPages"] >= 0
    assert isinstance(payload["last"], bool)

    if payload["content"]:
        job = payload["content"][0]
        expected_job_fields = {
            "id", "companyId", "category", "title", "slug", "department",
            "level", "workType", "location", "salaryMode", "salaryMin",
            "salaryMax", "salaryCurrency", "experience", "applicantCount",
            "viewCount", "status", "postedAt", "deadline", "skills"
        }
        assert set(job) == expected_job_fields
        assert isinstance(job["skills"], list)
        assert isinstance(job["category"], dict)
        assert set(job["category"]) == {"id", "name", "icon", "status", "sortOrder"}


def test_current_cv_upload_shape_and_target_shape_difference_are_explicit() -> None:
    current = load_fixture("cv-upload-response-current.json")
    target = load_fixture("cv-upload-accepted-response.json")
    assert set(current) == {
        "cv_version_id", "candidate_id", "file_name", "file_size_bytes",
        "mime_type", "status", "processing_job_id", "message", "is_active"
    }
    assert set(target) == {
        "cvVersionId", "candidateId", "fileName", "fileSizeBytes",
        "status", "processingJobId", "message"
    }
    assert "cv_version_id" in current and "cvVersionId" in target


def test_current_matching_entity_and_target_response_difference_are_explicit() -> None:
    current = load_fixture("matching-response-current.json")
    target = load_fixture("matching-response.json")
    assert set(current) == {
        "id", "applicationId", "jobId", "cvVersionId", "overallScore",
        "skillsScore", "experienceScore", "breakdown", "rationale", "createdAt"
    }
    assert isinstance(current["breakdown"], str)
    assert isinstance(target["breakdown"], dict)
    assert 0 <= current["overallScore"] <= 100


def test_application_and_auth_fixtures_are_explicit_target_shapes() -> None:
    auth_request = load_fixture("auth-register-request.json")
    assert {"email", "password", "fullName", "role"}.issubset(auth_request)
    assert auth_request["email"].endswith(".test")
    assert auth_request["password"].startswith("REPLACE_")

    application_request = load_fixture("application-create-request.json")
    assert set(application_request) == {"jobId", "cvVersionId", "coverLetter"}
    application_response = load_fixture("application-create-response.json")
    assert application_response["stage"] == "new"
    assert application_response["matchScore"] is None


def test_proposed_matching_request_does_not_embed_trusted_job_or_candidate_details() -> None:
    payload = load_fixture("matching-request.json")
    assert payload == {}


def test_job_create_request_and_response_follow_source_dto_shape() -> None:
    request = load_fixture("job-create-request.json")
    response = load_fixture("job-create-response.json")
    required_request_fields = {"companyId", "categoryId", "title", "level", "workType", "salaryMode", "status", "deadline", "skills"}
    assert required_request_fields.issubset(request)
    assert isinstance(request["skills"], list)
    assert set(request["skills"][0]) == {"skillId", "isRequired"}
    expected_response_fields = {
        "id", "companyId", "category", "createdBy", "title", "slug", "department",
        "level", "workType", "location", "address", "mapLink", "salaryMode",
        "salaryMin", "salaryMax", "salaryCurrency", "experience", "description",
        "requirements", "benefits", "schedule", "summaryIndustry", "summaryRequired",
        "summaryPreferred", "applicantCount", "viewCount", "status", "postedAt",
        "deadline", "createdAt", "updatedAt", "skills"
    }
    assert set(response) == expected_response_fields
    assert set(response["category"]) == {"id", "name", "icon", "status", "sortOrder"}
    assert set(response["skills"][0]) == {"skillId", "skillName", "isRequired"}


def test_auth_request_response_fixtures_are_target_shapes_only() -> None:
    login_request = load_fixture("auth-login-request.json")
    register_response = load_fixture("auth-register-response.json")
    me_response = load_fixture("auth-me-response.json")
    assert set(login_request) == {"email", "password"}
    assert login_request["password"].startswith("REPLACE_")
    assert {"id", "email", "fullName", "role", "status", "createdAt"} == set(register_response)
    assert {"id", "email", "fullName", "role", "status"} == set(me_response)


def test_ai_cv_extract_fixture_has_response_schema_fields() -> None:
    payload = load_fixture("ai-cv-extract-response.json")
    assert set(payload) == {"raw_text", "parsed_data", "char_count", "page_count"}
    assert payload["char_count"] == len(payload["raw_text"])
    assert payload["page_count"] >= 1
    assert isinstance(payload["parsed_data"], dict)
