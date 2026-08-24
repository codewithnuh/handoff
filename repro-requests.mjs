/* Repro script: loads the dashboard project page as a logged-in user,
   clicks the "Client Requests" tab, and reports what renders. */
import { chromium } from "playwright-core";
import fs from "node:fs";

const PROJECT_URL =
  "http://localhost:3111/dashboard/projects/7c01ac2a-0ea1-4de3-9093-b79e71ef30b7";

// Read session cookie from curl's cookie jar
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
    {
      name: "better-auth.session_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);
  const page = await context.newPage();

  const consoleMsgs = [];
  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleMsgs.push(`[PAGEERROR] ${err.message}`);
  });

  await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 30000 });

  // Click the Client Requests tab
  const tab = page.getByRole("button", { name: /Client Requests/i });
  const tabCount = await tab.count();
  if (tabCount === 0) {
    console.log("TAB NOT FOUND. Buttons on page:");
    const buttons = await page.locator("button").allTextContents();
    console.log(buttons.slice(0, 20).join(" | "));
  } else {
    await tab.click();
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    console.log("=== AFTER TAB CLICK ===");
    console.log("Has 'Add dark mode':", body.includes("Add dark mode"));
    console.log(
      "Has 'No client requests':",
      body.includes("No client requests")
    );
    console.log("Has error card:", body.includes("Error loading data"));
    console.log("Has 'Something went wrong':", body.includes("Something went wrong"));
  }

  console.log("\n=== CONSOLE MESSAGES ===");
  console.log(consoleMsgs.slice(0, 30).join("\n") || "(none)");

  await browser.close();
})().catch((e) => {
  console.error("SCRIPT ERROR:", e.message);
  process.exit(1);
});
