"""Real HTTP acceptance. Creates synthetic accounts, company, jobs, CVs and applications.
Run only on the group's development/test deployment. No mock server and no SQL score seeding.
Tokens/passwords/CV raw text are not written to the evidence directory.
"""
import argparse
import io
import json
import secrets
import subprocess
import sys
import time
import uuid
from datetime import date, timedelta
from pathlib import Path
import httpx
from docx import Document
from jsonschema import Draft202012Validator, FormatChecker
ROOT = Path(__file__).resolve().parents[2]
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8081/api")
    parser.add_argument("--failure-base", help="Second real Backend sharing the test DB/JWT secret, configured with an unreachable Worker")
    parser.add_argument("--out", default="matching-live-evidence")
    parser.add_argument("--expect-cv-queued", action="store_true", help="Require CV-not-ready test; disable the CV scheduler on the test Backend first")
    parser.add_argument("--allow-write-test-data", action="store_true", required=True)
    args = parser.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    outcomes = []; resource_ids = {}
    schema = json.loads((ROOT / "docs/contracts/schemas/matching-result.schema.json").read_text())
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    run = uuid.uuid4().hex[:12]
    def check(case, detail):
        outcomes.append({"case": case, "status": "PASS", "detail": detail}); print(f"PASS {case}: {detail}", flush=True)
    def save_result(name, body):
        validator.validate(body)
        path = out / (name + ".json"); path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
        subprocess.run(["node", str(ROOT / "scripts/contract-tests/validate_frontend_matching.mjs"), str(path), body["applicationId"]], check=True, stdout=subprocess.DEVNULL)
    with httpx.Client(timeout=80, trust_env=False) as client:
        def call(method, path, token=None, body=None, expected=200, base=None, files=None):
            response = client.request(method, (base or args.base).rstrip("/") + path,
                                      headers={"Authorization": "Bearer " + token} if token else {},
                                      json=body, files=files)
            assert response.status_code == expected, f"{method} {path}: expected {expected}, got {response.status_code}: {response.text[:300]}"
            return response
        def account(role):
            email = f"matching-{run}-{role}-{secrets.token_hex(2)}@example.test"; password = secrets.token_urlsafe(20)
            result = call("POST", "/v1/auth/register", body={"email": email, "password": password, "role": role}, expected=201).json()
            assert result["status"] == "active", "Enable development registration without email verification for this test"
            return call("POST", "/v1/auth/login", body={"email": email, "password": password}).json()["access_token"]
        try:
            employer = account("employer"); candidate = account("candidate"); outsider = account("candidate")
            company = call("POST", "/v1/companies", employer, {"name": "Matching acceptance " + run}, 201).json()["id"]
            profile = call("GET", "/v1/candidates/profile", candidate).json()["id"]
            resource_ids.update(companyId=company, candidateId=profile)
            check("TC-L01", "Real accounts/JWT/company/profile created through Backend APIs")
            def job(title):
                return call("POST", "/v1/employer/jobs", employer,
                            {"companyId": company, "title": title + " " + run, "status": "active", "workType": "full_time", "level": "junior", "salaryMode": "negotiable", "deadline": str(date.today() + timedelta(days=30)), "description": "Build Java backend services", "requirements": "Java, Spring Boot, PostgreSQL, 3 years experience", "skills": []}, 201).json()["id"]
            doc = Document(); doc.add_paragraph("Matching Acceptance Candidate. Java and Spring Boot developer with 4 years experience.")
            buffer = io.BytesIO(); doc.save(buffer); content = buffer.getvalue()
            cv = call("POST", f"/v1/candidates/{profile}/cv?sync=true", candidate,
                      files={"file": ("matching-acceptance.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}, expected=202).json()
            assert cv["status"].lower() in ("extracted", "processed", "completed"), f"CV extraction did not complete: {cv['status']}"
            cv_id = cv["cv_version_id"]
            check("TC-L02", "DOCX extracted by real Worker and persisted by Backend")
            def apply(job_id, cv_version=cv_id):
                return call("POST", "/v1/applications", candidate, {"jobId": job_id, "cvVersionId": cv_version, "coverLetter": "Matching integration acceptance"}, 201).json()["applicationId"]
            application = apply(job("Matching happy path")); resource_ids["applicationId"] = application
            path = f"/v1/applications/{application}/match"
            pending = call("GET", path, employer).json(); save_result("pending", pending)
            assert pending["status"] == "PENDING" and pending["overallScore"] is None and pending["retryable"] is True
            check("TC-L03", "Queued/PENDING result keeps null scores; actual Frontend validator accepts it")
            completed = call("POST", path, employer).json(); save_result("completed", completed)
            assert completed["status"] == "COMPLETED" and completed["cvVersionId"] == cv_id
            assert completed["matchedSkills"], "Expected matching skills for the controlled CV/JD"
            check("TC-L04", "Backend called Worker and returned persisted completed result with skills/breakdown/explanation")
            reread = call("GET", path, candidate).json()
            assert reread == completed, "POST/GET differ at " + ", ".join(key for key in completed if completed[key] != reread.get(key))
            repeated = call("POST", path, employer).json()
            assert repeated == completed, "Repeated POST differs from the persisted result"
            check("TC-L05", "GET and repeated POST return the same persisted result/timestamp")
            listing = call("GET", "/v1/employer/applications?jobId=" + completed["jobId"], employer).json()
            assert any(item["applicationId"] == application for item in listing)
            check("TC-L06", "Employer application list includes the real application ID")
            for case, token, expected in [("TC-L07", None, 401), ("TC-L08", outsider, 403)]:
                error = call("GET", path, token, expected=expected)
                assert error.headers["content-type"].startswith("application/problem+json")
                check(case, f"HTTP {expected} returned as Problem Details")
            call("GET", f"/v1/applications/{uuid.uuid4()}/match", employer, expected=404)
            check("TC-L09", "Unknown application returns 404")
            if args.expect_cv_queued:
                queued_cv = call("POST", f"/v1/candidates/{profile}/cv", candidate, files={"file": ("queued.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}, expected=202).json()["cv_version_id"]
                not_ready = apply(job("Matching CV not ready"), queued_cv)
                error = call("POST", f"/v1/applications/{not_ready}/match", employer, expected=409)
                assert error.json()["code"] == "MATCHING_NOT_READY"
                check("TC-L10", "Unprocessed CV returns 409 MATCHING_NOT_READY without a score")
            else:
                outcomes.append({"case": "TC-L10", "status": "NOT_RUN", "detail": "Use --expect-cv-queued with the CV scheduler disabled"})
            if args.failure_base:
                failure_app = apply(job("Matching Worker transport failure")); resource_ids["failureApplicationId"] = failure_app
                failure_path = f"/v1/applications/{failure_app}/match"
                for attempt in range(1, 4):
                    error = call("POST", failure_path, employer, expected=502, base=args.failure_base)
                    assert error.json()["code"] == "MATCHING_WORKER_UNAVAILABLE"
                    state = call("GET", failure_path, employer, base=args.failure_base).json(); save_result(f"failure-attempt-{attempt}", state)
                    assert state["attemptCount"] == attempt
                    if attempt < 3:
                        assert state["status"] == "PENDING" and state["retryable"] is True
                        conflict = call("POST", failure_path, employer, expected=409, base=args.failure_base)
                        assert conflict.json()["code"] == "MATCHING_BACKOFF"
                        time.sleep((2 ** attempt) * 2 + 0.3)
                    else:
                        assert state["status"] == "FAILED" and state["retryable"] is False
                check("TC-L11", "Real Worker connection failure yields 502, persisted backoff, and FAILED after 3 attempts")
            else:
                outcomes.append({"case": "TC-L11", "status": "NOT_RUN", "detail": "Supply --failure-base for real transport failure/backoff verification"})
        except Exception as error:
            outcomes.append({"case": "EXECUTION", "status": "FAIL", "detail": str(error)})
            print("FAIL:", error, flush=True)
        finally:
            failed = any(item["status"] == "FAIL" for item in outcomes)
            missing = any(item["status"] == "NOT_RUN" for item in outcomes)
            report = {"status": "FAIL" if failed else "PARTIAL" if missing else "PASS", "cases": outcomes, "resources": resource_ids,
                      "notes": "Real API/Worker integration. This does not verify an external LLM call or scoring quality. Test records remain in the development DB for inspection."}
            (out / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            print("RESULT:", report["status"], flush=True)
    return 1 if failed else 2 if missing else 0
if __name__ == "__main__": sys.exit(main())
