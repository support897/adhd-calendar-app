// Pace QA regression checks: the two bugs from the QA Tester verdict of 13 Oct 2026.
// Bug 1: wrong-shaped stored data must never brick the app (normalise in load()).
// Bug 2: round-up times must be real clock times; bad ones fall back visibly.
// Same setup as browser-check.mjs.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8927, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });

async function bootWith(mutator) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:8927/", { waitUntil: "networkidle" });
  if (await page.locator("#welcomeSkip").isVisible().catch(() => false)) await page.click("#welcomeSkip");
  await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
  await page.evaluate((fn) => { const s = JSON.parse(localStorage.getItem("calmcal-v1:guest")); eval(fn)(s); localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); }, mutator.toString());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// Bug 1a: tasks as text.
{
  const { ctx, page, errors } = await bootWith((s) => { s.tasks = "oops"; });
  check("bug1: tasks as text, no page error", errors.length === 0);
  check("bug1: ticker still renders 31 days", (await page.locator(".tick").count()) === 31);
  check("bug1: calendar grid alive", await page.locator("#calendar .fc-daygrid-day").first().isVisible());
  await ctx.close();
}
// Bug 1b: tasks key missing.
{
  const { ctx, page, errors } = await bootWith((s) => { delete s.tasks; });
  check("bug1: tasks key missing, no page error", errors.length === 0);
  check("bug1: day list renders its empty note", /Nothing showing|empty/i.test(await page.locator("#dayList").textContent()));
  await ctx.close();
}
// Bug 1c: names as text, feelings as text, sent as a number.
{
  const { ctx, page, errors } = await bootWith((s) => { s.settings.names = "oops"; s.feelings = "oops"; s.sent = 5; });
  check("bug1: names/feelings/sent wrong shapes, no page error", errors.length === 0);
  const labels = await page.locator(".level-btn .level-name").allTextContents();
  check("bug1: level labels fall back to her words Bad Ok Good", labels.join(",") === "Bad,Ok,Good");
  await ctx.close();
}
// Bug 1d: a task missing its optional fields still shows.
{
  const { ctx, page, errors } = await bootWith((s) => { s.tasks = [{ id: "x1", title: "Bare bones task", date: s.tasks[0].date }]; });
  check("bug1: bare task, no page error", errors.length === 0);
  check("bug1: bare task renders in the day list", /Bare bones task/.test(await page.locator("#dayList").textContent()));
  await ctx.close();
}
// Bug 2a: impossible time typed in Settings falls back, visibly.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:8927/", { waitUntil: "networkidle" });
  await page.click("#welcomeSkip");
  await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
  await page.click('.side-item[data-panel="settings"]');
  await page.fill("#nDigestTimes", "25:99");
  await page.locator("#nDigestTimes").dispatchEvent("change");
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).settings.notif.digestTimes);
  check("bug2: 25:99 becomes the 12:30 fallback", JSON.stringify(stored) === JSON.stringify(["12:30"]));
  check("bug2: the field shows what was kept", (await page.inputValue("#nDigestTimes")) === "12:30");
  await page.fill("#nDigestTimes", "12:60, 9:05");
  await page.locator("#nDigestTimes").dispatchEvent("change");
  await page.waitForTimeout(200);
  const stored2 = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).settings.notif.digestTimes);
  check("bug2: 12:60 dropped, 9:05 kept and padded", JSON.stringify(stored2) === JSON.stringify(["09:05"]));
  check("bug2: no page errors", errors.length === 0);
  await ctx.close();
}
// Bug 2b: a bad time already stored by the old version is cleaned on load.
{
  const { ctx, page } = await bootWith((s) => { s.settings.notif.digestTimes = ["25:99"]; });
  await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
  await page.click('.side-item[data-panel="settings"]');
  check("bug2: pre-stored 25:99 cleaned to the fallback on load", (await page.inputValue("#nDigestTimes")) === "12:30");
  await ctx.close();
}
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
