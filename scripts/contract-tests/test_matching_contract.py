"""Cross-layer contract checks for MatchaJob MatchingResultResponse.

Runs with the Python standard library only. These tests validate source/fixture alignment,
not live HTTP behavior or real AI scoring quality.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC_FIXTURES = ROOT / "docs" / "contracts" / "fixtures"
FRONTEND_FIXTURES = ROOT / "frontend" / "src" / "fixtures"

PUBLIC_FIELDS = {
    "applicationId", "jobId", "cvVersionId", "status", "overallScore",
    "skillsScore", "experienceScore", "criteriaScores", "matchedSkills",
    "missingSkills", "breakdown", "explanation", "processingJobId",
    "evaluatedAt", "message"
}


def read_json(path: Path):
    if not path.is_file():
        raise AssertionError(f"Missing fixture: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


class MatchingContractTests(unittest.TestCase):
    def test_completed_public_fixture_has_the_canonical_shape(self):
        docs = read_json(DOC_FIXTURES / "matching-result-completed.json")
        frontend = read_json(FRONTEND_FIXTURES / "matching-result.fixture.json")
        self.assertEqual(docs, frontend, "The frontend fallback fixture must mirror the documented contract fixture")
        self.assertEqual(set(docs), PUBLIC_FIELDS)
        self.assertEqual(docs["status"], "COMPLETED")
        for field in ("overallScore", "skillsScore", "experienceScore"):
            self.assertIsInstance(docs[field], int)
            self.assertGreaterEqual(docs[field], 0)
            self.assertLessEqual(docs[field], 100)
        self.assertIsInstance(docs["matchedSkills"], list)
        self.assertIsInstance(docs["missingSkills"], list)
        self.assertIsInstance(docs["criteriaScores"], dict)

    def test_pending_fixture_keeps_scores_null(self):
        docs = read_json(DOC_FIXTURES / "matching-result-pending.json")
        frontend = read_json(FRONTEND_FIXTURES / "matching-result-pending.fixture.json")
        self.assertEqual(docs, frontend)
        self.assertEqual(set(docs), PUBLIC_FIELDS)
        self.assertEqual(docs["status"], "PENDING")
        self.assertIsNone(docs["overallScore"])
        self.assertIsNone(docs["skillsScore"])
        self.assertIsNone(docs["experienceScore"])
        self.assertGreater(len(docs["processingJobId"]), 0)

    def test_ai_worker_snake_case_fixture_maps_to_public_skill_lists(self):
        ai = read_json(DOC_FIXTURES / "ai-match-score-response.json")
        public = read_json(DOC_FIXTURES / "matching-result-completed.json")
        self.assertIn("overall_score", ai)
        self.assertIn("skills_score", ai)
        self.assertIn("experience_score", ai)
        self.assertIn("breakdown", ai)
        self.assertIn("rationale", ai)
        self.assertEqual(public["matchedSkills"], ai["breakdown"]["required_skills_matched"])
        self.assertEqual(public["missingSkills"], ai["breakdown"]["missing_skills"])

    def test_java_dto_controller_and_frontend_map_the_contract_fields(self):
        dto = (ROOT / "backend/src/main/java/com/matchajob/matching/dto/MatchingResultResponse.java").read_text(encoding="utf-8")
        controller = (ROOT / "backend/src/main/java/com/matchajob/matching/controller/MatchController.java").read_text(encoding="utf-8")
        mapper = (ROOT / "backend/src/main/java/com/matchajob/matching/service/MatchingResultMapper.java").read_text(encoding="utf-8")
        frontend_service = (ROOT / "frontend/src/services/api/apiApplicationService.js").read_text(encoding="utf-8")
        detail_ui = (ROOT / "frontend/src/pages/employer/components/CandidateDetailModal.jsx").read_text(encoding="utf-8")
        ai_schema = (ROOT / "ai-worker/app/schemas/ai.py").read_text(encoding="utf-8")
        matching_service = (ROOT / "backend/src/main/java/com/matchajob/matching/service/MatchingService.java").read_text(encoding="utf-8")

        for field in PUBLIC_FIELDS:
            self.assertRegex(dto, rf"\b{re.escape(field)}\b", f"DTO missing field {field}")
        self.assertIn('@GetMapping("/{applicationId}/match")', controller)
        self.assertIn('@PostMapping("/{applicationId}/match")', controller)
        self.assertIn("ResponseEntity.ok(matchingResultMapper.fromEntity(result))", controller)
        self.assertNotIn("@ResponseStatus(HttpStatus.ACCEPTED)", controller)
        self.assertIn('"required_skills_matched"', mapper)
        self.assertIn('"missing_skills"', mapper)
        self.assertIn('/v1/applications/${applicationId}/match', frontend_service)
        self.assertIn('matchedSkills', frontend_service)
        self.assertIn('missingSkills', frontend_service)
        self.assertIn('Đối chiếu CV–JD', detail_ui)
        self.assertIn('explanation', detail_ui)
        for field in ("overall_score", "skills_score", "experience_score", "breakdown", "rationale"):
            self.assertIn(field, ai_schema)

    def test_synchronous_matching_keeps_processing_job_state_consistent(self):
        service = (ROOT / "backend/src/main/java/com/matchajob/processing/service/ProcessingJobService.java").read_text(encoding="utf-8")
        matching_service = (ROOT / "backend/src/main/java/com/matchajob/matching/service/MatchingService.java").read_text(encoding="utf-8")
        self.assertRegex(
            matching_service,
            r"processingJob\.ifPresent\(processingRecord -> processingJobService\.startJob\(processingRecord\.getId\(\)\)\)",
        )
        self.assertIn("processingJobService.markJobCompleted(processingRecord.getId())", matching_service)
        self.assertIn("processingJobService.markJobFailed(", matching_service)
        self.assertIn('job.setStatus("COMPLETED")', service)
        self.assertIn('job.setStatus("FAILED")', service)
        self.assertIn('job.setStatus("PENDING")', service)  # retryable failure with backoff


if __name__ == "__main__":
    unittest.main(verbosity=2)
