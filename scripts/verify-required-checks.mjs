import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_JOBS = [
  "quality",
  "unit",
  "postgres",
  "migrations",
  "production",
  "dependencies",
];

export function evaluateRequiredChecks(results) {
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    return {
      passed: false,
      missing: [...REQUIRED_JOBS],
      unsuccessful: REQUIRED_JOBS.map((job) => ({ job, result: "missing" })),
    };
  }

  const missing = REQUIRED_JOBS.filter((job) => !Object.hasOwn(results, job));
  const unsuccessful = REQUIRED_JOBS.flatMap((job) => {
    const result = results[job]?.result;
    return result === "success" ? [] : [{ job, result: result ?? "missing" }];
  });

  return { passed: missing.length === 0 && unsuccessful.length === 0, missing, unsuccessful };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  let results;
  try {
    results = JSON.parse(process.env.NEEDS_JSON ?? "");
  } catch {
    console.error("Required CI results were missing or invalid JSON.");
    process.exit(1);
  }

  const evaluation = evaluateRequiredChecks(results);
  if (!evaluation.passed) {
    console.error("Required CI jobs did not all succeed:");
    for (const { job, result } of evaluation.unsuccessful) {
      console.error(`- ${job}: ${result}`);
    }
    process.exit(1);
  }

  console.log("All required CI jobs succeeded.");
}
