import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.ai import MatchScoreResponse

@pytest.mark.parametrize("value", ["82", True, 82.5, -1, 101, None])
def test_worker_rejects_score_coercion(value):
    with pytest.raises(ValidationError):
        MatchScoreResponse(overall_score=value)

def test_validation_error_is_problem_details_and_does_not_echo_cv():
    with TestClient(app) as client:
        response = client.post("/api/v1/match/score", json={"job_title": "Java", "cv_text": "PRIVATE_CV", "unexpected": 1})
        assert response.status_code == 422
        assert response.headers["content-type"].startswith("application/problem+json")
        body = response.json()
        assert body["code"] == "VALIDATION_ERROR"
        assert body["retryable"] is False
        assert "PRIVATE_CV" not in response.text

def test_real_worker_endpoint_has_integer_scores_and_object_breakdown():
    with TestClient(app) as client:
        response = client.post("/api/v1/match/score", json={"job_title": "Backend Java", "job_requirements": "Java, PostgreSQL, 3 years experience", "cv_text": "Java developer, 4 years experience", "candidate_skills": ["Java"]})
        assert response.status_code == 200
        body = response.json()
        MatchScoreResponse.model_validate(body)
        assert type(body["overall_score"]) is int
        assert isinstance(body["breakdown"], dict)
