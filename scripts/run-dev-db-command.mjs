import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getDevDatabaseUrl } from "./dev-db-guard.mjs";

const commands = new Map([
  ["push", ["db", "push"]],
  ["migrate", ["migrate", "dev"]],
  ["reset", ["migrate", "reset"]],
]);
const requestedCommand = process.argv[2];
const prismaArgs = commands.get(requestedCommand);
if (!prismaArgs) {
  throw new Error("Choose one guarded command: push, migrate, or reset.");
}

const databaseUrl = getDevDatabaseUrl(process.env.DEV_DATABASE_URL);
const cli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, ...prismaArgs, ...process.argv.slice(3)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
