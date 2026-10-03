import { afterAll, beforeAll } from "vitest";
import { db } from "@/lib/prisma";
import { assertTestDatabaseUrl } from "../../scripts/integration-db-guard.mjs";

const fixturePrefix = "itest_";

assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
assertTestDatabaseUrl(process.env.DATABASE_URL);

beforeAll(async () => {
  await db.invoice.deleteMany({ where: { projectId: { startsWith: fixturePrefix } } });
  await db.user.deleteMany({ where: { id: { startsWith: fixturePrefix } } });
  await db.file.deleteMany({ where: { id: { startsWith: fixturePrefix } } });
});

afterAll(async () => {
  await db.invoice.deleteMany({ where: { projectId: { startsWith: fixturePrefix } } });
  await db.user.deleteMany({ where: { id: { startsWith: fixturePrefix } } });
  await db.file.deleteMany({ where: { id: { startsWith: fixturePrefix } } });
  await db.$disconnect();
});
