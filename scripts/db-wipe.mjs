/**
 * Wipes ALL data from the database while keeping the schema and migration
 * history intact. For a fresh start during development.
 *
 *   pnpm db:wipe
 *
 * ⚠️ Destructive: removes every user, workspace, client, project,
 * deliverable, task, invite, session — everything.
 */

import "dotenv/config";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `);

  if (rows.length === 0) {
    console.log("No tables found — nothing to wipe.");
    await client.end();
    return;
  }

  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  await client.query(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );

  console.log(
    `Wiped ${rows.length} tables. Database is empty; schema and migrations preserved.`,
  );

  // sanity check
  const users = await client.query("SELECT count(*)::int AS n FROM users");
  console.log(`users remaining: ${users.rows[0].n}`);

  await client.end();
}

main().catch((e) => {
  console.error("Wipe failed:", e.message);
  process.exit(1);
});
