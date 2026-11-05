import { describe, expect, it } from "vitest";
import { validateMatchingResult } from "../services/contracts/matchingResult.contract";
import completed from "../fixtures/matching-result.fixture.json";
import pending from "../fixtures/matching-result-pending.fixture.json";
import { toApplicationViewModel } from "../mappers/applicationMapper";
import { toRankingViewModel } from "../mappers/rankingMapper";
const validate = value => validateMatchingResult(value, value.applicationId);
describe("Matching contract", () => {
  it("accepts completed/pending without converting null to zero", () => {
    expect(validate(completed).overallScore).toBe(completed.overallScore);
    expect(validate(pending).overallScore).toBeNull();
    expect(validate({ ...completed, overallScore: 0 }).overallScore).toBe(0);
  });
  it.each(["82", true, -1, 101, 82.5, undefined])("rejects invalid score %s", overallScore => {
    expect(() => validate({ ...completed, overallScore })).toThrow("overallScore");
  });
  it.each([
    ["status", "queued"], ["breakdown", "{}"], ["matchedSkills", null],
    ["matchedSkills", [1]], ["missingSkills", [""]], ["criteriaScores", { skills: null }],
    ["criteriaScores", { skills: "80" }], ["explanation", 7], ["evaluatedAt", "yesterday"],
    ["retryable", "false"], ["attemptCount", -1], ["maxAttempts", 0]
  ])("rejects schema drift in %s", (field, value) => {
    expect(() => validate({ ...completed, [field]: value })).toThrow();
  });
  it("requires all canonical fields", () => {
    const value = { ...completed }; delete value.missingSkills;
    expect(() => validate(value)).toThrow("missingSkills");
  });
  it("does not accept a different application", () => {
    expect(() => validateMatchingResult(completed, pending.applicationId + "x")).toThrow("applicationId");
  });
  it("requires null scores until completed", () => {
    expect(() => validate({ ...pending, overallScore: 0 })).toThrow("overallScore");
  });
  it("retains null in list/ranking mappers", () => {
    expect(toApplicationViewModel({ matchScore: null }).matchScore).toBeNull();
    expect(toRankingViewModel({ overallScore: null }).overallScore).toBeNull();
    expect(toApplicationViewModel({ matchScore: 0 }).matchScore).toBe(0);
  });
});
