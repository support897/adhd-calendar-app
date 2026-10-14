// LAW B2 (shipped in pace-v11): every user-data delete carries ONE
// safety step — an Undo in the toast. Runs against the app tree.
// Run: node tests/delete-undo-check.mjs
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import { readFile } from "fs/promises"; import { extname } from "path";
const APP = "/home/hatch/workspace/adhd-calendar-app";
const STAGE = APP;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ttf": "font/ttf", ".gz": "application/gzip", ".png": "image/png" };
const srv = http.createServer(async (req, res) => {
  try {
    let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
    const data = await readFile(STAGE + p);
    res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(9109, r));
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 850 } });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
let pass = 0, fail = 0; const check = (n, ok) => { ok ? (pass++, console.log("PASS", n)) : (fail++, console.log("FAIL", n)); };
await p.goto("http://localhost:9109/", { waitUntil: "networkidle" });
await p.evaluate(() => {
  const k = d => d.toISOString().slice(0, 10); const today = k(new Date());
  const t = (id, title, repeat) => ({ id, title, date: today, time: "10:00", durationMin: 30, priority: 0, repeat: repeat || null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "typed", originalText: "", skipDates: [], doneDates: [] });
  const st = { tasks: [t("k1", "Doctor appointment", null), t("k2", "Weekly review", "every week")],
    feelings: {}, todos: [{ id: "td1", text: "Ring the bank", done: false }, { id: "td2", text: "Old done thing", done: true }],
    habits: [{ id: "hb1", name: "Morning stretch", icon: "h-sun", days: {} }],
    settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: true, sound: false, notif: { digestTimes: ["12:30"] } },
    welcomed: true, sent: {}, imports: [] };
  localStorage.setItem("calmcal-v1", JSON.stringify(st));
});
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
const nTasks = () => p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).tasks.length);
const toastUndo = () => p.locator("#toast .toast-undo").isVisible().catch(() => false);

// 1. Task delete -> Undo offered -> task restored.
await p.locator('.fc-event:has-text("Doctor appointment")').first().click();
await p.waitForTimeout(500);
await p.click("#dDelete"); await p.waitForTimeout(400);
check("B2: task delete drops the task + offers Undo", (await nTasks()) === 1 && await toastUndo());
await p.click("#toast .toast-undo"); await p.waitForTimeout(400);
check("B2: Undo restores the task", (await nTasks()) === 2 && (await p.locator("text=Doctor appointment").count()) >= 1);
// 2. Delete again, no Undo -> persists across reload.
await p.locator('.fc-event:has-text("Doctor appointment")').first().click(); await p.waitForTimeout(500);
await p.click("#dDelete"); await p.waitForTimeout(400);
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(600);
check("B2: un-undone delete persists (the window is the safety, not a block)", (await nTasks()) === 1);
// 3. Recurring: remove-for-day + Undo.
await p.locator('.fc-event:has-text("Weekly review")').first().click(); await p.waitForTimeout(500);
await p.click("#dDelete"); await p.waitForTimeout(400);
const skipAfter = await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).tasks[0].skipDates.length);
check("B2: recurring day removed via skipDates + Undo offered", skipAfter === 1 && await toastUndo());
await p.click("#toast .toast-undo"); await p.waitForTimeout(400);
check("B2: Undo un-skips the day", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).tasks[0].skipDates.length)) === 0);
// 4. Todo delete + Undo.
await p.click("#sbExpand"); await p.waitForTimeout(400); await p.click('.side-item[data-panel="todo"]'); await p.waitForTimeout(500);
await p.click('.todo-row:has-text("Ring the bank") .todo-del'); await p.waitForTimeout(400);
check("B2: todo delete + Undo offered", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).todos.length)) === 1 && await toastUndo());
await p.click("#toast .toast-undo"); await p.waitForTimeout(400);
check("B2: todo restored", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).todos.length)) === 2);
// 5. Clear done + Undo.
await p.click("#todoClearDone"); await p.waitForTimeout(400);
check("B2: clear-done removes + offers Undo", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).todos.length)) === 1 && await toastUndo());
await p.click("#toast .toast-undo"); await p.waitForTimeout(400);
check("B2: clear-done undone, both todos back", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).todos.length)) === 2);
// 6. Habit delete + Undo.
await p.click('.side-item[data-panel="habits"]'); await p.waitForTimeout(500);
await p.click(".habit-del"); await p.waitForTimeout(400);
check("B2: habit delete + Undo offered", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).habits.length)) === 0 && await toastUndo());
await p.click("#toast .toast-undo"); await p.waitForTimeout(400);
check("B2: habit restored", (await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).habits.length)) === 1);
// 7. Plain toasts carry no Undo (guide goodbye shape).
await p.evaluate(() => { localStorage.removeItem("calmcal-v1"); });
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(600);
if (await p.locator("#welcomeSkip").isVisible().catch(() => false)) await p.click("#welcomeSkip");
await p.waitForTimeout(400);
for (let i = 0; i < 5; i++) { const vis = await p.locator("#guideSheet").isVisible().catch(() => false); if (!vis) break; await p.click("#guideNext"); await p.waitForTimeout(350); }
await p.waitForTimeout(500);
check("B2: plain goodbye toast has NO Undo button", (await p.locator("#toast").innerText()).includes("See you at the dock.") && !(await toastUndo()));
check("no page errors", errs.length === 0);
console.log("RESULT pass=" + pass + " fail=" + fail);
await b.close(); srv.close(); process.exit(fail ? 1 : 0);
