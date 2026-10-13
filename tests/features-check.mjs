// Pace v3 feature checks: the To do and Habits sidebar panels (Ilse order 13 Oct 2026).
// Same setup as browser-check.mjs.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8918, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")));

/* Sidebar carries both new items. */
check("sidebar has 6 items incl To do + Habits", (await page.locator(".side-item").count()) === 6 &&
  await page.locator('.side-item[data-panel="todo"]').isVisible() && await page.locator('.side-item[data-panel="habits"]').isVisible());

/* ---- To do ---- */
await page.click('.side-item[data-panel="todo"]');
check("todo panel opens with the kind empty note", /Nothing here/.test(await page.locator("#todoList").textContent()));
check("photo + voice ways in, same as capture", await page.locator("#todoPhoto").count() === 1 && await page.locator("#todoVoiceBtn").isVisible());
await page.fill("#todoInput", "Water the ferns");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
check("fast write adds a row", (await page.locator(".todo-row").count()) === 1 && /Water the ferns/.test(await page.locator("#todoList").textContent()));
check("stored as a todo, not a task", (await stored()).todos.length === 1 && (await stored()).tasks.length === 8);
await page.click(".todo-row .todo-cal");
await page.waitForTimeout(250);
check("per item calendar choice puts it on today", (await stored()).tasks.length === 9 && (await stored()).todos[0].calTaskId);
check("calendar button shows its on state", await page.locator(".todo-cal.is-on").count() === 1);
await page.click(".todo-row .todo-cal");
await page.waitForTimeout(250);
check("tapping again takes it back off", (await stored()).tasks.length === 8 && !(await stored()).todos[0].calTaskId);
await page.fill("#todoInput", "Book the car service");
await page.click("#todoAddBtn");
await page.waitForTimeout(200);
await page.click("#todoCalAll");
await page.waitForTimeout(250);
check("select all puts every open item on the calendar", (await stored()).tasks.length === 10);
await page.locator(".todo-row").first().locator(".todo-tick").click();
await page.waitForTimeout(200);
check("tick marks done and offers Clear done", await page.locator(".todo-row.is-done").count() === 1 && await page.locator("#todoClearDone").isVisible());
await page.reload({ waitUntil: "networkidle" });
await page.click('.side-item[data-panel="todo"]');
check("todos survive a reload", (await page.locator(".todo-row").count()) === 2);
await page.click("#todoClearDone");
await page.waitForTimeout(200);
check("clear done leaves the open one", (await page.locator(".todo-row").count()) === 1 && /Water the ferns/.test(await page.locator("#todoList").textContent()));
await page.click(".todo-row .todo-del");
await page.waitForTimeout(200);
check("delete empties the list kindly", /Nothing here/.test(await page.locator("#todoList").textContent()));

/* ---- Habits ---- */
await page.click('.side-item[data-panel="habits"]');
check("habits panel opens with the kind empty note", /No habits yet/.test(await page.locator("#habitList").textContent()));
check("icon picker offers 12 icons", (await page.locator(".icon-pick").count()) === 12);
await page.locator(".icon-pick").first().click();
await page.fill("#habitName", "Drink water");
await page.click("#habitAddBtn");
await page.waitForTimeout(250);
check("habit added with its icon", (await page.locator(".habit-row").count()) === 1 && /Drink water/.test(await page.locator("#habitList").textContent()));
check("habit shows 7 week dots", (await page.locator(".week-dot").count()) === 7);
check("undone week dot has a real fill (pins the CSS token class)", (await page.evaluate(() => { const d = document.querySelector(".week-dot:not(.is-done)"); return d ? getComputedStyle(d).backgroundColor : "missing"; })) !== "rgba(0, 0, 0, 0)");
check("fresh habit has no run yet", /No run yet/.test(await page.locator("#habitList").textContent()));
await page.click(".habit-tick");
await page.waitForTimeout(250);
check("tick today starts a run of 1, shown with a dot", /1 in a row/.test(await page.locator("#habitList").textContent()) && (await page.locator(".streak-dot").count()) === 1);
check("today dot fills too", (await page.locator(".week-dot.is-done").count()) === 1);
await page.locator(".week-dot").nth(5).click();
await page.waitForTimeout(250);
check("tapping yesterday extends the run to 2", /2 in a row/.test(await page.locator("#habitList").textContent()));
await page.reload({ waitUntil: "networkidle" });
await page.click('.side-item[data-panel="habits"]');
check("habit + streak survive a reload", (await page.locator(".habit-row").count()) === 1 && /2 in a row/.test(await page.locator("#habitList").textContent()));
await page.click(".habit-del");
await page.waitForTimeout(200);
check("delete habit returns the empty note", /No habits yet/.test(await page.locator("#habitList").textContent()));
check("no page errors across the features", errors.length === 0);
await ctx.close();

/* Normalise: wrong-shaped todos/habits must not brick the app (QA Bug 1 class). */
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
const errs2 = []; p2.on("pageerror", e => errs2.push(e.message));
await p2.goto("http://localhost:8918/", { waitUntil: "networkidle" });
if (await p2.locator("#welcomeSkip").isVisible().catch(() => false)) await p2.click("#welcomeSkip");
await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1")); s.todos = "oops"; s.habits = 42; s.tasks.push({ title: "x" }); localStorage.setItem("calmcal-v1", JSON.stringify(s)); });
await p2.reload({ waitUntil: "networkidle" });
await p2.click('.side-item[data-panel="todo"]');
check("poisoned todos/habits: app boots, panels render", errs2.length === 0 && /Nothing here/.test(await p2.locator("#todoList").textContent()));
await ctx2.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
