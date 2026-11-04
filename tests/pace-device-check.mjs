// Pace on a small phone: 320px, tap targets, empty states, offline, second user on the same device, no overflow.
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8991, { viewport: { width: 320, height: 640 } }); const { page } = h;
const panels = ["calendar", "goals", "capture", "todo", "habits"];
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(220); };
for (const p of panels) {
  await tab(p);
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check("D1 320px: '" + p + "' has no sideways scroll", ov.sw <= ov.cw + 1);
}
await page.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await page.waitForTimeout(250);
let ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
check("D1 320px: progress has no sideways scroll", ov.sw <= ov.cw + 1);
await page.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await page.waitForTimeout(250);
ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
check("D1 320px: settings has no sideways scroll", ov.sw <= ov.cw + 1);
/* tap targets on new controls */
await tab("goals"); await page.locator("#goalsRoot button:has-text('New goal')").first().click(); await page.waitForTimeout(250);
const small = await page.evaluate(() => [...document.querySelectorAll(".goal-form button, .goal-form input:not([type=hidden])")].filter(e => e.offsetParent && !e.closest("[hidden]")).map(e => ({ t: (e.textContent || e.id || e.type).trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < 40));
check("D2 goal step: every visible button/input is at least 40px tall", small.length === 0);
if (small.length) console.log(small);
await page.click(".goal-form .pstep-next").catch(() => {});
await tab("capture"); await page.fill("#dumpText", "call mum tomorrow at 5pm, buy milk"); await page.click("#parseBtn"); await page.waitForTimeout(400);
const small2 = await page.evaluate(() => [...document.querySelectorAll("#paceReview button, #paceReview .pr-when")].filter(e => e.offsetParent).map(e => ({ t: e.textContent.trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < 40));
check("D3 review screen: buttons are at least 40px tall", small2.length === 0);
if (small2.length) console.log(small2);
check("D3b review shows one calm 'when' line per task (pickers hidden until Change)", (await page.locator("#paceReview .pr-when").count()) >= 2 && (await page.locator("#paceReview .pr-meta:visible").count()) === 0);
await page.locator("#paceReview .pr-when").first().click(); await page.waitForTimeout(100);
check("D3c Change reveals date, time and minutes", (await page.locator("#paceReview .pr-meta:visible").count()) === 1);
const ov3 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
check("D3d review fits 320px", ov3);
await page.click("#prAdd"); await page.waitForTimeout(400);
let st = await h.store();
check("D4 review creates exactly the ticked tasks", st.tasks.length === 2);
/* offline: Talk to it and the planner work with no network (no AI, no server) */
await page.context().setOffline(true);
await tab("capture"); await page.fill("#dumpText", "water the plants tomorrow at 9am"); await page.click("#parseBtn"); await page.waitForTimeout(400);
check("D8 offline: Talk to it still understands and shows the review", (await page.locator("#paceReview .pr-card").count()) >= 1);
await page.click("#prAdd"); await page.waitForTimeout(400);
st = await h.store();
check("D9 offline: the task is saved on the device", st.tasks.length === 3 && st.tasks.some(t => /water the plants/i.test(t.title) && t.time === "09:00"));
await tab("calendar");
check("D10 offline: Today plan card still renders", (await page.locator("#paceToday").innerText()).length > 20);
await page.context().setOffline(false);
/* second user on the same device sees none of the first user's data */
const uidA = await page.evaluate(() => JSON.parse(localStorage.getItem("pace-auth-v1")).uid);
const r = await fetch(`http://127.0.0.1:${h.mock.port}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "second" + Date.now() + "@test.dev", password: "x12345678", returnSecureToken: true }) });
const B = await r.json();
await page.evaluate((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify({ uid: s.localId, email: s.email, idToken: s.idToken, refreshToken: s.refreshToken, expiresAt: Date.now() + 3600e3 })); }, B);
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
const stB = await page.evaluate((u) => JSON.parse(localStorage.getItem("calmcal-v1:" + u) || "null"), B.localId);
check("D5 second user starts empty (no tasks, goals or wins from user A)", !stB || (stB.tasks || []).filter(t => t.source !== "sample").length === 0 && !(stB.goals || []).length && !((stB.rewards || {}).log || []).length);
check("D5b user A's data is still stored under A only", await page.evaluate((u) => !!localStorage.getItem("calmcal-v1:" + u), uidA));
check("D6 fresh account shows the calm empty day (no sample task)", !(await page.locator("body").innerText()).includes("Clean the kitchen"));
check("D7 zero JS errors on 320px", h.errors.length === 0);
if (h.errors.length) console.log(h.errors.slice(0, 5));
await h.close(); process.exit(summary() ? 1 : 0);
