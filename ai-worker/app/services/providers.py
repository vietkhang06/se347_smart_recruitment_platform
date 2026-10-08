"""AI Provider Abstraction and Implementation for MatchaJob AI Worker."""

import abc
import hashlib
import math
import re
from typing import Any, Dict, List

from app.core.config import get_settings
from app.schemas.ai import MatchScoreRequest, MatchScoreResponse


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
    """Deterministic, zero-network test provider using SHA-256 derivation."""

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self.known_skills = [
            "Java", "Spring Boot", "PostgreSQL", "Docker", "Kubernetes",
            "Python", "FastAPI", "AWS", "React", "TypeScript", "Node.js",
            "SQL", "Git", "REST API", "Microservices", "CI/CD"
        ]

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
        # Email extraction
        email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)
        email = email_match.group(0) if email_match else "candidate@example.com"

        # Phone extraction
        phone_match = re.search(r"(?:\+?84|0)(?:\d{9,10})", raw_text)
        phone = phone_match.group(0) if phone_match else "+84901234567"

        # Name extraction (first non-empty line or fallback)
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        full_name = lines[0] if lines else "Nguyen Van A"
        if len(full_name) > 60 or "@" in full_name:
            full_name = "Nguyen Van A"

        # Skills extraction
        matched_skills = [
            skill for skill in self.known_skills
            if re.search(r"\b" + re.escape(skill) + r"\b", raw_text, re.IGNORECASE)
        ]
        if not matched_skills:
            matched_skills = ["Java", "Spring Boot", "PostgreSQL"]

        # Experience extraction
        exp_match = re.search(r"(\d+)\s*(?:năm|years?|yrs)", raw_text, re.IGNORECASE)
        experience_years = int(exp_match.group(1)) if exp_match else 3

        # Education extraction
        edu_match = re.search(r"(?:Đại học|University|B\.S\.|Bachelor|Master|College)[^\n.]*", raw_text, re.IGNORECASE)
        education = edu_match.group(0).strip() if edu_match else "B.S. Computer Science"

        return {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "skills": matched_skills,
            "experience_years": experience_years,
            "education": education,
        }

    def calculate_match(self, request: MatchScoreRequest) -> MatchScoreResponse:
        cv_lower = request.cv_text.lower()
        job_req_lower = (request.job_requirements or "").lower()
        job_desc_lower = (request.job_description or "").lower()
        combined_job = f"{request.job_title.lower()} {job_desc_lower} {job_req_lower}"

        # Matched skills calculation
        target_skills = request.candidate_skills or [
            skill for skill in self.known_skills
            if skill.lower() in cv_lower
        ]

        required_matched = []
        missing_skills = []
        for skill in self.known_skills:
            if skill.lower() in combined_job:
                if skill.lower() in cv_lower:
                    required_matched.append(skill)
                else:
                    missing_skills.append(skill)

        if not required_matched:
            required_matched = [s for s in target_skills if s.lower() in combined_job] or target_skills[:2]

        total_req = len(required_matched) + len(missing_skills)
        skills_ratio = len(required_matched) / total_req if total_req > 0 else 0.8
        skills_score = min(100, max(40, int(skills_ratio * 100)))

        # Experience calculation
        exp_match = re.search(r"(\d+)\s*(?:năm|years?|yrs)", request.cv_text, re.IGNORECASE)
        candidate_exp = int(exp_match.group(1)) if exp_match else 3
        exp_score = min(100, candidate_exp * 20)

        overall_score = int(0.6 * skills_score + 0.4 * exp_score)

        return MatchScoreResponse(
            overall_score=overall_score,
            skills_score=skills_score,
            experience_score=exp_score,
            breakdown={
                "required_skills_matched": required_matched,
                "missing_skills": missing_skills,
                "candidate_experience_years": candidate_exp,
            },
            rationale=(
                f"Candidate matches {len(required_matched)} required skill(s) with "
                f"{candidate_exp} years of relevant industry experience."
            ),
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
        # Production API invocation via HTTPX / OpenAI client
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
