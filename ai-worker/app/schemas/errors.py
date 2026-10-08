"""RFC 7807 Problem Details error schema."""

from pydantic import BaseModel, Field


class ProblemDetail(BaseModel):
    """Standard RFC 7807 Problem Details for HTTP APIs."""
    type: str = Field(default="about:blank", description="URI reference identifying the problem type")
    title: str = Field(description="Short human-readable summary of the problem")
    status: int = Field(description="HTTP status code")
    detail: str = Field(description="Human-readable explanation specific to this occurrence")
    instance: str | None = Field(default=None, description="URI reference identifying the specific occurrence")
