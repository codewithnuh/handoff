import { chromium } from "playwright-core";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://localhost:3111/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(4000);
const hero = page.locator("section").first();
await hero.screenshot({ path: "C:/Users/NOORUL~1/AppData/Local/Temp/opencode/hero.png" });
// also full page for context
await page.screenshot({ path: "C:/Users/NOORUL~1/AppData/Local/Temp/opencode/landing.png", fullPage: false });
const size = fs.statSync("C:/Users/NOORUL~1/AppData/Local/Temp/opencode/hero.png").size;
console.log("hero png bytes:", size, "(pure-black would be <15KB)");
await browser.close();
