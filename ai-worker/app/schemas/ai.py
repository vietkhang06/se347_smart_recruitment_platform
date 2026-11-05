"""Pydantic schemas for MatchaJob AI Worker endpoints."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, StrictInt, StrictStr, field_validator


class LanguageItem(BaseModel):
    """Normalized language and proficiency information."""
    language: str
    proficiency: Optional[str] = None


class EducationItem(BaseModel):
    """Structured education history entry."""
    degree: Optional[str] = None
    institution: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None


class WorkExperienceItem(BaseModel):
    """Structured work experience entry."""
    job_title: Optional[str] = None
    company: Optional[str] = None
    duration_years: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    skills: List[str] = Field(default_factory=list)


class ParsedCVData(BaseModel):
    """Normalized CV data schema with backward compatibility fields."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    job_titles: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    languages: List[LanguageItem] = Field(default_factory=list)
    experience_years: Optional[int] = None
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: Optional[str] = None
    education_details: List[EducationItem] = Field(default_factory=list)


class ParsedJDData(BaseModel):
    """Normalized Job Description schema."""
    job_title: str
    canonical_title: Optional[str] = None
    seniority: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    required_experience_years: Optional[int] = None
    required_education: Optional[str] = None
    required_languages: List[LanguageItem] = Field(default_factory=list)
    raw_requirements: Optional[str] = None


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
    model_config = ConfigDict(extra="forbid")
    job_id: Optional[str] = None
    job_title: StrictStr = Field(..., min_length=1)
    job_description: Optional[str] = ""
    job_requirements: Optional[str] = ""
    cv_text: StrictStr
    candidate_skills: Optional[List[StrictStr]] = Field(default_factory=list)


class MatchScoreResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    overall_score: StrictInt = Field(..., ge=0, le=100)
    skills_score: Optional[StrictInt] = Field(None, ge=0, le=100)
    experience_score: Optional[StrictInt] = Field(None, ge=0, le=100)
    breakdown: Dict[str, Any] = Field(default_factory=dict)
    rationale: Optional[StrictStr] = None

    @field_validator("breakdown")
    @classmethod
    def validate_skill_lists(cls, value):
        for key in ("required_skills_matched", "missing_skills", "required_skills", "matchedSkills", "missingSkills", "requiredSkills"):
            if key in value and (not isinstance(value[key], list) or any(not isinstance(item, str) or not item.strip() for item in value[key])):
                raise ValueError(f"{key} must be an array of nonempty strings")
        return value
