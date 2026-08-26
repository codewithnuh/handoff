import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)));
await page.goto("http://localhost:3111/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(3500);
// canvas actually rendering?
const canvas = await page.locator("canvas").count();
const box = canvas ? await page.locator("canvas").first().boundingBox() : null;
console.log("canvas count:", canvas, "| size:", box && `${Math.round(box.width)}x${Math.round(box.height)}`);
const h1 = await page.getByRole("heading", { name: /Client updates/i }).boundingBox();
console.log("h1 visible at:", h1 && `${Math.round(h1.x)},${Math.round(h1.y)} ${Math.round(h1.width)}x${Math.round(h1.height)}`);
// sample a pixel region where beams should glow vs the veil center
const samples = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return null;
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  if (!gl) return "no-gl";
  const w = c.width, h = c.height;
  const px = new Uint8Array(4);
  const out = [];
  for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.3], [0.75, 0.7]]) {
    gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.push([px[0], px[1], px[2]].join(","));
  }
  return out.join(" | ");
});
console.log("canvas pixel samples:", samples);
console.log("console errors:", errors.length ? errors.slice(0, 4).join("\n") : "(none)");
await browser.close();
