// Calm Calendar drag checks (real mouse drags). Same setup as browser-check.mjs.
import { chromium } from "playwright-core";
import http from "http";
import fs from "fs";
import path from "path";
const ROOT = process.env.APP_ROOT || "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8912, r));
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } }
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8912/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});

/* 1. FullCalendar event drag in Week view: Kitchen 16:00 today -> another day */
await page.click('.segmented button[data-view="timeGridWeek"]');
await page.waitForTimeout(500);
const before = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.find(t => /kitchen/i.test(t.title)));
const ev = page.locator(".fc-event", { hasText: "Clean the kitchen" }).first();
await ev.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const evBox = await ev.boundingBox();
check("week view shows the timed kitchen event", !!evBox);
const cols = page.locator(".fc-timegrid-col[data-date]");
const colCount = await cols.count();
let targetBox = null, targetDate = null;
for (let i = 0; i < colCount; i++) {
  const d = await cols.nth(i).getAttribute("data-date");
  if (d !== before.date) { targetDate = d; targetBox = { x: await cols.nth(i).evaluate(el => el.getBoundingClientRect().x), width: await cols.nth(i).evaluate(el => el.getBoundingClientRect().width) }; break; }
}
check("found a different day column to drag to", !!targetBox);
await page.mouse.move(evBox.x + evBox.width / 2, evBox.y + evBox.height / 2);
await page.mouse.down();
await page.waitForTimeout(120);
for (let s = 1; s <= 12; s++) {
  await page.mouse.move(evBox.x + evBox.width / 2 + (targetBox.x + targetBox.width / 2 - (evBox.x + evBox.width / 2)) * (s / 12), evBox.y + evBox.height / 2, { steps: 2 });
  await page.waitForTimeout(30);
}
await page.waitForTimeout(150);
await page.mouse.up();
await page.waitForTimeout(400);
const after = await page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.find(t => /kitchen/i.test(t.title)));
check("event drag moved the task to the new day", after && after.date === targetDate);

/* 2. Progress board: drag a card from To do to Doing */
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await page.click('.side-item[data-panel="progress"]');
await page.waitForTimeout(300);
const card = page.locator("#col-todo .p-card").first();
const cardTitle = await card.locator(".pc-title").textContent();
await card.dragTo(page.locator("#col-doing"));
await page.waitForTimeout(300);
const doingTitles = await page.locator("#col-doing .pc-title").allTextContents();
check("board drag moved card to Doing", doingTitles.some(t => t === cardTitle));

/* 3. Day list row dragged onto a DayTicker day moves the task */
await page.click('.side-item[data-panel="calendar"]');
await page.waitForTimeout(300);
await page.click('.level-btn[data-level="full"]'); // make sure many rows are showing
await page.waitForTimeout(250);
const rowInfo = await page.evaluate(() => {
  const row = document.querySelector("#dayList .task-row:not(.is-done)");
  return { id: row.getAttribute("data-id"), date: row.getAttribute("data-date") };
});
const tickTarget = page.locator('.tick[data-date="' + rowInfo.date + '"] >> xpath=following-sibling::button[3]');
check("ticker target day exists after today", await tickTarget.count() === 1);
const tickDate = await tickTarget.getAttribute("data-date");
const row = page.locator('#dayList .task-row[data-id="' + rowInfo.id + '"][data-date="' + rowInfo.date + '"]');
await row.dragTo(tickTarget);
await page.waitForTimeout(350);
const moved = await page.evaluate((id) => JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks.find(t => t.id === id), rowInfo.id);
const anyOnTarget = await page.evaluate((arg) => {
  const s = JSON.parse(localStorage.getItem("calmcal-v1:guest"));
  return s.tasks.some(t => t.date === arg.target && t.id !== arg.id) || s.tasks.find(t => t.id === arg.id).date === arg.target || (s.tasks.find(t => t.id === arg.id).skipDates || []).includes(arg.from);
}, { id: rowInfo.id, target: tickDate, from: rowInfo.date });
check("row drag onto ticker moved the task to that day", anyOnTarget || (moved && moved.date === tickDate));

check("no page errors during drags", errors.length === 0);
if (errors.length) console.log("ERRORS: " + errors.join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
