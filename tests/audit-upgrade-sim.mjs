// Pace — GO-LIVE WIRING AUDIT, upgrade leg (desk simulation).
// Boots the SHIPPED build-7 bundle, creates guest data in the UI,
// swaps the served bundle to shipped build 10 on the SAME origin
// (the install-over shape), and asserts the data survives intact.
// Bundle trees are extracted from SU's custody IPAs by the caller.
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ttf": "font/ttf", ".gz": "application/gzip", ".wasm": "application/wasm" };
let root = process.env.SIM_WWW7;
const server = http.createServer((req, res) => {
  let f = req.url.split("?")[0]; if (f === "/") f = "/index.html";
  const fp = join(root, f);
  if (!existsSync(fp)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[extname(fp)] || "application/octet-stream" });
  res.end(readFileSync(fp));
});
let pass = 0, fail = 0;
const check = (n, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : "")); ok ? pass++ : fail++; };
await new Promise((r) => server.listen(8971, r));
// Plain playwright-core launch (the house harness pattern):
const pwc = (await import("node:module")).createRequire(import.meta.url)("/home/hatch/node_modules/playwright-core");
const browser = await pwc.chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
await page.goto("http://localhost:8971/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip").catch(() => {});
await page.locator("#guideSkip").click({ timeout: 1200 }).catch(() => {});
check("b7 bundle boots (SW pace-v16-7 tree)", (await page.locator(".brand-name").textContent().catch(() => "")).includes("Pace"));
// Create data as a guest, in the UI: the real Quick Add flow
// (#addBtn opens the sheet, #quickText, #addSave — browser-check's own driving).
const todayTitle = "Upgrade survivor";
await page.click("#addBtn");
await page.fill("#quickText", todayTitle + " at 9am");
await page.waitForTimeout(400);
await page.click("#addSave");
await page.waitForTimeout(700);
let lsKeys = await page.evaluate(() => Object.keys(localStorage));
let saved = await page.evaluate((t) => { for (const k of Object.keys(localStorage)) { const v = localStorage.getItem(k); if (v && v.includes(t)) return k; } return null; }, todayTitle);
check("b7: the task is written to the device store", !!saved, "key " + saved + " of " + lsKeys.length);
const dayText7 = await page.locator("body").textContent();
check("b7: the task renders on the day", dayText7.includes(todayTitle));
// THE UPGRADE: same origin, the served bundle becomes build 10.
root = process.env.SIM_WWW10;
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
const dayText10 = await page.locator("body").textContent();
check("b10 over b7 data: the app boots, no dead screen", dayText10.includes("Pace"));
check("b10 over b7 data: the task still renders", dayText10.includes(todayTitle));
const stillThere = await page.evaluate((t) => { for (const k of Object.keys(localStorage)) { const v = localStorage.getItem(k); if (v && v.includes(t)) { try { JSON.parse(v); return "parses"; } catch (e) { return "raw-kept"; } } } return null; }, todayTitle);
check("b10 over b7 data: the stored state still reads clean", !!stillThere, String(stillThere));
check("zero page errors across the upgrade", errors.length === 0, errors[0] || "");
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
