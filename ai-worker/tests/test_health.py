"""Unit tests for AI Worker health endpoints and lifecycle probes."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a TestClient with lifespan events executed."""
    with TestClient(app) as test_client:
        yield test_client


def test_aggregate_health(client: TestClient):
    """Verify /health returns 200 with service information and uptime."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "matchajob-ai-worker"
    assert data["version"] == "1.0.0"
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0.0


def test_liveness_probe(client: TestClient):
    """Verify /health/live returns 200 OK without any external dependency checks."""
    response = client.get("/health/live")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "alive"}


def test_readiness_probe_when_ready(client: TestClient):
    """Verify /health/ready returns 200 OK when worker is initialized."""
    response = client.get("/health/ready")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ready"}


def test_readiness_probe_when_unready(client: TestClient):
    """Verify /health/ready returns 503 Service Unavailable when is_ready is False."""
    app.state.is_ready = False
    response = client.get("/health/ready")
    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json() == {"status": "unready"}
    # Restore state
    app.state.is_ready = True


def test_startup_probe(client: TestClient):
    """Verify /health/startup returns 200 OK after application finishes lifespan startup."""
    response = client.get("/health/startup")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "initialized"}


def test_rfc7807_error_handling(client: TestClient):
    """Verify unhandled paths return RFC 7807 problem details structure."""
    response = client.get("/non-existent-endpoint")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.headers["content-type"] == "application/problem+json"
    data = response.json()
    assert data["status"] == 404
    assert "title" in data
    assert "detail" in data
    assert data["instance"] == "/non-existent-endpoint"
