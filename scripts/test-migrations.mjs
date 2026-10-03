import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { assertTestDatabaseUrl } from "./integration-db-guard.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const migrationsDirectory = path.join(root, "prisma", "migrations");
const baselineMigration = "20261003000000_private_project_files";
const migrationNames = (await readdir(migrationsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const baselineIndex = migrationNames.indexOf(baselineMigration);
if (baselineIndex < 0 || baselineIndex === migrationNames.length - 1) {
  throw new Error(
    `Expected ${baselineMigration} to precede the migrations under test. Update this test deliberately when the baseline changes.`,
  );
}

const baseUrl = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const runId = randomBytes(6).toString("hex");
const schemas = [`cod87_fresh_${runId}`, `cod87_upgrade_${runId}`];
const cli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const now = "2026-10-03T08:00:00.000Z";
const termEnd = "2030-01-01T00:00:00.000Z";

function migrationUrl(schema) {
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function runPrisma(schema, args, migrationPath) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: migrationUrl(schema),
      PRISMA_MIGRATIONS_PATH: migrationPath ?? migrationsDirectory,
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Prisma ${args.join(" ")} failed for schema ${schema}.`);
  }
}

async function withSchema(schema, action) {
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  await client.query(`SET search_path TO "${schema}"`);
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

async function createSchema(schema) {
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await client.end();
  }
}

async function migrationCount(schema) {
  return withSchema(schema, async (client) => {
    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM "_prisma_migrations"');
    return rows[0].count;
  });
}

async function deployTwiceAndCheck(schema) {
  runPrisma(schema, ["migrate", "deploy"]);
  const before = await migrationCount(schema);
  runPrisma(schema, ["migrate", "deploy"]);
  const after = await migrationCount(schema);
  if (before !== after || after !== migrationNames.length) {
    throw new Error(`Schema ${schema} did not reach a clean, repeatable migration state.`);
  }
  runPrisma(schema, ["migrate", "status"]);
  runPrisma(schema, [
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code",
  ]);
}

async function seedPopulatedBaseline(schema) {
  await withSchema(schema, async (client) => {
    await client.query(
      `INSERT INTO "users" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       VALUES ('cod87_owner', 'COD-87 Owner', 'cod87-owner@example.test', true, $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "workspaces" ("id", "name", "ownerId", "createdAt", "updatedAt")
       VALUES ('cod87_workspace', 'Migration Workspace', 'cod87_owner', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "workspaces" ("id", "name", "ownerId", "createdAt", "updatedAt")
       VALUES ('cod87_workspace_older_term', 'Second Migration Workspace', 'cod87_owner', $1, $1)`,
      [now],
    );
    await client.query('UPDATE "users" SET "activeWorkspaceId" = $1 WHERE "id" = $2', [
      "cod87_workspace",
      "cod87_owner",
    ]);
    await client.query(
      `INSERT INTO "accounts" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES ('cod87_account', 'cod87_owner@example.test', 'credential', 'cod87_owner', 'hash-placeholder', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "sessions" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
       VALUES ('cod87_session', $1, 'cod87-session-token', $2, $2, 'cod87_owner')`,
      [termEnd, now],
    );
    await client.query(
      `INSERT INTO "clients" ("id", "workspaceId", "name", "email", "createdAt", "updatedAt")
       VALUES ('cod87_client', 'cod87_workspace', 'Migration Client', 'client@example.test', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "projects" ("id", "workspaceId", "clientId", "name", "createdAt", "updatedAt")
       VALUES ('cod87_project', 'cod87_workspace', 'cod87_client', 'Migration Project', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "workspace_members" ("id", "workspaceId", "userId", "role", "permissions", "createdAt")
       VALUES ('cod87_workspace_member', 'cod87_workspace', 'cod87_owner', 'ADMIN', '{}', $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "project_members" ("id", "projectId", "userId", "role", "createdAt")
       VALUES ('cod87_project_member', 'cod87_project', 'cod87_owner', 'LEAD', $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "project_access" ("id", "projectId", "email", "createdAt")
       VALUES ('cod87_access', 'cod87_project', 'client@example.test', $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "client_sessions" ("id", "email", "token", "expiresAt", "createdAt")
       VALUES ('cod87_client_session', 'client@example.test', 'cod87-client-token', $1, $2)`,
      [termEnd, now],
    );
    await client.query(
      `INSERT INTO "deliverables" ("id", "projectId", "title", "version", "createdAt", "updatedAt")
       VALUES ('cod87_deliverable', 'cod87_project', 'Historical Deliverable', 2, $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "files" ("id", "key", "filename", "mimeType", "size", "projectId", "uploadedByUserId", "attachedAt", "createdAt")
       VALUES ('cod87_file', 'private/cod87/historical.pdf', 'historical.pdf', 'application/pdf', 2048, 'cod87_project', 'cod87_owner', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "deliverable_versions" ("id", "deliverableId", "versionNumber", "fileId", "notes", "createdAt")
       VALUES ('cod87_version', 'cod87_deliverable', 2, 'cod87_file', 'Retain this history', $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "requests" ("id", "projectId", "title", "createdAt", "updatedAt")
       VALUES ('cod87_request', 'cod87_project', 'Historical Request', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "comments" ("id", "content", "authorUserId", "authorEmail", "authorName", "deliverableId", "createdAt")
       VALUES ('cod87_comment', 'Historical comment', 'cod87_owner', 'cod87-owner@example.test', 'COD-87 Owner', 'cod87_deliverable', $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "invoices" ("id", "projectId", "invoiceNumber", "amount", "currency", "status", "createdAt", "updatedAt")
       VALUES ('cod87_invoice', 'cod87_project', 'MIG-001', 125.50, 'USD', 'SENT', $1, $1)`,
      [now],
    );
    await client.query(
      `INSERT INTO "subscriptions" ("id", "workspaceId", "plan", "status", "stripeCustomerId", "stripeSubscriptionId", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES ('cod87_stripe_sub', 'cod87_workspace', 'PRO', 'ACTIVE', 'cus_cod87', 'sub_cod87', $1, $2, $2)`,
      [termEnd, now],
    );
    await client.query(
      `INSERT INTO "subscriptions" ("id", "workspaceId", "plan", "status", "stripeCustomerId", "stripeSubscriptionId", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES ('cod87_stripe_sub_older_term', 'cod87_workspace_older_term', 'PRO', 'ACTIVE', 'cus_cod87_older', 'sub_cod87_older', '2028-01-01T00:00:00.000Z', $1, $1)`,
      [now],
    );
  });
}

async function assertUpgradePreserved(schema) {
  await withSchema(schema, async (client) => {
    const { rows: invoiceRows } = await client.query(
      'SELECT "invoiceNumber", "amount"::text AS amount, "subtotal"::text AS subtotal FROM "invoices" WHERE "id" = $1',
      ["cod87_invoice"],
    );
    if (invoiceRows.length !== 1 || invoiceRows[0].invoiceNumber !== "MIG-001" || invoiceRows[0].amount !== "125.50" || invoiceRows[0].subtotal !== "125.50") {
      throw new Error("Upgrade changed or lost the populated invoice total.");
    }

    const { rows: versionRows } = await client.query(
      `SELECT dv."versionNumber", f."key", dv."notes", c."content"
       FROM "deliverable_versions" dv
       JOIN "files" f ON f."id" = dv."fileId"
       JOIN "comments" c ON c."deliverableId" = dv."deliverableId"
       WHERE dv."id" = $1`,
      ["cod87_version"],
    );
    if (versionRows.length !== 1 || versionRows[0].versionNumber !== 2 || versionRows[0].key !== "private/cod87/historical.pdf" || versionRows[0].notes !== "Retain this history" || versionRows[0].content !== "Historical comment") {
      throw new Error("Upgrade did not preserve deliverable history, file ownership, or comments.");
    }

    const { rows: legacyRows } = await client.query(
      `SELECT s."workspaceId", s."stripeCustomerId", s."stripeSubscriptionId", current."userId", current."plan", current."status",
              to_char(current."gracePeriodEndsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS "gracePeriodEndsAt"
       FROM "legacy_stripe_subscriptions" s
       JOIN "subscriptions" current ON current."userId" = 'cod87_owner'
       WHERE s."id" = 'cod87_stripe_sub'`,
    );
    if (legacyRows.length !== 1 || legacyRows[0].workspaceId !== "cod87_workspace" || legacyRows[0].stripeCustomerId !== "cus_cod87" || legacyRows[0].stripeSubscriptionId !== "sub_cod87" || legacyRows[0].plan !== "PRO" || legacyRows[0].status !== "CANCELLED" || legacyRows[0].gracePeriodEndsAt !== termEnd.replace("Z", "")) {
      throw new Error(`Upgrade did not preserve the legacy Stripe record and remaining paid term: ${JSON.stringify(legacyRows[0] ?? null)}`);
    }
    const { rows: archiveCountRows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM "legacy_stripe_subscriptions" WHERE "workspaceId" IN ($1, $2)',
      ["cod87_workspace", "cod87_workspace_older_term"],
    );
    if (archiveCountRows[0].count !== 2) throw new Error("Upgrade dropped a legacy subscription for a second owned workspace.");

    const { rows: relationRows } = await client.query(
      `SELECT w."ownerId", c."workspaceId", p."clientId", a."projectId", cs."email"
       FROM "workspaces" w
       JOIN "clients" c ON c."workspaceId" = w."id"
       JOIN "projects" p ON p."clientId" = c."id"
       JOIN "project_access" a ON a."projectId" = p."id"
       JOIN "client_sessions" cs ON cs."email" = a."email"
       WHERE w."id" = 'cod87_workspace'`,
    );
    if (relationRows.length !== 1 || relationRows[0].ownerId !== "cod87_owner" || relationRows[0].clientId !== "cod87_client" || relationRows[0].projectId !== "cod87_project") {
      throw new Error("Upgrade lost workspace, client, project, or access relationships.");
    }

    const requiredIndexes = [
      "subscriptions_userId_key",
      "workspace_members_workspaceId_userId_key",
      "project_members_projectId_userId_key",
      "deliverable_versions_deliverableId_versionNumber_key",
      "files_uploadIntentId_key",
    ];
    const { rows: indexRows } = await client.query(
      'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ANY($1::text[])',
      [requiredIndexes],
    );
    const foundIndexes = new Set(indexRows.map((row) => row.indexname));
    const missingIndexes = requiredIndexes.filter((name) => !foundIndexes.has(name));
    if (missingIndexes.length) throw new Error(`PostgreSQL is missing required safety indexes: ${missingIndexes.join(", ")}`);

    const requiredConstraints = [
      "subscriptions_userId_fkey",
      "invoice_line_items_invoiceId_fkey",
    ];
    const { rows: constraintRows } = await client.query(
      'SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])',
      [requiredConstraints],
    );
    const found = new Set(constraintRows.map((row) => row.conname));
    const missing = requiredConstraints.filter((name) => !found.has(name));
    if (missing.length) throw new Error(`PostgreSQL is missing required safety constraints: ${missing.join(", ")}`);
  });
}

const tempDirectory = await mkdtemp(path.join(tmpdir(), "cod87-migrations-"));
const baselineDirectory = path.join(tempDirectory, "baseline");
try {
  await cp(migrationsDirectory, baselineDirectory, {
    recursive: true,
    filter(source) {
      const relative = path.relative(migrationsDirectory, source);
      if (!relative || relative === "migration_lock.toml") return true;
      const [migration] = relative.split(path.sep);
      return migrationNames.indexOf(migration) <= baselineIndex;
    },
  });

  for (const schema of schemas) await createSchema(schema);

  console.log("Checking a fresh install from all committed migrations...");
  await deployTwiceAndCheck(schemas[0]);

  console.log(`Creating populated upgrade fixture at ${baselineMigration}...`);
  runPrisma(schemas[1], ["migrate", "deploy"], baselineDirectory);
  await seedPopulatedBaseline(schemas[1]);
  console.log("Applying the candidate migrations and checking retained data...");
  await deployTwiceAndCheck(schemas[1]);
  await assertUpgradePreserved(schemas[1]);

  console.log("Fresh install, repeat deploy, schema drift, constraints, and populated upgrade checks passed.");
} finally {
  const cleanup = new Client({ connectionString: baseUrl });
  await cleanup.connect();
  try {
    for (const schema of schemas) await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await cleanup.end();
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
