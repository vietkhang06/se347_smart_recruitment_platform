"""AI Provider Abstraction and Implementation for MatchaJob AI Worker."""

import abc
import hashlib
import math
from typing import Any, Dict, List

from app.core.config import get_settings
from app.schemas.ai import MatchScoreRequest, MatchScoreResponse
from app.services.normalizer import (
    canonicalize_skill,
    normalize_cv,
    normalize_jd,
)


class AIProvider(abc.ABC):
    """Abstract Base Class for AI Providers."""

    @abc.abstractmethod
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate dense vector embeddings (1536-dimensional)."""
        pass

    @abc.abstractmethod
    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        """Extract structured profile entities from raw CV text."""
        pass

    @abc.abstractmethod
    def calculate_match(self, request: MatchScoreRequest) -> MatchScoreResponse:
        """Calculate match score and evaluation rationale."""
        pass


class DeterministicTestProvider(AIProvider):
    """
    Deterministic, zero-network test provider using SHA-256 derivation
    and rule-based normalized matching.
    """

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            # Deterministic seed using SHA-256 (stable across processes & OS)
            digest = hashlib.sha256(text.strip().encode("utf-8")).digest()
            seed = int.from_bytes(digest[:8], byteorder="big")

            raw_vector = [
                math.sin(seed * 0.0001 * (i + 1))
                for i in range(self.dimension)
            ]
            # Normalize to unit vector (L2 norm = 1.0)
            norm = math.sqrt(sum(x * x for x in raw_vector))
            if norm == 0.0:
                norm = 1.0
            unit_vector = [round(x / norm, 6) for x in raw_vector]
            embeddings.append(unit_vector)
        return embeddings

    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        """
        Extract structured profile entities from raw CV text using normalizer.
        Does not fabricate dummy data for missing fields.
        """
        parsed_cv = normalize_cv(raw_text)
        return parsed_cv.model_dump()

    def calculate_match(self, request: MatchScoreRequest) -> MatchScoreResponse:
        """
        Calculate weighted baseline match score between job requirements and CV.
        Uses applicability-aware 60% skills and 40% experience matching.
        Does not award unearned points for missing or unparseable requirements,
        and does not assume zero experience when candidate experience duration is unknown.
        """
        # 1. Parse and normalize Job Description requirements
        parsed_jd = normalize_jd(
            job_title=request.job_title,
            job_description=request.job_description or "",
            job_requirements=request.job_requirements or "",
        )
        required_skills = parsed_jd.required_skills

        # 2. Parse and normalize Candidate CV and skills
        parsed_cv = normalize_cv(request.cv_text)
        candidate_skills_set = set(parsed_cv.skills)

        # Include candidate_skills passed explicitly in request
        if request.candidate_skills:
            for skill in request.candidate_skills:
                canonical = canonicalize_skill(skill)
                candidate_skills_set.add(canonical or skill.strip())

        # 3. Evaluate skills criterion
        required_matched: List[str] = []
        missing_skills: List[str] = []
        skills_score: Optional[int] = None

        if required_skills:
            for skill in required_skills:
                if skill in candidate_skills_set:
                    required_matched.append(skill)
                else:
                    missing_skills.append(skill)
            skills_ratio = len(required_matched) / len(required_skills)
            skills_score = max(0, min(100, int(round(skills_ratio * 100))))
        else:
            # When JD specifies no extractable skills, skills criterion is not evaluable
            skills_score = None

        # 4. Evaluate experience criterion
        candidate_exp: Optional[int] = parsed_cv.experience_years  # None means unknown/unspecified
        required_exp: Optional[int] = parsed_jd.required_experience_years
        experience_score: Optional[int] = None

        experience_required = bool(required_exp is not None and required_exp > 0)
        skills_required = bool(required_skills)

        if experience_required:
            if candidate_exp is not None:
                exp_ratio = min(1.0, candidate_exp / float(required_exp))
                experience_score = max(0, min(100, int(round(exp_ratio * 100))))
            else:
                # Candidate experience is unspecified/unknown in CV
                experience_score = None
        else:
            # JD specifies no required experience
            experience_score = None

        # 5. Compute overall score
        # Job criteria weights: skills = 60%, experience = 40%
        if skills_required and experience_required:
            # Both criteria are required by the job
            verified_skills_points = 0.6 * skills_score if skills_score is not None else 0.0
            verified_exp_points = 0.4 * experience_score if experience_score is not None else 0.0
            overall_score = int(round(verified_skills_points + verified_exp_points))
        elif skills_required and not experience_required:
            # Job only requires skills (experience not specified in JD)
            overall_score = skills_score if skills_score is not None else 0
        elif not skills_required and experience_required:
            # Job only requires experience (no technical skills in JD)
            overall_score = experience_score if experience_score is not None else 0
        else:
            # Neither criterion required or extractable from JD
            overall_score = 0

        overall_score = max(0, min(100, overall_score))

        # 6. Build consistent breakdown and explanation
        breakdown: Dict[str, Any] = {
            "required_skills": required_skills,
            "required_skills_matched": required_matched,
            "missing_skills": missing_skills,
        }
        if candidate_exp is not None:
            breakdown["candidate_experience_years"] = candidate_exp
        if required_exp is not None:
            breakdown["required_experience_years"] = required_exp

        # 7. Formulate accurate, non-misleading rationale
        if skills_required and experience_required:
            if experience_score is not None:
                # Both evaluated
                if missing_skills:
                    rationale = (
                        f"Candidate matches {len(required_matched)} of {len(required_skills)} required skill(s) "
                        f"with {candidate_exp} of {required_exp} required year(s) of experience. "
                        f"Missing skills: {', '.join(missing_skills)}."
                    )
                else:
                    rationale = (
                        f"Candidate matches all {len(required_skills)} required skill(s) "
                        f"with {candidate_exp} of {required_exp} required year(s) of experience."
                    )
            else:
                # Skills evaluated, experience required by JD but unspecified in CV
                verified_pts = int(round(0.6 * skills_score)) if skills_score is not None else 0
                if missing_skills:
                    rationale = (
                        f"Candidate matches {len(required_matched)} of {len(required_skills)} required skill(s) "
                        f"({verified_pts}% verified match). "
                        f"Required experience ({required_exp} year(s)) could not be verified from CV. "
                        f"Missing skills: {', '.join(missing_skills)}."
                    )
                else:
                    rationale = (
                        f"Candidate matches all {len(required_skills)} required skill(s) "
                        f"({verified_pts}% verified match). "
                        f"Required experience ({required_exp} year(s)) could not be verified from CV."
                    )
        elif skills_required and not experience_required:
            exp_note = (
                f"with {candidate_exp} year(s) of relevant experience"
                if candidate_exp is not None
                else "experience duration unspecified in CV"
            )
            if missing_skills:
                rationale = (
                    f"Candidate matches {len(required_matched)} of {len(required_skills)} required skill(s) "
                    f"({exp_note}). Missing skills: {', '.join(missing_skills)}."
                )
            else:
                rationale = (
                    f"Candidate matches all {len(required_skills)} required skill(s) ({exp_note})."
                )
        elif not skills_required and experience_required:
            if candidate_exp is not None:
                if candidate_exp >= required_exp:
                    rationale = (
                        f"No specific technical skills required by job description. "
                        f"Candidate meets experience requirement with {candidate_exp} of {required_exp} year(s)."
                    )
                else:
                    rationale = (
                        f"No specific technical skills required by job description. "
                        f"Candidate has {candidate_exp} of {required_exp} required year(s) of experience."
                    )
            else:
                rationale = (
                    f"No specific technical skills required by job description. "
                    f"Required experience ({required_exp} year(s)) could not be verified from CV."
                )
        else:
            if candidate_exp is not None:
                rationale = (
                    f"No evaluable skill or experience requirements identified in job description. "
                    f"Candidate has {candidate_exp} year(s) of experience."
                )
            else:
                rationale = (
                    "No evaluable skill or experience requirements identified in job description."
                )

        return MatchScoreResponse(
            overall_score=overall_score,
            skills_score=skills_score,
            experience_score=experience_score,
            breakdown=breakdown,
            rationale=rationale,
        )


class OpenAIProvider(AIProvider):
    """Production OpenAI provider with fallback to test provider when unconfigured."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.fallback = DeterministicTestProvider()

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            return self.fallback.generate_embeddings(texts)
        return self.fallback.generate_embeddings(texts)

    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        if not self.api_key:
            return self.fallback.extract_entities(raw_text)
        return self.fallback.extract_entities(raw_text)

    def calculate_match(self, request: MatchScoreRequest) -> MatchScoreResponse:
        if not self.api_key:
            return self.fallback.calculate_match(request)
        return self.fallback.calculate_match(request)


def get_ai_provider() -> AIProvider:
    """Factory function returning the configured AI Provider."""
    settings = get_settings()
    provider_name = settings.AI_PROVIDER.lower().strip()
    if provider_name == "openai" and settings.AI_API_KEY:
        return OpenAIProvider(api_key=settings.AI_API_KEY, model=settings.AI_MODEL)
    return DeterministicTestProvider()
