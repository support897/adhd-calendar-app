// Pace v3 feature checks: the To do and Habits sidebar panels (Ilse order 13 Oct 2026).
// Same setup as browser-check.mjs.
// Build-33 battery care (29 Oct): Polar's line (builds 24-32) emptied
// the guest samples (Empty-Start: 0 seed tasks, was 8), redesigned the
// habit card (habit-card + .hw-day week buttons + "N day streak" stats,
// rendered by goals-ui.js) and expanded Skip's tour (name -> empty ->
// feeling -> looks (the 2 free looks) -> task -> import -> reminders ->
// panel stops). The legs below pin the CURRENT shapes; every leg's
// substance (todo promotes/demotes, habit adds/ticks/streaks/survives,
// the tour teaches and stays done) is unchanged.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
/* Battery care (29 Oct, build 33's door lock): no usable guest app
   remains, so every context runs as its own signed-in harness
   account on the mock; in-page store reads derive the uid key from
   the session itself. Feature substance unchanged. */
const { startMock } = await import(path.join(ROOT, "tests/mock-firebase.mjs"));
const mock = await startMock();
const testConfig = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mock.port}", restFirestore: "http://127.0.0.1:${mock.port}", restToken: "http://127.0.0.1:${mock.port}" };`;
async function mkSess(email) {
  const r = await fetch(`http://127.0.0.1:${mock.port}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password-1", returnSecureToken: true }) });
  const A = await r.json();
  return { uid: A.localId, email: A.email, idToken: A.idToken, refreshToken: A.refreshToken, expiresAt: Date.now() + 3600e3 };
}
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; } const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8918, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f1@test.dev"));
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)));

/* Sidebar carries both new items. */
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
check("sidebar has 7 items incl To do + Habits", (await page.locator(".side-item").count()) === 7 &&
  await page.locator('.side-item[data-panel="todo"]').isVisible() && await page.locator('.side-item[data-panel="habits"]').isVisible());

/* ---- To do ---- */
await page.click('.side-item[data-panel="todo"]');
check("todo panel opens with the kind empty note", /Nothing here/.test(await page.locator("#todoList").textContent()));
check("photo + voice ways in, same as capture", await page.locator("#todoPhoto").count() === 1 && await page.locator("#todoVoiceBtn").isVisible());
await page.fill("#todoInput", "Water the ferns");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
check("fast write adds a row", (await page.locator(".todo-row").count()) === 1 && /Water the ferns/.test(await page.locator("#todoList").textContent()));
check("stored as a todo, not a task", (await stored()).todos.length === 1 && (await stored()).tasks.length === 0);
await page.click(".todo-row .todo-cal");
await page.waitForTimeout(250);
check("per item calendar choice puts it on today", (await stored()).tasks.length === 1 && (await stored()).todos[0].calTaskId);
check("calendar button shows its on state", await page.locator(".todo-cal.is-on").count() === 1);
await page.click(".todo-row .todo-cal");
await page.waitForTimeout(250);
check("tapping again takes it back off", (await stored()).tasks.length === 0 && !(await stored()).todos[0].calTaskId);
await page.fill("#todoInput", "Book the car service");
await page.click("#todoAddBtn");
await page.waitForTimeout(200);
await page.click("#todoCalAll");
await page.waitForTimeout(250);
check("select all puts every open item on the calendar", (await stored()).tasks.length === 2);
await page.locator(".todo-row").first().locator(".todo-tick").click();
await page.waitForTimeout(200);
check("tick marks done and offers Clear done", await page.locator(".todo-row.is-done").count() === 1 && await page.locator("#todoClearDone").isVisible());
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
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
check("habit added with its icon", (await page.locator(".habit-card").count()) === 1 && /Drink water/.test(await page.locator("#habitList").textContent()));
check("habit shows 7 week days", (await page.locator(".hw-day").count()) === 7);
check("undone week dot is visibly ringed (a real border colour, never invisible)", (await page.evaluate(() => { const d = document.querySelector(".hw-day:not(.is-done) .hw-dot"); return d ? getComputedStyle(d).borderColor : "missing"; })) !== "rgba(0, 0, 0, 0)");
check("fresh habit has no run yet", /0 day streak/.test(await page.locator("#habitList").textContent()));
await page.click(".hw-day.is-today");
await page.waitForTimeout(250);
check("tick today starts a run of 1, shown in the stats", /1 day streak/.test(await page.locator("#habitList").textContent()) && (await page.locator(".hw-day.is-done").count()) === 1);
check("today dot fills too", (await page.evaluate(() => { const d = document.querySelector(".hw-day.is-done .hw-dot"); return d ? getComputedStyle(d).backgroundColor : "missing"; })) !== "rgba(0, 0, 0, 0)");
await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); document.querySelector('.hw-day[data-key="' + k + '"]').click(); });
await page.waitForTimeout(250);
check("tapping yesterday extends the run to 2", /2 day streak/.test(await page.locator("#habitList").textContent()));
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await page.click('.side-item[data-panel="habits"]');
check("habit + streak survive a reload", (await page.locator(".habit-card").count()) === 1 && /2 day streak/.test(await page.locator("#habitList").textContent()));
await page.click(".habit-del");
await page.waitForTimeout(200);
check("delete habit returns the empty note", /No habits yet/.test(await page.locator("#habitList").textContent()));
check("no page errors across the features", errors.length === 0);
await ctx.close();

/* Normalise: wrong-shaped todos/habits must not brick the app (QA Bug 1 class). */
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f2@test.dev"));
const errs2 = []; p2.on("pageerror", e => errs2.push(e.message));
await p2.goto("http://localhost:8918/", { waitUntil: "networkidle" });
if (await p2.locator("#welcomeSkip").isVisible().catch(() => false)) await p2.click("#welcomeSkip");
await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)); s.todos = "oops"; s.habits = 42; s.tasks.push({ title: "x" }); localStorage.setItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid, JSON.stringify(s)); });
await p2.reload({ waitUntil: "networkidle" });
await p2.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
await p2.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await p2.click('.side-item[data-panel="todo"]');
check("poisoned todos/habits: app boots, panels render, string todo REPAIRED not dropped", errs2.length === 0 && /oops/.test(await p2.locator("#todoList").textContent()) && /No habits yet/.test(await p2.locator("#habitList").textContent()));
await ctx2.close();
// Empty-Start Law: inside the store wrapper (Capacitor present) the app seeds NO samples.
const ctx3 = await browser.newContext();
await ctx3.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
const p3 = await ctx3.newPage();
await p3.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f3@test.dev"));
await p3.goto("http://localhost:8918/", { waitUntil: "networkidle" });
const storeTasks = await p3.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)).tasks.length);
check("store build starts empty (no sample tasks)", storeTasks === 0);
check("store build still shows the designed empty day", /Nothing today/.test(await p3.locator("#dayList").textContent()));
check("Skip waits at the empty-state dock", (await p3.locator("#dayList .dock-skip").count()) === 1);
await ctx3.close();

/* Setup guide (Skip the Ferry): the branch's expanded tour — name,
// empty-start, feeling, the two free looks (live pick), then the task
// beat; closing marks it done, it stays done, and it reopens from
// Settings. The panel-stop walk is covered by the tour's own render
// (every stop is the same showGuide shape). */
const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p4 = await ctx4.newPage();
await p4.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f4@test.dev"));
await p4.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await p4.click("#welcomeSkip");
check("the tour opens after welcome, centred — the NAME step leads for a nameless visitor (POLAR P7)", await p4.locator("#guideSheet").isVisible() && /What's your name/.test(await p4.locator("#guideBubble").textContent()) && (await p4.locator("#tourName").count()) === 1);
check("the tour shows Skip the Ferry", (await p4.locator("#guideArt .skip-svg").count()) === 1);
await p4.click("#guideNext");
check("then the empty-start beat", /Your calendar starts empty/.test(await p4.locator("#guideBubble").textContent()));
await p4.click("#guideNext");
check("then the feeling beat", /How are you feeling today/.test(await p4.locator("#guideBubble").textContent()));
await p4.click("#guideNext");
check("the tour offers the theme picks (the two free looks)", /Pick a look you like/.test(await p4.locator("#guideBubble").textContent()) && (await p4.locator(".g-swatch").count()) === 2);
await p4.locator('.g-swatch[data-g-theme="dark"]').click(); await p4.waitForTimeout(200);
check("guide theme pick applies live", (await p4.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
await p4.click("#guideNext");
check("then the first-task beat", /Add your first task when you're ready/.test(await p4.locator("#guideBubble").textContent()));
await p4.click("#guideClose");
check("closing the tour marks it done", (await p4.locator("#guideSheet").isHidden()) && (await p4.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)).settings.guideDone)) === true);
await p4.reload({ waitUntil: "networkidle" });
check("guide does not nag after it is done", await p4.locator("#guideSheet").isHidden());
await p4.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await p4.click('.side-item[data-panel="settings"]');
await p4.click("#guideAgain");
check("guide reopens from Settings", await p4.locator("#guideSheet").isVisible());
await p4.click("#guideClose");
check("guide closes in one tap", await p4.locator("#guideSheet").isHidden());
await ctx4.close();

/* The upgrade moment (19 Oct law): inside the free month every
   Plus edge applies silently; the locked behavior (speech +
   no apply) is proven in payments-check on an aged context. */
const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p5 = await ctx5.newPage();
await p5.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f5@test.dev"));
await p5.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await p5.click("#welcomeSkip").catch(() => {});
await p5.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
check("no upgrade popup on open, ever", await p5.locator("#plusSheet").isHidden());
await p5.evaluate(() => { if (document.documentElement.getAttribute("data-sb") === "collapsed") document.getElementById("sbExpand").click(); });
await p5.click('.side-item[data-panel="settings"]');
await p5.click('.swatch[data-theme-set="white"]'); await p5.waitForTimeout(300);
check("a Free Forever look (White) never fires the popup", await p5.locator("#plusSheet").isHidden());
await p5.click('.swatch[data-theme-set="blush"]'); await p5.waitForTimeout(400);
check("inside the free month a Plus look APPLIES — no sheet (the in-app trial)", (await p5.locator("#plusSheet").isHidden()) && (await p5.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "blush");
await p5.click('.swatch[data-theme-set="sky"]'); await p5.waitForTimeout(400);
check("a second Plus look applies the same way inside the free month", (await p5.locator("#plusSheet").isHidden()) && (await p5.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "sky");
await p5.click('.swatch[data-theme-set="blush"]'); await p5.waitForTimeout(300);
check("the applied look stands and the app stays fully usable", await p5.locator("#plusSheet").isHidden());
await p5.click('.side-item[data-panel="capture"]'); await p5.waitForTimeout(400);
check("Talk to it opens clean inside the free month", await p5.locator("#plusSheet").isHidden());
await p5.click('.side-item[data-panel="calendar"]'); await p5.waitForTimeout(300);
await p5.click('.side-item[data-panel="capture"]'); await p5.waitForTimeout(400);
check("Talk to it opens clean on a repeat visit inside the free month", await p5.locator("#plusSheet").isHidden());
await p5.click('.side-item[data-panel="settings"]'); await p5.waitForTimeout(300);
/* build 34 (30 Oct): all features are free, so the Plans button is gone. */
check("Plans button is hidden: everything is free", await p5.locator("#plansOpen").isHidden());
await ctx5.close();
/* PACE-016: the Up Next step sentence reads WHOLE — the Start
   pill never renders inside the sentence's flow. Geometry is
   the proof: the pill's top sits at or below the step block's
   bottom. */
const ctx6 = await browser.newContext();
const p6 = await ctx6.newPage();
await p6.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f6@test.dev"));
await p6.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await p6.waitForTimeout(600);
await p6.evaluate(() => {
  const now = new Date(); const pad = (n) => String(n).padStart(2, "0");
  const key = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  const later = new Date(now.getTime() + 3 * 3600e3); const hhmm = pad(later.getHours()) + ":" + pad(later.getMinutes());
  const task = { id: "t1", title: "Clean the kitchen", date: key, time: hhmm, durationMin: 30, essential: false, status: "todo", steps: [{ text: "Get out what you need for: Clean the kitchen", done: false }], createdAt: Date.now() };
  localStorage.setItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid, JSON.stringify({ tasks: [task], feelings: {}, habits: [], settings: { guideDone: true }, welcomed: true, updatedAt: Date.now() }));
  location.reload();
});
await p6.waitForTimeout(1100);
const unGeo = await p6.evaluate(() => {
  const card = document.getElementById("upNext");
  const step = card.querySelector(".un-step");
  const btn = card.querySelector("[data-un]");
  if (!step || !btn) return null;
  const s = step.getBoundingClientRect(), b = btn.getBoundingClientRect();
  return { stepBottom: s.bottom, btnTop: b.top, stepText: step.textContent };
});
check("PACE-016: the Up Next step sentence stands whole with Start on its own row beneath it", !!unGeo && unGeo.btnTop >= unGeo.stepBottom - 1 && unGeo.stepText.includes("Clean the kitchen"), unGeo ? JSON.stringify(unGeo) : "no step/button");
await ctx6.close();
/* POLAR P8/P7/P4 on a phone-width frame (390x844). */
const ctx7 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p7p = await ctx7.newPage();
await p7p.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f7@test.dev"));
await p7p.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await p7p.waitForTimeout(700);
await p7p.evaluate(() => { const w = document.getElementById("welcome"); if (w && !w.hidden) document.getElementById("welcomeSkip").click(); });
await p7p.waitForTimeout(600);
const p7name = await p7p.evaluate(() => { const g = document.getElementById("guideSheet"); return { guideOpen: g && !g.hidden, nameInput: !!document.getElementById("tourName") }; });
check("POLAR P7: a fresh GUEST tour asks the name (the name step leads the tour when no name is on file)", p7name.guideOpen && p7name.nameInput, JSON.stringify(p7name));
await p7p.evaluate(() => { const g = document.getElementById("guideSheet"); if (g && !g.hidden) document.getElementById("guideSkip").click(); });
await p7p.waitForTimeout(500);
await p7p.evaluate(() => document.getElementById("sbExpand").click());
await p7p.waitForTimeout(500);
const p8 = await p7p.evaluate(() => {
  const sb = document.getElementById("sidebar"), main = document.getElementById("main");
  return { pos: getComputedStyle(sb).position, mainW: main.getBoundingClientRect().width, sbW: sb.getBoundingClientRect().width };
});
check("POLAR P8: on phone widths the open menu OVERLAYS (fixed) and the content keeps its full width — no squeezed reflow", p8.pos === "fixed" && p8.mainW >= 380, JSON.stringify(p8));
await p7p.evaluate(() => document.getElementById("sbSliver").click());
await p7p.waitForTimeout(400);
await p7p.evaluate(() => document.querySelector('.side-item[data-panel="todo"]').click());
await p7p.waitForTimeout(400);
await p7p.evaluate(() => document.getElementById("todoAddBtn").click());
await p7p.waitForTimeout(400);
const p4txt = await p7p.evaluate(() => { const t = document.getElementById("toast"); return t ? t.textContent : ""; });
check("POLAR P4: a blank To do add speaks (never a silent no-op)", p4txt.includes("Type the thing first"), p4txt);
await ctx7.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
