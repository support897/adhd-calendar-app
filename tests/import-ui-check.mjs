// "Bring my calendar in" — browser end-to-end: sheet, file import,
// counts, persistence, dedupe on re-import, demo fence.
// Run: node tests/import-ui-check.mjs
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http";
import { readFile } from "fs/promises";
import { extname } from "path";
const ROOT = "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ttf": "font/ttf", ".gz": "application/gzip" };
const srv = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
    const data = await readFile(ROOT + p);
    res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(8943, r));
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n); } };
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
p.on("pageerror", e => { console.log("PAGE ERROR:", e.message); fail++; });
await p.goto("http://localhost:8943/", { waitUntil: "networkidle" });
await p.evaluate(() => {
  const st = { tasks: [], feelings: {}, settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: true, notif: { digestTimes: ["12:30"] } }, welcomed: true, sent: {}, todos: [], habits: [], imports: [] };
  localStorage.setItem("calmcal-v1", JSON.stringify(st));
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(500);

check("ui: import button sits in the calendar topbar", await p.locator("#importBtn").isVisible());
await p.click("#importBtn");
check("ui: the sheet opens with the read-only line", await p.locator("#importSheet").isVisible() && /Read-only/.test(await p.locator("#importSheet").textContent()));
check("ui: four sources offered", (await p.locator(".import-src").count()) === 4);

await p.locator("#importFile").setInputFiles(ROOT + "/tests/fixtures/google.ics");
await p.waitForFunction(() => /brought in/.test(document.querySelector("#importResult").textContent), null, { timeout: 8000 });
const result1 = await p.locator("#importResult").textContent();
check("ui: counts shown after import (" + result1.trim() + ")", /4 events brought in/.test(result1) && /2 repeating/.test(result1));
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")));
check("ui: tasks landed + registry written", stored.tasks.filter(t => t.source === "import").length === 4 && stored.imports.length === 1 && stored.imports[0].count === 4);
check("ui: dentist kept its words (location + notes visible)", stored.tasks.some(t => /Smile Clinic/.test(t.originalText || "") && /referral/.test(t.originalText || "")));

await p.click("#importClose");
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(500);
const afterReload = await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).tasks.filter(t => t.source === "import").length);
check("ui: imported events survive reload", afterReload === 4);

await p.click("#importBtn");
await p.locator("#importFile").setInputFiles(ROOT + "/tests/fixtures/google.ics");
await p.waitForFunction(() => /already here/.test(document.querySelector("#importResult").textContent), null, { timeout: 8000 });
const result2 = await p.locator("#importResult").textContent();
check("ui: re-import adds 0, counts dupes (" + result2.trim() + ")", /0 events brought in/.test(result2) && /4 already here/.test(result2));
await p.click("#importClose");

// Guide offer: the last guide step offers the import, one tap, sheet opens.
await p.goto("http://localhost:8943/", { waitUntil: "networkidle" });
await p.evaluate(() => { localStorage.removeItem("calmcal-v1"); });
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(600);
if (await p.locator("#welcomeSkip").isVisible().catch(() => false)) await p.click("#welcomeSkip");
await p.waitForTimeout(500);
await p.click("#guideNext"); await p.waitForTimeout(300);
await p.click("#guideNext"); await p.waitForTimeout(300);
check("ui: last guide step offers the import", await p.locator("#guideImport").isVisible());
await p.click("#guideImport");
check("ui: the offer opens the import sheet", await p.locator("#importSheet").isVisible());
await p.click("#importClose");

// Demo fence: import entry points vanish.
await p.goto("http://localhost:8943/?demo=1", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
check("ui: demo session hides the import button", !(await p.locator("#importBtn").isVisible().catch(() => false)));

await b.close(); srv.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
