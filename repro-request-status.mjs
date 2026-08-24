/* Repro 3: interact with the Client Requests tab Select (status change). */
import { chromium } from "playwright-core";
import fs from "node:fs";

const PROJECT_URL =
  "http://localhost:3111/dashboard/projects/7c01ac2a-0ea1-4de3-9093-b79e71ef30b7";

const jar = fs.readFileSync(
  "C:/Users/NOORUL~1/AppData/Local/Temp/opencode/cookies.txt",
  "utf8"
);
const m = jar.match(/better-auth\.session_token\t(\S+)/);
const token = decodeURIComponent(m[1]);

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "better-auth.session_token", value: token, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: /Client Requests/i }).click();
  await page.waitForTimeout(800);

  // Open the request's status Select and pick "In Progress"
  const trigger = page.locator("[data-slot='select-trigger']");
  console.log("Select triggers in tab:", await trigger.count());
  await trigger.first().click();
  await page.waitForTimeout(500);
  const option = page.getByRole("option", { name: "In Progress" });
  console.log("'In Progress' option visible:", await option.count());
  if ((await option.count()) > 0) {
    await option.click();
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    console.log("Toast shown:", body.includes("Status updated") || body.includes("marked as"));
    // Verify DB update reflected after router.refresh()
    const badge = await page.locator("[data-slot='badge']").allTextContents();
    console.log("Badges:", badge.join(","));
  }
  console.log("Page errors:", errors.join("\n") || "(none)");
  await browser.close();
})().catch((e) => {
  console.error("SCRIPT ERROR:", e.message);
  process.exit(1);
});
