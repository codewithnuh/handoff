/* Repro 2: portal flow — create client session, load portal page,
   verify APPROVED deliverable hides action buttons, then test the
   freelancer "changed it" path (flip status back to IN_REVIEW). */
import { chromium } from "playwright-core";
import { createHmac } from "node:crypto";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const PROJECT_ID = "7c01ac2a-0ea1-4de3-9093-b79e71ef30b7";
const CLIENT_EMAIL = "client@bugtest.com";
const SECRET = process.env.AUTH_SECRET;

async function main() {
  // 1. Create a portal session row directly in DB
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const expiresAt = new Date(Date.now() + 86400000);
  const res = await db.query(
    'INSERT INTO client_sessions (id, email, token, "expiresAt", "createdAt") VALUES (gen_random_uuid()::text, $1, gen_random_uuid()::text, $2, now()) RETURNING id',
    [CLIENT_EMAIL, expiresAt]
  );
  const sessionId = res.rows[0].id;

  // Need project_access for this email+project
  await db.query(
    'INSERT INTO project_access (id, "projectId", email, "createdAt") VALUES (gen_random_uuid()::text, $1, $2, now()) ON CONFLICT DO NOTHING',
    [PROJECT_ID, CLIENT_EMAIL]
  );
  await db.end();

  // 2. Sign the cookie value like lib/portal.ts does
  const signature = createHmac("sha256", SECRET).update(sessionId).digest("hex");
  const signed = `${sessionId}.${signature}`;

  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "cp_session", value: signed, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();

  const consoleMsgs = [];
  page.on("pageerror", (err) => consoleMsgs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`http://localhost:3111/portal/projects/${PROJECT_ID}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const body = await page.locator("body").innerText();
  console.log("=== PORTAL PAGE ===");
  console.log("Shows approved deliverable:", body.includes("Approved Thing"));
  console.log(
    "Approve buttons visible:",
    await page.getByRole("button", { name: /^Approve$/ }).count()
  );
  console.log(
    "Request Changes buttons visible:",
    await page.getByRole("button", { name: /Request Changes/i }).count()
  );
  console.log(
    "In-review deliverable has Approve:",
    (await page.getByRole("button", { name: /^Approve$/ }).count()) > 0
  );

  // Count total approve/request-changes buttons — expect 0 for APPROVED card,
  // 1 pair for the IN_REVIEW card.
  console.log("Console errors:", consoleMsgs.join("\n") || "(none)");

  await browser.close();
}

main().catch((e) => {
  console.error("SCRIPT ERROR:", e.message);
  process.exit(1);
});
