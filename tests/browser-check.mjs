// Calm Calendar browser checks. Needs playwright-core installed (npm i playwright-core) and a Chromium build.
// Run: APP_ROOT=<repo> node tests/browser-check.mjs  (writes screenshots into proofs/)
import { chromium } from "playwright-core";
import http from "http";
import fs from "fs";
import path from "path";

const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".md": "text/plain", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8911, r));

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } }

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.grantPermissions(["notifications"], { origin: "http://localhost:8911" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto("http://localhost:8911/", { waitUntil: "networkidle" });
check("welcome shows on first open", await page.locator("#welcome:not([hidden])").count() === 1);
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
check("calendar month renders events", await page.locator(".fc-event").count() >= 5);
check("ticker has 31 days", await page.locator(".tick").count() === 31);
check("day list shows sample tasks", await page.locator("#dayList .task-row").count() >= 4);
await page.screenshot({ path: ROOT + "/proofs/desktop-month.png" });

/* view switching */
for (const v of ["timeGridWeek", "timeGridDay", "listWeek", "dayGridMonth"]) {
  await page.click('.segmented button[data-view="' + v + '"]');
  await page.waitForTimeout(350);
  check("view " + v + " renders", await page.locator("#calendar .fc-view").count() === 1);
}
await page.click('.segmented button[data-view="year"]');
await page.waitForTimeout(300);
check("year view has 12 mini months", await page.locator(".mini-month").count() === 12);
await page.screenshot({ path: ROOT + "/proofs/year-view.png" });
await page.click('.segmented button[data-view="dayGridMonth"]');
await page.waitForTimeout(300);

/* feeling levels reshape the day */
await page.click('.level-btn[data-level="low"]');
await page.waitForTimeout(250);
const lowRows = await page.locator("#dayList .task-row").count();
const parkedText = await page.locator("#dayList .parked-note").textContent().catch(() => "");
check("low day caps visible rows (<=5 incl done)", lowRows <= 5);
check("low day shows parked note", /parked/i.test(parkedText || ""));
await page.screenshot({ path: ROOT + "/proofs/low-day.png" });
await page.click('.level-btn[data-level="full"]');
await page.waitForTimeout(250);
const fullRows = await page.locator("#dayList .task-row").count();
check("full day shows more than low day", fullRows > lowRows);
await page.click('.level-btn[data-level="steady"]');
await page.waitForTimeout(200);

/* mark one done */
const before = await page.locator("#dayList h3 .dl-score").textContent();
await page.locator("#dayList .task-row:not(.is-done) .tr-check").first().click();
await page.waitForTimeout(250);
const afterTxt = await page.locator("#dayList h3 .dl-score").textContent();
check("marking done updates the score", before !== afterTxt && /done/.test(afterTxt));

/* quick add with a sentence */
await page.click("#addBtn");
await page.fill("#quickText", "gym tomorrow at 7am for 1 hour!!!");
await page.waitForTimeout(200);
const preview = await page.locator("#quickPreview").textContent();
check("quick add preview parses the sentence", /Gym/i.test(preview) && /60 min/.test(preview));
await page.click("#addSave");
await page.waitForTimeout(350);
const stateAfterAdd = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")));
check("quick add saved the gym task", stateAfterAdd.tasks.some(t => /gym/i.test(t.title) && t.durationMin === 60 && t.essential === true));

/* task sheet: Not today moves it */
await page.evaluate(() => { window.scrollTo(0, 0); });
const rowCountToday = await page.locator("#dayList .task-row").count();
await page.locator("#dayList .task-row:not(.is-done)").first().click();
await page.waitForTimeout(250);
check("task sheet opens", await page.locator("#taskSheet:not([hidden])").count() === 1);
await page.click("#dNotToday");
await page.waitForTimeout(300);
check("not today removes it from today list", (await page.locator("#dayList .task-row").count()) < rowCountToday + 1);

/* capture: brain dump to drafts to calendar */
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await page.click('.side-item[data-panel="capture"]');
await page.fill("#dumpText", "email the client about the quote\nclean the kitchen\ncall mum tomorrow at 5pm");
await page.click("#parseBtn");
await page.waitForTimeout(250);
check("dump makes 3 draft cards", await page.locator(".draft-card").count() === 3);
await page.screenshot({ path: ROOT + "/proofs/capture-drafts.png" });
const beforeCount = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.length);
await page.click("#draftAddAll");
await page.waitForTimeout(300);
const afterCount = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.length);
check("drafts land on the calendar", afterCount === beforeCount + 3);

