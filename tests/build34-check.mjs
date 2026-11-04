// Pace build 34 checks: all free, tickable calendar blocks, business goal planner (30 Oct 2026).
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

/* ===== build 34: all free, tick-able calendar blocks, business goal planner ===== */
const SH = process.env.SHOTS || "/Users/ilse/Apps/_qa/shots"; fs.mkdirSync(SH, { recursive: true });
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await ctxM.newPage();
await m.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("b34@test.dev"));
const merrs = []; m.on("pageerror", e => merrs.push(e.message));
await m.goto("http://localhost:8918/", { waitUntil: "networkidle" });
await m.click("#welcomeSkip").catch(() => {});
await m.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});

check("everything is free: plusActive is true", await m.evaluate(() => window.PaceBilling.plusActive()) === true);
check("no Plans button is visible anywhere", !(await m.locator("#plansOpen").isVisible()));
await m.evaluate(() => { try { window.maybePlus && window.maybePlus("look"); } catch (e) {} });
check("the upgrade sheet never opens", await m.locator("#plusSheet").isHidden());

/* a timed task shows its NAME on the calendar and ticks done in place */
await m.click("#addBtn");
await m.fill("#quickText", "Call the dentist today at 10am");
await m.click("#addSave");
await m.waitForTimeout(500);
await m.screenshot({ path: SH + "/cal-390.png" });
const evTitle = await m.locator("#calendar .ev-t").first().textContent().catch(() => "");
check("calendar block shows the task name (" + evTitle + ")", /Call the dentist/.test(evTitle || ""));
check("calendar block has a tick circle", (await m.locator("#calendar .ev-check").count()) >= 1);
await m.locator("#calendar .ev-check").first().click();
await m.waitForTimeout(400);
const doneNow = await m.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); const s = JSON.parse(localStorage.getItem(k)); return s.tasks.filter(t => t.title === "Call the dentist")[0].status; });
check("tapping the circle marks it done", doneNow === "done");
await m.locator("#calendar .ev-row").first().scrollIntoViewIfNeeded(); await m.screenshot({ path: SH + "/cal-done-390.png" });
check("the goal button is in the calendar top bar", await m.locator("#goalBtn").isVisible());

