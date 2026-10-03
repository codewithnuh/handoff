export declare const REQUIRED_JOBS: readonly string[];

export declare function evaluateRequiredChecks(
  results: unknown,
): {
  passed: boolean;
  missing: string[];
  unsuccessful: { job: string; result: string }[];
};
