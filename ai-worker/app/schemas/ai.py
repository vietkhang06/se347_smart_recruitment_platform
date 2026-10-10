"""Pydantic schemas for Phase 3 AI Worker endpoints."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ParsedCVData(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[int] = None
    education: Optional[str] = None


class CVExtractResponse(BaseModel):
    raw_text: str
    parsed_data: Dict[str, Any]
    char_count: int
    page_count: int


class EmbeddingsRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=100)


class EmbeddingsResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int = 1536
    model: str


class MatchScoreRequest(BaseModel):
    job_id: Optional[str] = None
    job_title: str
    job_description: Optional[str] = ""
    job_requirements: Optional[str] = ""
    cv_text: str
    candidate_skills: Optional[List[str]] = Field(default_factory=list)


class MatchScoreResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    skills_score: Optional[int] = Field(None, ge=0, le=100)
    experience_score: Optional[int] = Field(None, ge=0, le=100)
    breakdown: Dict[str, Any] = Field(default_factory=dict)
    rationale: Optional[str] = None
