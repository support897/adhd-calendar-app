// Organise battery: auto category colours, category picker, repeat chooser, reminder chips, drag to reorder.
import pw from "playwright-core";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const { chromium } = pw;
const ROOT = path.resolve(process.cwd());
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => { let f = req.url.split("?")[0]; if (f === "/") f = "/index.html"; const fp = path.join(ROOT, f); if (!existsSync(fp)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" }); res.end(readFileSync(fp)); });
let pass = 0, fail = 0; const check = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); c ? pass++ : fail++; };
await new Promise((r) => server.listen(8981, r));
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const key = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const now = new Date(), tk = key(now), tomorrow = new Date(now.getTime() + 86400000);
const mk = (id, title, extra) => Object.assign({ id, title, date: tk, time: null, durationMin: 25, status: "todo", steps: [], skipDates: [], doneDates: [], source: "manual" }, extra || {});
const seed = {
  tasks: [mk("a", "Pay the electricity bill"), mk("b", "Call mum"), mk("c", "Study for biology exam"), mk("d", "Zebra thing"), mk("w", "Weekly review", { repeat: "days:" + tomorrow.getDay() })],
  feelings: { [tk]: "full" }, dayOrder: {}, todos: [{ id: "t1", text: "One" }, { id: "t2", text: "Two" }, { id: "t3", text: "Three" }], habits: [], goals: [], imports: [], sent: {}, welcomed: true,
  settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: false, checkinTime: "23:59", notif: { perm: "off", checkin: false, start: true, setup: 5, digest: false, digestTimes: ["23:58"], done: false, doneTime: "20:00" } },
};
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((s) => { if (!localStorage.getItem("seeded")) { localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); localStorage.setItem("seeded", "1"); } }, seed);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:8981/", { waitUntil: "networkidle" });
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")));
let s = await st(); const by = (id) => s.tasks.find((t) => t.id === id);
const dot = async (id) => (await p.$eval('#dayList .task-row[data-id="' + id + '"] .tr-dot', (e) => getComputedStyle(e).backgroundColor)).match(/\d+/g).map((n) => (+n).toString(16).padStart(2, "0")).join("").toUpperCase();
check("finance words get the Finance colour", (await dot("a")) === "C9920E");
check("'Call mum' lands in Family", (await dot("b")) === "D96AA7");
check("study words land in School", (await dot("c")) === "2F80ED");
check("unknown words get the neutral colour", (await dot("d")) === "7A8699");
// open the task sheet
await p.locator('#dayList .task-row[data-id="d"] .tr-main').click();
await p.waitForSelector("#taskSheet:not([hidden])");
await p.locator("#dLook summary").click();
check("category chips show", (await p.locator("#dCatChips .chip").count()) >= 12);
await p.locator("#dCatChips .chip", { hasText: "Travel" }).click();
s = await st(); check("picking a category sets its colour", by("d").color.toUpperCase() === "#00A3C4" && by("d").category === "travel");
await p.selectOption("#dRepeat", "every month"); s = await st(); check("repeat monthly saved", by("d").repeat === "every month");
await p.selectOption("#dRepeat", "every 2 weeks"); s = await st(); check("repeat every 2 weeks saved", by("d").repeat === "every 2 weeks");
await p.selectOption("#dRepeat", "custom");
check("custom days chips appear", await p.locator("#dRepeatDays .chip").count() === 7);
await p.locator("#dRepeatDays .chip", { hasText: "Fri" }).click(); s = await st();
check("custom days saved", /^days:/.test(by("d").repeat) && by("d").repeat.split(":")[1].split(",").includes("5"));
await p.selectOption("#dRepeat", ""); s = await st(); check("repeat can be switched off", !by("d").repeat);
check("reminders start on 'usual'", await p.locator("#dRemDefault").isChecked());
await p.locator("#dRemChips .chip", { hasText: "1 hour before" }).click(); s = await st();
check("a per-task reminder list is saved (usual 5 kept + 1 hour)", Array.isArray(by("d").remind) && by("d").remind.includes(60) && by("d").remind.includes(5));
await p.locator("#dRemChips .chip", { hasText: "1 day before" }).click(); s = await st();
check("several reminders can be ticked", by("d").remind.includes(1440) && by("d").remind.length === 3);
await p.click("#dClose");
// repeat shows on the right day: weekly review lands tomorrow, not today
check("custom-day repeat is not on today", await p.locator('#dayList .task-row[data-id="w"]').count() === 0);
await p.locator('#ticker [data-date="' + key(tomorrow) + '"]').click();
check("custom-day repeat appears on its day", await p.locator('#dayList .task-row[data-id="w"]').count() === 1);
await p.locator('#ticker [data-date="' + tk + '"]').click();
// drag reorder in the day list
const titles = () => p.$$eval("#dayList .task-row .tr-title", (e) => e.map((x) => x.textContent));
const before = await titles();
await p.locator("#dayList .task-row").nth(before.length - 1).dragTo(p.locator("#dayList .task-row").first());
const after = await titles();
check("dragging a task onto another reorders the day", after[0] === before[before.length - 1] && after.length === before.length);
// settings reminder chips
await p.evaluate(() => document.querySelector('[data-panel="settings"]').click());
await p.locator("#nLeads .chip", { hasText: "At start time" }).click(); s = await st();
check("default reminders can be multi-selected", Array.isArray(s.settings.notif.leads) && s.settings.notif.leads.includes(0) && s.settings.notif.leads.includes(5));
await p.locator("#nLeads .chip", { hasText: /^5 min before$/ }).click(); s = await st();
check("a default reminder can be unticked", !s.settings.notif.leads.includes(5) && s.settings.notif.leads.includes(0));
// to-do drag reorder
await p.evaluate(() => document.querySelector('[data-panel="todo"]').click());
await p.locator("#todoList .todo-row").nth(2).dragTo(p.locator("#todoList .todo-row").first());
s = await st(); check("dragging a to-do reorders the list", s.todos[0].id === "t3");
// add form: category + repeat
await p.evaluate(() => document.querySelector('[data-panel="calendar"]').click());
await p.click("#addBtn");
await p.locator("#addSheet details.details-fallback summary").click();
await p.fill("#fTitle", "Water the plants");
await p.selectOption("#fRepeat", "every week");
await p.locator("#fCatChips .chip", { hasText: "Home" }).click();
await p.click("#addSave"); s = await st(); const nt = s.tasks.find((t) => t.title === "Water the plants");
check("add form saves repeat and chosen category", nt && nt.repeat === "every week" && nt.category === "home" && nt.color.toUpperCase() === "#35704E");
await p.click("#addBtn"); await p.fill("#quickText", "Pay rent tomorrow"); await p.click("#addSave"); s = await st();
check("quick add auto-colours by meaning", s.tasks.find((t) => /rent/i.test(t.title)).color.toUpperCase() === "#C9920E");
check("no page errors", errs.length === 0 || (console.log(errs.join("\n")), false));
console.log(`RESULT pass=${pass} fail=${fail}`);
await b.close(); server.close(); process.exit(fail ? 1 : 0);
