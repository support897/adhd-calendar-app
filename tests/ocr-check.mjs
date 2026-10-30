// Pace bundled-OCR checks: Tesseract, its worker, its LSTM core and the
// English data all load from vendor/tesseract inside the app — never a CDN.
// A real generated image is read through the real Talk-to-it photo input.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import os from "os"; import path from "path";
const ROOT = process.env.APP_ROOT || "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".gz": "application/gzip", ".png": "image/png" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8931, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const render = await browser.newPage({ viewport: { width: 900, height: 300 } });
await render.setContent('<body style="margin:0;background:white;color:black;font:64px Arial;padding:70px">PACE OCR TEST 123</body>');
const img = path.join(os.tmpdir(), "pace-ocr-test.png");
await render.screenshot({ path: img });
await render.close();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [], external = [];
page.on("pageerror", e => errors.push(e.message));
page.on("request", r => { const u = r.url(); if (!u.startsWith("http://localhost:8931") && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
await page.goto("http://localhost:8931/", { waitUntil: "networkidle" });
check("ocr: bundled Tesseract is loaded", (await page.evaluate(() => typeof window.Tesseract)) === "object");
await page.click("#welcomeSkip");
if (await page.locator("#guideSheet").isVisible().catch(() => false)) {
  await page.click("#guideSkip");
  await page.waitForFunction(() => document.getElementById("guideSheet").hidden);
}
await page.click("#sbExpand");
await page.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().width > 0);
await page.click('.side-item[data-panel="capture"]');
await page.locator("#plusNotNow").click({ timeout: 900 }).catch(() => {}); // the upgrade moment may greet this edge once — close it and carry on
await page.setInputFiles("#photoFile", img);
await page.waitForFunction(() => document.getElementById("dumpText").value.trim().length > 0 || /could not|did not work/.test(document.getElementById("captureMsg").textContent), null, { timeout: 120000 });
const text = await page.locator("#dumpText").inputValue();
check("ocr: real photo text is read exactly", text.trim() === "PACE OCR TEST 123");
check("ocr: success message is shown", /Here is what I could read/.test(await page.locator("#captureMsg").textContent()));
check("ocr: no external requests", external.length === 0);
check("no page errors", errors.length === 0);
if (errors.length) console.log("ERRORS: " + errors.join(" | "));
if (external.length) console.log("EXTERNAL: " + external.join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
