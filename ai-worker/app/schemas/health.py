"""Pydantic schemas for health and probe endpoints."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Overall service health status response."""
    status: str = Field(default="healthy", description="Service health state")
    service: str = Field(description="Name of the service")
    version: str = Field(description="Service release version")
    environment: str = Field(description="Deployment environment")
    uptime_seconds: float = Field(description="Uptime in seconds since startup")


class ProbeResponse(BaseModel):
    """Response model for individual liveness, readiness, and startup probes."""
    status: str = Field(description="Probe status string")
