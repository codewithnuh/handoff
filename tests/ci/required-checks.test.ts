import { describe, expect, it } from "vitest";
import { evaluateRequiredChecks, REQUIRED_JOBS } from "../../scripts/verify-required-checks.mjs";

function allSuccessful() {
  return Object.fromEntries(REQUIRED_JOBS.map((job) => [job, { result: "success" }]));
}

describe("required CI aggregate", () => {
  it("passes only when every required job succeeds", () => {
    expect(evaluateRequiredChecks(allSuccessful()).passed).toBe(true);
  });

  it.each(["failure", "cancelled", "skipped"])(
    "blocks merge when a required job is %s",
    (result) => {
      const jobs = allSuccessful();
      jobs.production = { result };
      expect(evaluateRequiredChecks(jobs)).toMatchObject({
        passed: false,
        unsuccessful: [{ job: "production", result }],
      });
    },
  );

  it("fails closed when a required result is missing", () => {
    const jobs = allSuccessful();
    delete jobs.dependencies;
    expect(evaluateRequiredChecks(jobs)).toMatchObject({
      passed: false,
      missing: ["dependencies"],
      unsuccessful: [{ job: "dependencies", result: "missing" }],
    });
  });

  it.each([null, "not an object", []])("fails closed for invalid job results: %s", (results) => {
    expect(evaluateRequiredChecks(results).passed).toBe(false);
  });
});
