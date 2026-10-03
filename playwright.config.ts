import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: ci,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  outputDir: "test-results/e2e",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: "**/*.viewport.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: "**/*.viewport.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
  ],
  globalSetup: "./tests/e2e/smtp-global-setup.ts",
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/login`,
    reuseExistingServer: !ci,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      PORT: "3100",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "1025",
      EMAIL_FROM: "Handoff E2E <e2e@handoff.test>",
    },
  },
});
