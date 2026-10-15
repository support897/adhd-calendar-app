// Calm Calendar recurrence + teach-my-levels checks. Same setup as browser-check.mjs.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8914, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8914/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
// Add recurring via capture: water plants every weekday
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await page.click('.side-item[data-panel="capture"]');
await page.locator("#plusNotNow").click({ timeout: 900 }).catch(() => {}); // the upgrade moment may greet this edge once — close it and carry on
await page.fill("#dumpText", "water the plants every weekday");
await page.click("#parseBtn"); await page.waitForTimeout(200);
check("recurring draft carries repeat label", /every weekday/.test(await page.locator(".draft-card").textContent()));
await page.click("#draftAddAll"); await page.waitForTimeout(300);
const st = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:guest")); return s.tasks.find(t => /water the plants/i.test(t.title)); });
check("recurring task saved with repeat", !!st && st.repeat === "every weekday");
// It should appear today and on the NEXT WEEKDAY in the ticker-days
// (the leg once picked blind "tomorrow" — when tomorrow is a
// Saturday, a weekday repeat correctly stays home and the leg
// reds on a calendar seam, not a fault).
const tomorrow = await page.evaluate(() => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); });
await page.click('.tick[data-date="' + tomorrow + '"]'); await page.waitForTimeout(300);
check("recurring shows tomorrow too", (await page.locator("#dayList .task-row").allTextContents()).some(t => /water the plants/i.test(t)));
// Done for tomorrow only: check it off, today stays undone
await page.locator("#dayList .task-row", { hasText: "Water the plants" }).locator(".tr-check").click(); await page.waitForTimeout(300);
const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.find(t => /water the plants/i.test(t.title)));
check("done recorded for that day only", (st2.doneDates || []).length === 1 && st2.status === "todo");
// Teach-my-levels: open the task sheet from today's list and set a smallest version, then a Low day must show it
const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); });
await page.click('.tick[data-date="' + today + '"]'); await page.waitForTimeout(250);
await page.click('.level-btn[data-level="full"]'); await page.waitForTimeout(200);
await page.locator("#dayList .task-row", { hasText: "Water the plants" }).click(); await page.waitForTimeout(300);
await page.fill("#dMin", "Just the kitchen plants");
await page.click("#dClose"); await page.waitForTimeout(250);
await page.click('.level-btn[data-level="low"]'); await page.waitForTimeout(300);
const lowText = await page.locator("#dayList").textContent();
check("low day shows the taught smallest version", /Just the kitchen plants/.test(lowText) && /small version/.test(lowText));
check("no page errors", errors.length === 0);
if (errors.length) console.log("ERRORS: " + errors.join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