/* the business plan: times, reminders, funnel */
await m.click("#goalBtn");
await m.waitForTimeout(300);
await m.fill("#goalTitle", "Build my business and reach 5000 revenue this month");
const endD = await m.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); });
await m.fill("#goalEnd", endD);
await m.evaluate(() => { var g = document.querySelectorAll(".goal-form .pstep").length; document.querySelector(".goal-form .pstep-next").click; });
await m.evaluate(() => { const st = [...document.querySelectorAll(".goal-form .pstep")]; st.forEach((x, i) => x.hidden = i !== st.length - 1); const f = document.querySelector(".goal-form .pstep-finish"); if (f) f.hidden = false; });
await m.click("#goalPlanBtn");
await m.waitForTimeout(300);
check("follow-up questions appear for a revenue goal", (await m.locator("#goalsRoot [data-q]").count()) === 3);
await m.screenshot({ path: SH + "/goal-ask-390.png", fullPage: true });
await m.locator('[data-q="customers"] .gf-cat', { hasText: "Not yet" }).click();
await m.fill("#goalQ_price", "100");
await m.locator('[data-q="when"] .gf-cat', { hasText: "Evening" }).click();
await m.click("#goalAskGo");
await m.waitForTimeout(400);
const prev = await m.locator("#goalsRoot").innerText();
check("answers change the plan: 50 sales at $100", /about 50 sales at \$100 each/.test(prev));
check("evening answer moves the blocks to the evening", /18:00/.test(prev) && /19:40/.test(prev) && !/09:00/.test(prev.split("A normal day")[1] || ""));
check("a typed price means no guess note", !/is a guess/.test(prev));
await m.screenshot({ path: SH + "/goal-preview-390.png", fullPage: true });
await m.click("#goalAddBtn");
await m.waitForTimeout(600);
const gt = await m.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); const s = JSON.parse(localStorage.getItem(k)); return s.tasks.filter(t => t.goalId).map(t => ({ d: t.date, t: t.time, n: t.title })); });
const day2 = gt.filter(t => t.d === gt[gt.length - 1].d);
check("goal tasks landed on the calendar (" + gt.length + ")", gt.length > 60);
check("most goal tasks have a clock time", gt.filter(t => t.t).length > gt.length * 0.9);
check("a day has several timed blocks, none stacked on one time", new Set(gt.filter(t => t.d === gt[5].d).map(t => t.t)).size >= 3);
await m.click('.side-item[data-panel="calendar"]').catch(async () => { await m.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]').click()); });
await m.waitForTimeout(400);
await m.locator("#calendar .ev-row").first().scrollIntoViewIfNeeded().catch(() => {}); await m.screenshot({ path: SH + "/cal-goal-390.png" });
/* the calendar follows the feeling */
await m.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]') && 0);
await m.click('.level-btn[data-level="low"]'); await m.waitForTimeout(500);
const restLow = await m.locator("#calendar .fc-event.ev-resting").count();
const subLow = await m.locator("#checkinSub").innerText();
check("Bad day: some calendar blocks rest, faded (" + restLow + ")", restLow >= 1);
check("Bad day: the card says how many are showing/resting", /resting/.test(subLow));
await m.screenshot({ path: SH + "/cal-bad-390.png" });
await m.click('.level-btn[data-level="full"]'); await m.waitForTimeout(500);
check("Great day: nothing rests", (await m.locator("#calendar .fc-event.ev-resting").count()) === 0);
await m.click('.level-btn[data-level="steady"]'); await m.waitForTimeout(300);
check("the feeling can be changed again and again", (await m.locator('.level-btn.is-active').getAttribute("data-level")) === "steady");
const pl = await m.evaluate(() => { const s = PaceGoals.buildPlan({ title: "Learn Spanish", start: "2026-11-02", end: "2026-12-11", pace: "daily", mins: 20, category: "personal", text: "Learn Spanish" }); return { n: s.length, first: s[0].title, kind: s.analysis.kind, stages: s.analysis.weeks.length }; });
check("goal 'Learn Spanish' is read as a learning playbook with 4 stages", pl.kind === "playbook" && pl.stages === 4 && /Spanish/.test(pl.first) && !/learn Spanish/.test(pl.first));
const pl2 = await m.evaluate(() => PaceGoals.buildPlan({ title: "Pass my biology exam", start: "2026-11-02", end: "2026-12-11", pace: "daily", mins: 20, category: "school", text: "Pass my biology exam" }).analysis.summary);
check("an exam goal gets exam stages", /exam goal/.test(pl2));
/* reminders are per task, not general */
async function addWithRem(text, labels) {
  await m.click("#addBtn");
  const on = m.locator("#fRemChips .chip.is-on");
  while (await on.count()) await on.first().click();
  for (const l of labels) await m.locator("#fRemChips .chip", { hasText: l }).click();
  await m.fill("#quickText", text); await m.click("#addSave"); await m.waitForTimeout(300);
}
await addWithRem("Pay rent today at 4pm", ["30 min before"]);
await addWithRem("Ring mum today at 5pm", ["1 hour before", "At start time"]);
const rems = await m.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); const s = JSON.parse(localStorage.getItem(k)); const f = n => s.tasks.filter(t => t.title === n)[0].remind; return { a: f("Pay rent"), b: f("Ring mum"), g: s.tasks.filter(t => t.goalId)[0].remind }; });
check("task A keeps its own reminder [30]", JSON.stringify(rems.a) === "[30]");
check("task B keeps its own reminders [0,60]", JSON.stringify(rems.b) === "[0,60]");
check("goal steps carry their own reminder too", JSON.stringify(rems.g) === "[10]");
const qg = await m.evaluate(() => ({ gen: PaceGoals.questionsFor("Plan my wedding", "Plan my wedding", "personal", "").map(q => q.id), cnt: PaceGoals.questionsFor("Read 12 chapters", "Read 12 chapters", "school", "").map(q => q.id), own: PaceGoals.questionsFor("x", "x", "school", "read part one\nwrite part two\nreview part three").length }));
check("any other goal asks done / main parts / when", qg.gen.join() === "done,parts,when");
check("counted goals ask only when", qg.cnt.join() === "when");
check("a pasted outline asks nothing", qg.own === 0);
const gp = await m.evaluate(() => PaceGoals.buildPlan({ title: "Plan my wedding", start: "2026-11-02", end: "2026-12-11", pace: "daily", mins: 20, category: "personal", text: "Plan my wedding", milestones: ["Venue", "Guest list", "Food", "Music"], answers: { when: "morning" } }));
check("named parts become the steps, at the chosen time", gp.some(s => /Guest list/.test(s.title)) && gp.every(s => !s.time || s.time === "08:30"));
/* narrow phone */
await m.setViewportSize({ width: 320, height: 640 });
await m.screenshot({ path: SH + "/cal-320.png" });
check("no page errors", merrs.length === 0 || (console.log(merrs), false));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); mock.close && mock.close(); server.close();
process.exit(fail ? 1 : 0);
