import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/tests/integration/**", "**/tests/e2e/**"],
    reporters: ["default", ["junit", { outputFile: "test-results/unit-junit.xml" }]],
    coverage: {
      provider: "v8",
      include: [
        "lib/access/**/*.ts",
        "lib/actions/auth.ts",
        "lib/actions/client.ts",
        "lib/actions/define.ts",
        "lib/actions/helpers.ts",
        "lib/actions/invitation.ts",
        "lib/invoice/**/*.ts",
        "lib/portal.ts",
      ],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 82,
        "lib/access/**/*.ts": {
          statements: 65,
          branches: 45,
          functions: 60,
          lines: 70,
        },
        "lib/actions/auth.ts": {
          statements: 65,
          branches: 30,
          functions: 70,
          lines: 65,
        },
        "lib/actions/define.ts": { statements: 95, branches: 90, functions: 95, lines: 95 },
        "lib/invoice/**/*.ts": {
          statements: 80,
          branches: 70,
          functions: 75,
          lines: 85,
        },
        "lib/portal.ts": {
          statements: 80,
          branches: 75,
          functions: 50,
          lines: 82,
        },
      },
    },
    // Generous budget: first-run module imports (better-auth, bcrypt) can be
    // slow on cold caches / CI, which otherwise trips the 5s default.
    testTimeout: 20_000,
  },
});
