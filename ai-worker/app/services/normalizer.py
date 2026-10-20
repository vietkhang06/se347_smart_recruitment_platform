"""Domain normalization and parsing engine for CVs and Job Descriptions (JDs).

Provides decoupled, deterministic text normalization for:
- Technical and functional skills (with canonical alias mappings)
- Work experience and durations (supporting Vietnamese and English)
- Education qualifications and institutions
- Job titles and seniority levels
- Human languages and proficiency levels
"""

import re
import unicodedata
from typing import Any, Dict, List, Optional, Set, Tuple

from app.schemas.ai import (
    EducationItem,
    LanguageItem,
    ParsedCVData,
    ParsedJDData,
    WorkExperienceItem,
)


# =============================================================================
# Canonical Skill Taxonomy & Aliases
# =============================================================================

CANONICAL_SKILL_MAP: Dict[str, str] = {
    # Languages
    "java": "Java",
    "python": "Python",
    "py": "Python",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "golang": "Go",
    "go language": "Go",
    "c#": "C#",
    "csharp": "C#",
    "c sharp": "C#",
    "c++": "C++",
    "cpp": "C++",
    "php": "PHP",
    "ruby": "Ruby",
    "rust": "Rust",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "dart": "Dart",
    "scala": "Scala",

    # Frameworks & Libraries
    "spring boot": "Spring Boot",
    "springboot": "Spring Boot",
    "spring framework": "Spring",
    "spring cloud": "Spring Cloud",
    "spring security": "Spring Security",
    "spring mvc": "Spring MVC",
    "spring": "Spring",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "Angular",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    "express": "Express",
    "expressjs": "Express",
    "nest": "NestJS",
    "nestjs": "NestJS",
    ".net core": ".NET Core",
    ".net": ".NET",
    "dotnet": ".NET",
    "asp.net": "ASP.NET",
    "laravel": "Laravel",

    # Databases & Storage
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "pgsql": "PostgreSQL",
    "mysql": "MySQL",
    "sql server": "SQL Server",
    "mssql": "SQL Server",
    "oracle": "Oracle",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",
    "cassandra": "Cassandra",
    "sqlite": "SQLite",
    "sql": "SQL",
    "nosql": "NoSQL",

    # Cloud & DevOps
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "azure": "Azure",
    "microsoft azure": "Azure",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "jenkins": "Jenkins",
    "gitlab": "GitLab",
    "github": "GitHub",
    "github actions": "GitHub Actions",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "linux": "Linux",
    "git": "Git",

    # Architecture, Protocols & Concepts
    "rest api": "REST API",
    "restful api": "REST API",
    "restful": "REST API",
    "rest apis": "REST API",
    "graphql": "GraphQL",
    "grpc": "gRPC",
    "microservices": "Microservices",
    "microservice": "Microservices",
    "kafka": "Kafka",
    "apache kafka": "Kafka",
    "rabbitmq": "RabbitMQ",
    "unit test": "Unit Testing",
    "unit testing": "Unit Testing",
    "system design": "System Design",

    # Web & UI
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "sass": "Sass",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "redux": "Redux",
}

# Sorted by length descending so longer phrases match before sub-phrases
_SORTED_SKILL_KEYS = sorted(CANONICAL_SKILL_MAP.keys(), key=lambda s: len(s), reverse=True)


