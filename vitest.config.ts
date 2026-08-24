import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Generous budget: first-run module imports (better-auth, bcrypt) can be
    // slow on cold caches / CI, which otherwise trips the 5s default.
    testTimeout: 20_000,
  },
});