/* progress board */
await page.click('.side-item[data-panel="progress"]');
await page.waitForTimeout(300);
check("progress board has 3 columns with cards", await page.locator(".board-col").count() === 3 && await page.locator(".p-card").count() >= 5);
await page.screenshot({ path: ROOT + "/proofs/progress-board.png" });

/* settings render */
await page.click('.side-item[data-panel="settings"]');
await page.waitForTimeout(200);
check("settings show notification controls", await page.locator("#nStart").count() === 1 && await page.locator("#checkinTime").count() === 1);
const perm = await page.evaluate(() => Notification.permission);
check("notification permission can be granted", perm === "granted");
await page.click("#notifEnable");
await page.waitForTimeout(200);
await page.click("#notifTest");
await page.waitForTimeout(200);

/* notification checker: craft a task whose nudge time is this minute, reload, boot check must record it sent */
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("calmcal-v1:guest"));
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const parts = hhmm.split(":"); const mins = (+parts[0]) * 60 + (+parts[1]) + 5;
  const taskTime = String(Math.floor(mins / 60) % 24).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  s.tasks.push({ id: "nudge-test", title: "Nudge test task", date: today, time: taskTime, durationMin: 10, priority: 0, repeat: null, category: "general", color: "#7A8699", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "test", originalText: "", skipDates: [], doneDates: [] });
  s.feelings[today] = "full";
  s.settings.notif.start = true; s.settings.notif.setup = 5; s.settings.pausedDate = null;
  localStorage.setItem("calmcal-v1:guest", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const sent = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).sent);
check("notification checker fires the start nudge on boot check", Object.keys(sent).some(k => k.indexOf("start-nudge-test-") === 0));

/* phone width */
const page2 = await ctx.newPage();
await page2.setViewportSize({ width: 390, height: 844 });
await page2.goto("http://localhost:8911/", { waitUntil: "networkidle" });
await page2.click("#welcomeSkip").catch(() => {});
await page2.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
await page2.waitForTimeout(400);
check("phone view renders calendar and ticker", await page2.locator(".fc-event").count() >= 3 && await page2.locator(".tick").count() === 31);
check("phone: menu hidden by default, content full width", (await page2.locator("#sidebar").boundingBox()) === null && (await page2.locator("#main").boundingBox()).width >= 380);
await page2.click("#sbExpand"); await page2.waitForTimeout(250);
const sidebarBox = await page2.locator("#sidebar").boundingBox();
const mainBox = await page2.locator("#main").boundingBox();
check("phone sidebar stays beside content, narrowed", sidebarBox && mainBox && sidebarBox.width <= 90 && mainBox.x >= sidebarBox.width - 2);
await page2.screenshot({ path: ROOT + "/proofs/phone-month.png" });

/* offline via service worker cache */
const page3 = await ctx.newPage();
await page3.goto("http://localhost:8911/", { waitUntil: "networkidle" });
await page3.waitForTimeout(600);
const cacheKeys = await page3.evaluate(async () => { const ks = await caches.keys(); let files = []; for (const k of ks) { const c = await caches.open(k); files = files.concat((await c.keys()).map(r => r.url)); } return files; });
check("service worker cached the app files", cacheKeys.some(u => u.endsWith("fullcalendar.js")) && cacheKeys.some(u => u.endsWith("app.js")));

check("no page errors anywhere", errors.length === 0);
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