def _normalize_text_for_search(text: str) -> str:
    """Normalize text into lowercased NFKC unicode form."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    return normalized.lower()


def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract canonical skills from free text using non-overlapping alias normalization.
    Uses Unicode word boundaries to prevent false positives in Vietnamese and English.
    """
    if not text:
        return []

    clean_text = _normalize_text_for_search(text)
    matched: Set[str] = set()
    used_spans: List[Tuple[int, int]] = []

    for raw_skill in _SORTED_SKILL_KEYS:
        canonical = CANONICAL_SKILL_MAP[raw_skill]
        escaped = re.escape(raw_skill)

        if raw_skill in ("c#", "c++", ".net", ".net core"):
            pattern = rf"(?<![\w#+]){escaped}(?![\w#+])"
        else:
            pattern = rf"(?<!\w){escaped}(?!\w)"

        for m in re.finditer(pattern, clean_text):
            start, end = m.span()
            # If this span overlaps an already matched longer span, skip it
            if any(s <= start < e or s < end <= e for s, e in used_spans):
                continue

            # Context check for 'spring' to avoid academic terms like 'spring 2024' or 'spring semester'
            if raw_skill == "spring":
                surrounding_after = clean_text[end:min(len(clean_text), end + 15)]
                if re.match(r"\s*(?:\d{4}|semester|break|kỳ|hoc ky)\b", surrounding_after):
                    continue

            used_spans.append((start, end))
            matched.add(canonical)

    return sorted(matched)


def canonicalize_skill(skill: str) -> Optional[str]:
    """Return the canonical representation of a single skill string, if recognized."""
    if not skill or not skill.strip():
        return None
    raw = skill.strip().lower()
    return CANONICAL_SKILL_MAP.get(raw, skill.strip())


# =============================================================================
# Job Title Normalization
# =============================================================================

CANONICAL_TITLE_MAP: Dict[str, str] = {
    # Engineering / Development
    "software engineer": "Software Engineer",
    "kỹ sư phần mềm": "Software Engineer",
    "kỹ sư lập trình": "Software Engineer",
    "backend developer": "Backend Developer",
    "backend engineer": "Backend Developer",
    "lập trình viên backend": "Backend Developer",
    "frontend developer": "Frontend Developer",
    "frontend engineer": "Frontend Developer",
    "lập trình viên frontend": "Frontend Developer",
    "fullstack developer": "Full Stack Developer",
    "full stack developer": "Full Stack Developer",
    "lập trình viên fullstack": "Full Stack Developer",
    "mobile developer": "Mobile Developer",
    "lập trình viên di động": "Mobile Developer",
    "android developer": "Mobile Developer",
    "ios developer": "Mobile Developer",
    "devops engineer": "DevOps Engineer",
    "kỹ sư devops": "DevOps Engineer",
    "qa engineer": "QA Engineer",
    "tester": "QA Engineer",
    "kiểm thử viên": "QA Engineer",
    "qc engineer": "QA Engineer",
    "data scientist": "Data Scientist",
    "chuyên viên khoa học dữ liệu": "Data Scientist",
    "data engineer": "Data Engineer",
    "kỹ sư dữ liệu": "Data Engineer",
    "system administrator": "System Administrator",
    "quản trị hệ thống": "System Administrator",
    "solution architect": "Solution Architect",
    "kiến trúc sư giải pháp": "Solution Architect",
    "product manager": "Product Manager",
    "quản lý sản phẩm": "Product Manager",
    "project manager": "Project Manager",
    "quản lý dự án": "Project Manager",
}

SENIORITY_KEYWORDS: Dict[str, str] = {
    "intern": "Intern",
    "thực tập sinh": "Intern",
    "fresher": "Junior",
    "junior": "Junior",
    "middle": "Mid-level",
    "mid": "Mid-level",
    "mid-level": "Mid-level",
    "senior": "Senior",
    "lead": "Lead",
    "tech lead": "Lead",
    "trưởng nhóm": "Lead",
    "principal": "Principal",
    "staff": "Staff",
    "manager": "Manager",
    "trưởng phòng": "Manager",
    "director": "Director",
    "giám đốc": "Director",
}


