"""Executable schema and cross-language serialization checks, not source-string searches."""
import argparse
import copy
import json
import subprocess
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
ROOT = Path(__file__).resolve().parents[2]
def read(path):
    return json.loads(path.read_text(encoding="utf-8"))
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--java-artifacts", action="store_true", help="Require actual DTO payloads exported by MatchScoreContractTest")
    args = parser.parse_args()
    schema = read(ROOT / "docs/contracts/schemas/matching-result.schema.json")
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    worker = Draft202012Validator(read(ROOT / "docs/contracts/schemas/ai-match-score-response.schema.json"))
    worker.validate(read(ROOT / "docs/contracts/fixtures/ai-match-score-response.json"))
    print("PASS TC-C01: Worker response fixture validates against the shared schema")
    for doc, frontend in [("matching-result-completed.json", "matching-result.fixture.json"), ("matching-result-pending.json", "matching-result-pending.fixture.json")]:
        value = read(ROOT / "docs/contracts/fixtures" / doc)
        assert value == read(ROOT / "frontend/src/fixtures" / frontend)
        validator.validate(value)
        subprocess.run(["node", str(ROOT / "scripts/contract-tests/validate_frontend_matching.mjs"), str(ROOT / "docs/contracts/fixtures" / doc)], check=True)
    print("PASS TC-C02: Shared examples pass JSON Schema and the actual Frontend runtime validator")
    completed = read(ROOT / "docs/contracts/fixtures/matching-result-completed.json")
    mutations = []
    for key in schema["required"]:
        value = copy.deepcopy(completed); value.pop(key); mutations.append(value)
    for key, invalid in [("overallScore", "82"), ("overallScore", True), ("overallScore", 101), ("overallScore", 82.5), ("status", "queued"), ("breakdown", "{}"), ("matchedSkills", None), ("missingSkills", [1]), ("criteriaScores", {"skills": "80"}), ("evaluatedAt", "yesterday"), ("retryable", "false")]:
        value = copy.deepcopy(completed); value[key] = invalid; mutations.append(value)
    for index, value in enumerate(mutations):
        assert list(validator.iter_errors(value)), f"Invalid payload unexpectedly accepted: mutation {index}"
    print(f"PASS TC-C03: {len(mutations)} missing-field/type/enum/nullability mutations are rejected")
    if args.java_artifacts:
        for name in ("completed.json", "pending.json"):
            path = ROOT / "backend/target/matching-contract" / name
            if not path.exists(): raise RuntimeError("Run MatchScoreContractTest before --java-artifacts")
            validator.validate(read(path))
            subprocess.run(["node", str(ROOT / "scripts/contract-tests/validate_frontend_matching.mjs"), str(path)], check=True)
        print("PASS TC-C04: Actual Java DTO JSON passes shared schema and Frontend validator")
    else:
        print("NOT_RUN TC-C04: Java serialization payloads; run again with --java-artifacts after Maven tests")
    print("Contract checks completed. This does not claim a live deployment passed.")
if __name__ == "__main__": main()
