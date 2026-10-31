// Pace build 35 checks: all free, tickable calendar blocks, business goal planner (30 Oct 2026).
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
await new Promise(r => server.listen(8919, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f1@test.dev"));
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8919/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)));

/* ===== build 35 phase A: settings with email, jump chips, Skip's settings tour ===== */
const SH = process.env.SHOTS || "/Users/ilse/Apps/_qa/shots"; fs.mkdirSync(SH, { recursive: true });
const mkPhone = async (email) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  await p.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess(email));
  p.errs = []; p.on("pageerror", e => p.errs.push(e.message));
  await p.goto("http://localhost:8919/", { waitUntil: "networkidle" });
  await p.click("#welcomeSkip").catch(() => {});
  await p.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
  return p;
};
const openSettings = async (p) => { await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(400); };
const m = await mkPhone("set35@test.dev");
await openSettings(m);
check("settings shows my email at the top", (await m.locator("#pcEmail").textContent()) === "set35@test.dev");
check("settings avatar is my first letter", (await m.locator("#pcAvatar").textContent()) === "S");
check("settings says everything is free", /Free/.test(await m.locator(".pc-badge").textContent()));
check("Skip the mascot is in settings", (await m.locator("#pcSkip svg").count()) >= 1);
await m.screenshot({ path: SH + "/settings-390.png" });
const y0 = await m.evaluate(() => window.scrollY + (document.querySelector("#main")||{}).scrollTop);
await m.click('[data-jump="setNotif"]'); await m.waitForTimeout(900);
const topN = await m.evaluate(() => document.getElementById("setNotif").getBoundingClientRect().top);
check("the Reminders chip scrolls to reminders (top " + Math.round(topN) + ")", topN < 300);
await m.screenshot({ path: SH + "/settings-jump-390.png" });
await m.click("#settingsTour"); await m.waitForTimeout(500);
check("the settings tour opens with Skip", await m.locator("#guideSheet").isVisible() && (await m.locator("#guideArt svg").count()) >= 1);
const seen = [];
for (let i = 0; i < 9; i++) {
  const t = await m.evaluate(() => { const e = document.querySelector("#panel-settings .guide-target"); return e ? e.id : ""; });
  if (t) seen.push(t);
  if (i === 2) await m.screenshot({ path: SH + "/settings-tour-390.png" });
  const label = await m.locator("#guideNext").textContent();
  await m.click("#guideNext"); await m.waitForTimeout(350);
  if (/Done/.test(label)) break;
}
check("the tour visits every settings section (" + seen.join(",") + ")", ["profileCard","accountGroup","setLook","setCheckin","setNotif","setTasks","setHelp"].every(x => seen.includes(x)));
check("the tour closes at the end", await m.locator("#guideSheet").isHidden());
check("settings: no page errors", m.errs.length === 0 || (console.log(m.errs), false));

/* ===== build 35 phase B: wake / wind down times, free-gap line ===== */
const wk = await mkPhone("wake35@test.dev");
await wk.click("#addBtn"); await wk.fill("#quickText", "Pay the invoice today at 11:55pm"); await wk.click("#addSave"); await wk.waitForTimeout(500);
check("up next says how long you are free before the next task", /Free for/.test(await wk.locator("#upNext").textContent().catch(() => "")) || new Date().getHours() >= 23);
await openSettings(wk);
await wk.fill("#wakeTime", "06:30"); await wk.fill("#windTime", "21:15");
await wk.locator("#windTime").dispatchEvent("change"); await wk.waitForTimeout(400);
const st1 = await wk.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); return JSON.parse(localStorage.getItem(k)).settings; });
check("wake and wind down times save (" + st1.wakeTime + ", " + st1.windTime + ")", st1.wakeTime === "06:30" && st1.windTime === "21:15");
await wk.reload({ waitUntil: "networkidle" });
await openSettings(wk);
check("wake and wind down times survive a reload", (await wk.inputValue("#wakeTime")) === "06:30" && (await wk.inputValue("#windTime")) === "21:15");
await wk.evaluate(() => document.querySelector('#bottomTabs [data-tab="calendar"]').click()); await wk.waitForTimeout(600);
check("the calendar shades the hours outside your day", (await wk.locator(".fc-non-business").count()) >= 1);
check("phase B: no page errors", wk.errs.length === 0 || (console.log(wk.errs), false));