def normalize_job_title(title: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalize raw job title into (canonical_title, seniority).
    Preserves original title if canonical mapping is not found.
    """
    if not title or not title.strip():
        return None, None

    clean = title.strip()
    lower = clean.lower()

    # Detect seniority
    detected_seniority: Optional[str] = None
    for kw, level in SENIORITY_KEYWORDS.items():
        if re.search(rf"\b{re.escape(kw)}\b", lower):
            detected_seniority = level
            break

    # Find canonical role title
    canonical: Optional[str] = None
    for raw_kw, standard_title in CANONICAL_TITLE_MAP.items():
        if raw_kw in lower:
            canonical = standard_title
            break

    return canonical or clean, detected_seniority


# =============================================================================
# Language Extraction & Normalization
# =============================================================================

CANONICAL_LANGUAGE_MAP: Dict[str, str] = {
    "tiếng anh": "English",
    "english": "English",
    "tiếng việt": "Vietnamese",
    "vietnamese": "Vietnamese",
    "tiếng nhật": "Japanese",
    "japanese": "Japanese",
    "tiếng trung": "Chinese",
    "chinese": "Chinese",
    "mandarin": "Chinese",
    "tiếng hàn": "Korean",
    "korean": "Korean",
    "tiếng pháp": "French",
    "french": "French",
    "tiếng đức": "German",
    "german": "German",
}

PROFICIENCY_KEYWORDS: Dict[str, str] = {
    "bản ngữ": "Native",
    "native": "Native",
    "mẹ đẻ": "Native",
    "thành thạo": "Fluent",
    "fluent": "Fluent",
    "lưu loát": "Fluent",
    "chuyên nghiệp": "Professional",
    "professional": "Professional",
    "trung cấp": "Intermediate",
    "intermediate": "Intermediate",
    "khá": "Intermediate",
    "cơ bản": "Basic",
    "sơ cấp": "Basic",
    "basic": "Basic",
    "elementary": "Basic",
}


def extract_languages_from_text(text: str) -> List[LanguageItem]:
    """Extract normalized human languages and proficiency from text clause by clause."""
    if not text:
        return []

    languages: List[LanguageItem] = []
    seen: Set[str] = set()

    for line in text.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue

        # Split line by comma, semicolon or pipe to localize proficiency to individual language clauses
        clauses = re.split(r"[,;|]", line_clean)
        for clause in clauses:
            clause_clean = clause.strip()
            clause_lower = clause_clean.lower()

            for raw_lang, canonical_lang in CANONICAL_LANGUAGE_MAP.items():
                if re.search(rf"\b{re.escape(raw_lang)}\b", clause_lower):
                    if canonical_lang in seen:
                        continue

                    proficiency: Optional[str] = None

                    # Specific test scores check
                    ielts_match = re.search(r"ielts\s*(\d(?:\.\d+)?)", clause_lower)
                    toeic_match = re.search(r"toeic\s*(\d{3,4})", clause_lower)
                    jlpt_match = re.search(r"jlpt\s*(n[1-5])", clause_lower)

                    if ielts_match:
                        proficiency = f"IELTS {ielts_match.group(1)}"
                    elif toeic_match:
                        proficiency = f"TOEIC {toeic_match.group(1)}"
                    elif jlpt_match:
                        proficiency = f"JLPT {jlpt_match.group(1).upper()}"
                    else:
                        for prof_kw, prof_label in PROFICIENCY_KEYWORDS.items():
                            if re.search(rf"\b{re.escape(prof_kw)}\b", clause_lower):
                                proficiency = prof_label
                                break

                    languages.append(LanguageItem(language=canonical_lang, proficiency=proficiency))
                    seen.add(canonical_lang)

    return languages


# =============================================================================
# Experience Extraction & Normalization
# =============================================================================

def extract_experience_years(text: str) -> Optional[int]:
    """
    Extract explicitly stated years of experience from text.
    Returns None if no duration is mentioned (does not invent fake values).
    Returns 0 if text explicitly indicates no experience.
    """
    if not text:
        return None

    # Check for explicit statements of no experience
    if re.search(r"\b(?:chưa có|chua co|không có|khong co|no|0|zero)\s*(?:năm\s*)?(?:kinh nghiệm|kinh nghiem|experience|exp)\b", text, re.IGNORECASE):
        return 0

    year_patterns = [
        r"(?:kinh nghiệm|kinh nghiem|làm việc|lam viec|experience|exp)[:\s]+(\d+(?:\.\d+)?)\s*(?:năm|nam|years?|yrs?)",
        r"(\d+(?:\.\d+)?)\+?\s*(?:năm|nam)\s*(?:kinh nghiệm|kinh nghiem|kn|làm việc|lam viec)",
        r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp|work(?:ing)?)",
        r"(?:over|at least|tối thiểu|toi thieu|hơn|khoảng)\s*(\d+(?:\.\d+)?)\s*(?:năm|years?)\s*(?:kinh nghiệm|experience)",
    ]

    for pat in year_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            try:
                val = float(match.group(1))
                if 0 < val <= 40:
                    return int(round(val))
            except ValueError:
                pass

    month_match = re.search(r"(\d+)\s*(?:tháng|thang|months?|mos?)\s*(?:kinh nghiệm|kinh nghiem|experience|exp)", text, re.IGNORECASE)
    if month_match:
        try:
            months = int(month_match.group(1))
            if 0 < months <= 480:
                return max(1, int(round(months / 12.0)))
        except ValueError:
            pass

    return None


def extract_work_history(text: str) -> List[WorkExperienceItem]:
    """Extract structured work experience entries if discernable from text."""
    if not text:
        return []

    experiences: List[WorkExperienceItem] = []
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    date_range_pat = re.compile(
        r"((?:(?:\d{1,2}/)?\d{4})|(?:present|hiện tại|hien tai))\s*[-–—tođến]+\s*((?:(?:\d{1,2}/)?\d{4})|(?:present|hiện tại|hien tai))",
        re.IGNORECASE
    )

    for i, line in enumerate(lines):
        match = date_range_pat.search(line)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()

            candidate_title = None
            company = None

            prefix = line[:match.start()].strip(" |,-")
            if prefix and len(prefix) > 3:
                candidate_title = prefix
            elif i > 0 and len(lines[i - 1]) < 80:
                candidate_title = lines[i - 1]

            item = WorkExperienceItem(
                job_title=candidate_title,
                company=company,
                start_date=start_date,
                end_date=end_date,
                skills=extract_skills_from_text(line)
            )
            experiences.append(item)

    return experiences


# =============================================================================
# Education Extraction & Normalization
# =============================================================================

DEGREE_TERMS: Dict[str, str] = {
    "tiến sĩ": "Ph.D.",
    "ph.d": "Ph.D.",
    "phd": "Ph.D.",
    "doctorate": "Ph.D.",
    "thạc sĩ": "Master",
    "thac si": "Master",
    "master": "Master",
    "m.s.": "Master",
    "m.sc.": "Master",
    "mba": "Master",
    "cử nhân": "Bachelor",
    "cu nhan": "Bachelor",
    "kỹ sư": "Bachelor",
    "ky su": "Bachelor",
    "bachelor": "Bachelor",
    "b.s.": "Bachelor",
    "b.sc.": "Bachelor",
    "b.a.": "Bachelor",
    "đại học": "Bachelor",
    "dai hoc": "Bachelor",
    "cao đẳng": "Associate",
    "cao dang": "Associate",
    "associate": "Associate",
    "diploma": "Diploma",
}


def extract_education(text: str) -> Tuple[Optional[str], List[EducationItem]]:
    """
    Extract education summary string and structured education entries.
    Returns (None, []) if no education information is present.
    """
    if not text:
        return None, []

    items: List[EducationItem] = []
    summary: Optional[str] = None

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    edu_pat = re.compile(
        r"(?:đại học|dai hoc|university|cử nhân|cu nhan|kỹ sư|ky su|thạc sĩ|thac si|tiến sĩ|tien si|bachelor|master|b\.s\.|m\.s\.|ph\.d\.|college|institute|học viện)[^\n.]*",
        re.IGNORECASE
    )

    for line in lines:
        match = edu_pat.search(line)
        if match:
            found_str = match.group(0).strip()
            if not summary:
                summary = found_str

            lower_line = line.lower()
            detected_degree = None
            for term, deg_label in DEGREE_TERMS.items():
                if term in lower_line:
                    detected_degree = deg_label
                    break

            year_match = re.search(r"\b(19\d{2}|20\d{2})\b", line)
            grad_year = int(year_match.group(1)) if year_match else None

            items.append(
                EducationItem(
                    degree=detected_degree,
                    institution=found_str,
                    graduation_year=grad_year
                )
            )

    return summary, items


# =============================================================================
# Contact Info (Name, Email, Phone) Extraction
# =============================================================================

def extract_contact_info(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Extract full name, email, and phone without inventing defaults.
    Returns (full_name, email, phone).
    """
    if not text:
        return None, None, None

    # Email
    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    email = email_match.group(0) if email_match else None

    # Phone (Vietnamese & international format)
    phone_match = re.search(r"(?:\+?84|0)(?:\d{9,10})\b", text)
    phone = phone_match.group(0) if phone_match else None

    # Name extraction heuristic: first non-empty line without email, phone, or URL
    full_name: Optional[str] = None
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:5]:
        if "@" in line or "http" in line or any(c.isdigit() for c in line if c not in "+-"):
            continue
        if 2 <= len(line) <= 50 and not any(kw in line.lower() for kw in ["curriculum", "resume", "cv", "hồ sơ", "ho so"]):
            full_name = line
            break

    return full_name, email, phone


