import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertTestDatabaseUrl } from "./integration-db-guard.mjs";

const databaseUrl = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  NODE_ENV: "test",
};
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const vitestCli = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);

function run(args) {
  const result = spawnSync(process.execPath, args, {
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([prismaCli, "migrate", "deploy"]);
run([
  vitestCli,
  "run",
  "--config",
  "vitest.integration.config.ts",
  "--passWithNoTests=false",
]);