/* ===== build 35 phase C: whole customer journey + two users, one browser ===== */
const sA = await mkSess("userA35@test.dev"), sB = await mkSess("userB35@test.dev");
const jc = await browser.newContext({ viewport: { width: 390, height: 844 } });
const j = await jc.newPage(); j.errs = []; j.on("pageerror", e => j.errs.push(e.message));
await j.addInitScript((s) => { if (!localStorage.getItem("pace-auth-v1") && !sessionStorage.getItem("noseed")) localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, sA);
const dumpTitles = () => j.evaluate(() => { const k = Object.keys(localStorage).filter(x => x.startsWith("calmcal-v1:")); return k.map(x => ({ k: x, t: (JSON.parse(localStorage.getItem(x)).tasks || []).map(t => t.title) })); });
await j.goto("http://localhost:8919/", { waitUntil: "networkidle" });
await j.click("#welcomeSkip").catch(() => {}); await j.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
// A: name, task, feeling, tick
await j.click("#addBtn"); await j.fill("#quickText", "Buy milk today at 11:50pm"); await j.click("#addSave"); await j.waitForTimeout(400);
await j.click("#addBtn"); await j.fill("#quickText", "Email the landlord tomorrow at 9am"); await j.click("#addSave"); await j.waitForTimeout(400);
let dA = await dumpTitles();
check("A has her own two tasks", dA.length === 1 && dA[0].t.includes("Buy milk") && dA[0].t.includes("Email the landlord"));
await j.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await j.waitForTimeout(300);
check("A sees her own email in settings", (await j.locator("#pcEmail").textContent()) === "userA35@test.dev");
// A signs out: only the door is left
await j.evaluate(() => sessionStorage.setItem("noseed", "1")); await j.locator("#accountOut").scrollIntoViewIfNeeded(); await j.click("#accountOut"); await j.waitForTimeout(1800);
check("after sign-out the saved sign-in is gone and A's words are hidden", await j.evaluate(() => !localStorage.getItem("pace-auth-v1") && !document.body.innerText.includes("Buy milk")));
// B signs in on the same browser
await j.evaluate((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, sB);
await j.reload({ waitUntil: "networkidle" });
await j.click("#welcomeSkip").catch(() => {}); await j.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
const bTitles = await j.evaluate(() => { const b = JSON.parse(localStorage.getItem("pace-auth-v1")); const raw = localStorage.getItem("calmcal-v1:" + b.uid); return raw ? (JSON.parse(raw).tasks || []).map(t => t.title) : []; });
check("B starts empty: none of A's tasks (" + bTitles.length + ")", bTitles.length === 0);
const bPage = await j.locator("body").innerText();
check("B's screen never shows A's words", !/Buy milk|Email the landlord/.test(bPage));
await j.click("#addBtn"); await j.fill("#quickText", "B secret task today at 11:45pm"); await j.click("#addSave"); await j.waitForTimeout(400);
// A signs back in: A's things intact, B's absent
await j.evaluate((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, sA);
await j.reload({ waitUntil: "networkidle" });
await j.click("#welcomeSkip").catch(() => {}); await j.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
const aAgain = await j.evaluate(() => { const b = JSON.parse(localStorage.getItem("pace-auth-v1")); return (JSON.parse(localStorage.getItem("calmcal-v1:" + b.uid)).tasks || []).map(t => t.title); });
check("A signs back in: her tasks are intact", aAgain.includes("Buy milk") && aAgain.includes("Email the landlord"));
check("A never sees B's task", !aAgain.includes("B secret task"));
// server side (mock): B's token cannot read or write A's profile document
const readAs = async (tok, uid, method = "GET", body) => (await fetch(`http://127.0.0.1:${mock.port}/v1/projects/pace-test/databases/(default)/documents/users/${uid}/data/state`, { method, headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body })).status;
const srvB = await readAs(sB.idToken, sA.uid);
const srvA = await readAs(sA.idToken, sA.uid);
console.log("INFO mock server status: B reading A =", srvB, ", A reading A =", srvA);
check("mock server: B is refused A's data (" + srvB + ")", srvB === 403 || srvB === 401);
check("journey: no page errors", j.errs.length === 0 || (console.log(j.errs), false));

/* ===== build 35 phase D: quick-add suggestion chips ===== */
const qa = await mkPhone("quick35@test.dev");
await qa.click("#addBtn"); await qa.fill("#quickText", "Call mum");
await qa.click('#quickSuggest [data-add="tomorrow"]'); await qa.click('#quickSuggest [data-add="at 6pm"]'); await qa.click('#quickSuggest [data-add="every day"]'); await qa.click('#quickSuggest [data-add="!!!"]');
check("suggestion chips build the sentence (" + await qa.inputValue("#quickText") + ")", /Call mum tomorrow at 6pm every day!!!$/.test(await qa.inputValue("#quickText")));
const pv = await qa.locator("#quickPreview").innerText();
check("preview shows date, time, repeat and priority chips", /Repeats every day/.test(pv) && /6:?0?0?\s?(pm|PM)|18:00/.test(pv) && /Priority high/.test(pv));
await qa.screenshot({ path: SH + "/add-chips-390.png" });
await qa.click("#addSave"); await qa.waitForTimeout(500);
const tk = await qa.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); return JSON.parse(localStorage.getItem(k)).tasks.find(t => /Call mum/.test(t.title)); });
check("the saved task has time 18:00, repeat and priority 3", tk && tk.time === "18:00" && tk.repeat === "every day" && tk.priority === 3);
check("the saved task has its own reminder (per task)", tk && Array.isArray(tk.remind) && tk.remind.length >= 1);
check("quick add: no page errors", qa.errs.length === 0 || (console.log(qa.errs), false));