# =============================================================================
# Unified CV & JD Normalizers
# =============================================================================

def normalize_cv(raw_text: str) -> ParsedCVData:
    """
    Full CV normalization pipeline.
    Transforms raw document text into standardized ParsedCVData.
    Does NOT invent fake candidate values.
    """
    if not raw_text or not raw_text.strip():
        return ParsedCVData()

    full_name, email, phone = extract_contact_info(raw_text)
    skills = extract_skills_from_text(raw_text)
    languages = extract_languages_from_text(raw_text)
    exp_years = extract_experience_years(raw_text)
    work_exp = extract_work_history(raw_text)
    edu_summary, edu_details = extract_education(raw_text)

    job_titles: List[str] = []
    for line in raw_text.splitlines():
        canonical_title, _ = normalize_job_title(line)
        if canonical_title and canonical_title in CANONICAL_TITLE_MAP.values():
            if canonical_title not in job_titles:
                job_titles.append(canonical_title)

    return ParsedCVData(
        full_name=full_name,
        email=email,
        phone=phone,
        job_titles=job_titles,
        skills=skills,
        languages=languages,
        experience_years=exp_years,
        work_experience=work_exp,
        education=edu_summary,
        education_details=edu_details,
    )


def normalize_jd(
    job_title: str,
    job_description: Optional[str] = "",
    job_requirements: Optional[str] = "",
) -> ParsedJDData:
    """
    Full JD normalization pipeline.
    Accepts raw JD fields, parses and normalizes requirements without inventing data.
    """
    title = (job_title or "").strip()
    canonical_title, seniority = normalize_job_title(title)

    desc = job_description or ""
    reqs = job_requirements or ""
    combined_body = f"{title}\n{desc}\n{reqs}"

    # Extract required skills primarily from requirements/description
    req_section = reqs or desc
    required_skills = extract_skills_from_text(req_section)
    if not required_skills:
        required_skills = extract_skills_from_text(combined_body)

    # Look for preferred / nice-to-have section
    preferred_skills: List[str] = []
    preferred_match = re.search(r"(?:preferred|nice to have|ưu tiên|uu tien|plus)[:\s]+([^\n]+(?:\n[^\n]+){0,4})", combined_body, re.IGNORECASE)
    if preferred_match:
        preferred_skills = extract_skills_from_text(preferred_match.group(1))
        # Ensure preferred skills are not treated as missing mandatory requirements
        required_skills = [s for s in required_skills if s not in preferred_skills]

    exp_years = extract_experience_years(reqs) or extract_experience_years(desc) or extract_experience_years(title)
    edu_summary, _ = extract_education(reqs or desc)
    languages = extract_languages_from_text(reqs or desc)

    return ParsedJDData(
        job_title=title,
        canonical_title=canonical_title,
        seniority=seniority,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        required_experience_years=exp_years,
        required_education=edu_summary,
        required_languages=languages,
        raw_requirements=reqs,
    )
