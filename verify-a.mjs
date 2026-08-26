/* Verify A: settings, invite status flip, role changes, assignment panel */
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import { Client } from "pg";

const envDump = JSON.parse(
  fs.readFileSync(`${os.tmpdir()}/opencode/env.json`, "utf8"),
);
export const db = new Client({ connectionString: envDump.DATABASE_URL });
export const BASE = "http://localhost:3111";
export const results = [];
export const log = (name, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);

/* exported state for part B */
export const stamp = Date.now();
export const ownerEmail = `owner${stamp}@test.dev`;
export const mateEmail = `mate${stamp}@test.dev`;
export let wsId;
export let projId;

await db.connect();

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const ctx = await browser.newContext();
export const page = await ctx.newPage();

const reg = await page.request.post(`${BASE}/api/auth/sign-up/email`, {
  data: { name: "Owner O", email: ownerEmail, password: "password123" },
});
log("owner signup", reg.ok());

const userId = (
  await db.query("SELECT id FROM users WHERE email=$1", [ownerEmail])
).rows[0].id;
wsId = (
  await db.query(
    'INSERT INTO workspaces (id,name,"ownerId","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,now(),now()) RETURNING id',
    ["Verify Studio", userId],
  )
).rows[0].id;
await db.query('UPDATE users SET "activeWorkspaceId"=$1 WHERE id=$2', [
  wsId,
  userId,
]);
const clientRow = (
  await db.query(
    'INSERT INTO clients (id,name,email,"workspaceId","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,now(),now()) RETURNING id',
    ["V Client", `c${stamp}@test.dev`, wsId],
  )
).rows[0].id;
projId = (
  await db.query(
    'INSERT INTO projects (id,name,status,progress,"clientId","workspaceId","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,now(),now()) RETURNING id',
    ["Verify Project", "IN_PROGRESS", 10, clientRow.id, wsId],
  )
).rows[0].id;

// ── Settings ──
await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
let body = await page.locator("body").innerText();
log("settings shows email", body.includes(ownerEmail));
log("settings shows Owner badge", body.includes("Owner"));
log("settings has password form", body.includes("Change Password"));

await page.locator("#settings-name").fill("Owner Renamed");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.waitForTimeout(1500);
const renamed = (
  await db.query("SELECT name FROM users WHERE id=$1", [userId])
).rows[0].name;
log("profile rename persisted", renamed === "Owner Renamed", renamed);

await page.locator("#current-password").fill("password123");
await page.locator("#new-password").fill("newpass9876");
await page.locator("#confirm-password").fill("newpass9876");
await page.getByRole("button", { name: /Update password/i }).click();
await page.waitForTimeout(2000);
const relogin = await fetch(`${BASE}/api/auth/sign-in/email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
  },
  body: JSON.stringify({ email: ownerEmail, password: "newpass9876" }),
});
log("changed password works for sign-in", relogin.ok);

const reloginRes = await page.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: ownerEmail, password: "newpass9876" },
});
log("browser re-login after password change", reloginRes.ok());

// ── Invite ──
await page.goto(`${BASE}/dashboard/team`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Invite Teammate" }).click();
await page.locator("#invite-teammate-email").fill(mateEmail);
const cb = page.getByRole("checkbox").first();
if (await cb.isVisible().catch(() => false)) await cb.check();
await page.getByRole("button", { name: "Create Invite" }).click();
await page.waitForTimeout(1800);
const link = await page
  .locator("p.font-mono")
  .first()
  .textContent()
  .catch(() => null);
log("invite created", !!link);

await page.goto(`${BASE}/dashboard/team`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
log("invite listed as Pending before accept", body.includes("Pending"));

// teammate accepts
const tctx = await browser.newContext();
const tpage = await tctx.newPage();
const localLink = link.replace(/^https?:\/\/[^/]+/, BASE);
await tpage.goto(localLink, { waitUntil: "networkidle" });
await tpage.locator("#accept-name").fill("Mate M");
await tpage.locator("#accept-password").fill("matepass123");
await tpage.getByRole("button", { name: "Join workspace" }).click();
await tpage.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
log("teammate joined", tpage.url().includes("/dashboard"));

await page.goto(`${BASE}/dashboard/team`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
log("invite flips to Accepted after join", body.includes("Accepted"));
log("teammate shows as member row", body.includes("Mate M"));

// promote/demote
const memberRow = page
  .locator("div.rounded-md.border")
  .filter({ hasText: mateEmail })
  .first();
const trigger = memberRow
  .locator("[data-slot='dropdown-menu-trigger']")
  .first();
await trigger.click();
await page.waitForTimeout(400);
await page.getByText("Make Admin").click();
await page.waitForTimeout(1800);
const dbRole = (
  await db.query(
    'SELECT role FROM workspace_members WHERE "workspaceId"=$1 AND "userId"=(SELECT id FROM users WHERE email=$2)',
    [wsId, mateEmail],
  )
).rows[0]?.role;
log("promote to ADMIN via UI", dbRole === "ADMIN", String(dbRole));

await trigger.click();
await page.waitForTimeout(400);
await page.getByText("Set as Member").click();
await page.waitForTimeout(1800);
const dbRole2 = (
  await db.query(
    'SELECT role FROM workspace_members WHERE "workspaceId"=$1 AND "userId"=(SELECT id FROM users WHERE email=$2)',
    [wsId, mateEmail],
  )
).rows[0]?.role;
log("demote to MEMBER via UI", dbRole2 === "MEMBER", String(dbRole2));

// assign mate to project
const addMemberSelect = page
  .getByRole("combobox")
  .filter({ hasText: "Add member…" })
  .first();
if ((await addMemberSelect.count()) > 0) {
  await addMemberSelect.click();
  await page.waitForTimeout(400);
  await page.getByRole("option", { name: "Mate M" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Assign" }).click();
  await page.waitForTimeout(2000);
  const pm = (
    await db.query(
      'SELECT role FROM project_members WHERE "projectId"=$1 AND "userId"=(SELECT id FROM users WHERE email=$2)',
      [projId, mateEmail],
    )
  ).rows[0]?.role;
  log("project assignment created", pm === "CONTRIBUTOR", String(pm));
} else {
  log("project assignment created", false, "add-member select not found");
}

await browser.close();

console.log("\n===== PART A =====");
console.log(results.join("\n"));