/* ===== build 37 phase E: the day adapts on its own (no taught light version needed) ===== */
const mo = await mkPhone("mood37@test.dev");
for (const t of ["Write the report today at 9am for 1 hour", "Clean the kitchen today at 2pm for 40 minutes", "Plan the launch today at 4pm for 45 minutes", "Water the plants today at 6pm for 5 minutes"]) {
  await mo.click("#addBtn"); await mo.fill("#quickText", t); await mo.click("#addSave"); await mo.waitForTimeout(350);
}
const evTexts = async () => (await mo.locator("#calendar .ev-t").allInnerTexts()).join(" | ");
await mo.click('.level-btn[data-level="full"]'); await mo.waitForTimeout(500);
const tFull = await evTexts();
check("Great day: the full tasks show (" + tFull + ")", /Write the report/.test(tFull) && !/lines only/.test(tFull));
await mo.click('.level-btn[data-level="steady"]'); await mo.waitForTimeout(500);
const tOk = await evTexts();
check("Ok day: long tasks get a medium version by themselves (" + tOk + ")", /Write the report \(half of it\)/.test(tOk) && /Clean the kitchen \(one area\)/.test(tOk));
check("Ok day: a 5 minute task is left alone", /Water the plants(?! \()/.test(tOk));
await mo.click('.level-btn[data-level="low"]'); await mo.waitForTimeout(500);
const tBad = await evTexts();
check("Bad day: tasks show a light version by themselves (" + tBad + ")", /lines only|5 min tidy|list 3 things/.test(tBad));
const barLow = await mo.evaluate(() => [...document.querySelectorAll("#calendar .fc-timegrid-event")].filter(e => /lines only|5 min tidy|list 3 things/.test(e.innerText)).map(e => Math.round(e.getBoundingClientRect().height)));
check("Bad day: light blocks are shorter than the 1 hour block would be (" + barLow.join(",") + ")", barLow.length >= 1 && Math.max(...barLow) < 100);
await mo.screenshot({ path: SH + "/cal-bad-auto-390.png" });
const stored1 = await mo.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith("calmcal-v1:")); return JSON.parse(localStorage.getItem(k)).tasks.map(t => t.title + "/" + t.durationMin); });
check("the real tasks are never changed (" + stored1.join(", ") + ")", stored1.some(x => x === "Write the report/60") && stored1.every(x => !/lines only|half of it/.test(x)));
await mo.click('.level-btn[data-level="full"]'); await mo.waitForTimeout(500);
check("back to Great: the full version returns", /Write the report(?! \()/.test(await evTexts()));
check("mood: no page errors", mo.errs.length === 0 || (console.log(mo.errs), false));

check("no page errors (desktop)", errors.length === 0 || (console.log(errors), false));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); mock.close && mock.close(); server.close();
process.exit(fail ? 1 : 0);
