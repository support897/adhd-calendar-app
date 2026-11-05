// Pace UX: small cute steps (goal, habit, settings), real Progress, Skip help, reflection, ticker full marks.
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8981); const { page } = h;
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(200); };
const vis = (sel) => page.locator(sel).filter({ has: page.locator(":visible") }).count();
const shown = async (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).length, sel);
const store = h.store;

/* ---- Goal: one question per screen ---- */
await tab("goals"); await page.locator("#goalsRoot button:has-text('New goal')").first().click(); await page.waitForTimeout(300);
check("G1 goal form shows ONE step at a time", (await shown(".goal-form .pstep")) === 1 && (await page.locator(".goal-form .pstep").count()) === 5);
check("G2 progress dots and 'Step 1 of 5'", (await page.locator(".goal-form .pstep-dots i").count()) === 5 && /Step 1 of 5/.test(await page.locator(".goal-form .pstep-count").innerText()));
check("G3 first screen asks only for the goal name", (await shown("#goalTitle")) === 1 && (await shown("#goalEnd")) === 0 && (await shown("#goalPace")) === 0);
await page.click(".goal-form .pstep-next"); await page.waitForTimeout(150);
check("G4 empty name blocks Next with a kind message", /Give your goal a name/.test(await page.locator("#goalsRoot .gf-err").first().innerText()) && /Step 1 of 5/.test(await page.locator(".goal-form .pstep-count").innerText()));
await page.fill("#goalTitle", "Learn guitar"); await page.press("#goalTitle", "Enter"); await page.waitForTimeout(150);
check("G5 Enter moves to step 2 (optional details, button says Skip)", /Step 2 of 5/.test(await page.locator(".goal-form .pstep-count").innerText()) && /Skip/.test(await page.locator(".goal-form .pstep-next").innerText()));
await page.click(".goal-form .pstep-next"); await page.waitForTimeout(100);
check("G6 step 3 is the kind of goal (small chips)", (await shown(".gf-cat")) >= 6);
await page.locator('.gf-cat[data-cat="personal"]').click(); await page.click(".goal-form .pstep-next"); await page.waitForTimeout(100);
check("G7 step 4 offers quick finish chips", (await shown(".pstep-chips button")) === 3);
await page.locator(".goal-form .pstep-chips button").nth(1).click();
check("G8 finish chip fills the date", (await page.inputValue("#goalEnd")).length === 10);
await page.click(".goal-form .pstep-next"); await page.waitForTimeout(100);
check("G9 last step shows how often and how long, with Make my plan", (await shown("#goalPace")) === 1 && (await shown("#goalMins")) === 1 && (await shown("#goalPlanBtn")) === 1);
await page.click(".goal-form .pstep-back"); await page.waitForTimeout(100);
check("G10 Back works and keeps what you typed", /Step 4 of 5/.test(await page.locator(".goal-form .pstep-count").innerText()) && (await page.inputValue("#goalEnd")).length === 10);
await page.click(".goal-form .pstep-next"); await page.waitForTimeout(100);
await page.click("#goalPlanBtn"); await page.waitForTimeout(600);
const afterPlan = await page.locator("#goalsRoot").innerText();
check("G11 plan preview or small questions appear after the last step", /small steps|few quick questions|Add to my calendar/i.test(afterPlan));
if (await page.locator("#goalAskGo").count()) {
  check("G12 goal questions are also one per screen", (await shown(".goal-form .pstep")) === 1);
  await page.locator(".goal-form .pstep-next:visible").click(); await page.waitForTimeout(100);
  for (let i = 0; i < 4 && (await shown(".goal-form .pstep-next")) === 1; i++) { await page.locator(".goal-form .pstep-next:visible").click(); await page.waitForTimeout(80); }
  check("G12b last question screen has Make my plan / Skip the questions", (await shown("#goalAskGo")) === 1 && (await shown("#goalAskSkip")) === 1);
  await page.click("#goalAskGo"); await page.waitForTimeout(600);
}
await page.click("#goalAddBtn").catch(() => {}); await page.waitForTimeout(500);
let st = await store();
check("G13 goal and its steps were created", (st.goals || []).length === 1 && st.tasks.filter(t => t.goalId).length >= 3);

/* ---- Habit: small steps ---- */
await tab("habits"); await page.waitForTimeout(150);
check("H1 habit form shows one step", (await shown(".habit-add .pstep")) === 1 && (await shown("#habitName")) === 1 && (await shown("#habitTiny")) === 0);
await page.click(".habit-add .pstep-next"); await page.waitForTimeout(100);
check("H2 empty habit name blocked kindly", /name/i.test(await page.locator("#habitErr").innerText()));
await page.fill("#habitName", "Stretch"); await page.click(".habit-add .pstep-next"); await page.waitForTimeout(100);
check("H3 step 2 is the icon grid", (await shown("#habitIcons .icon-pick")) >= 8);
await page.click(".habit-add .pstep-next"); await page.fill("#habitPlan", "After coffee"); await page.click(".habit-add .pstep-next"); await page.fill("#habitTiny", "Touch my toes"); await page.click(".habit-add .pstep-next");
check("H4 last step has reminder time and Add habit", (await shown("#habitTime")) === 1 && (await shown("#habitAddBtn")) === 1);
await page.click("#habitAddBtn"); await page.waitForTimeout(300);
st = await store(); const hb = st.habits.find(x => x.name === "Stretch");
check("H5 habit saved with plan and tiny version", !!hb && hb.plan === "After coffee" && hb.tiny === "Touch my toes");
check("H6 form resets to step 1 after adding", (await shown("#habitName")) === 1 && (await page.inputValue("#habitName")) === "");

/* ---- Settings: small cards (folded) ---- */
await page.evaluate(() => localStorage.setItem("paceFold", "1")); await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
await page.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await page.waitForTimeout(250);
check("S1 settings are small cards (6+), all closed at first", (await page.locator(".settings-group.sg-fold").count()) >= 6 && (await page.locator(".settings-group.is-open").count()) === 0);
await page.locator("#setLook > h3").click(); await page.waitForTimeout(200);
check("S2 opening one card shows its options", (await shown("#setLook .swatch")) >= 5 && (await page.locator(".settings-group.is-open").count()) === 1);
await page.locator("#setPace > h3").click(); await page.waitForTimeout(200);
check("S3 opening another closes the first (one at a time)", (await page.locator(".settings-group.is-open").count()) === 1 && (await shown("#setLook .swatch")) === 0 && (await shown("#pcQuiet")) === 1);
await page.locator('.set-jump [data-jump="setCheckin"]').click(); await page.waitForTimeout(300);
check("S4 jump chips open the right card", (await shown("#wakeTime")) === 1);
await page.locator('#setLook > h3').click(); await page.locator('[data-theme-set="blush"]').click(); await page.waitForTimeout(150);
check("S5 settings inside cards still work (theme)", (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "blush");
await page.locator('[data-theme-set="white"]').click();
await page.evaluate(() => localStorage.removeItem("paceFold"));

/* ---- Progress: real, motivating ---- */
await page.evaluate(() => { const u = JSON.parse(localStorage.getItem("pace-auth-v1")).uid, k = "calmcal-v1:" + u, s = JSON.parse(localStorage.getItem(k)); const d = window.CalmLogic.todayKey(), L = window.CalmLogic; s.rewards = { xp: 0, log: [], badges: {}, captured: 0, rest: {} }; localStorage.setItem(k, JSON.stringify(s)); });
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
await page.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await page.waitForTimeout(250);
check("P1 brand-new: first-win message, ring at 0", /one tiny step = first win/i.test(await page.locator("#pgMot").innerText()) && (await page.locator(".pg-ring-mid b").innerText()) === "0");
check("P2 goals show here with their own bar and next step", (await page.locator(".pg-goal").count()) === 1 && /Next: /.test(await page.locator(".pg-goal").first().innerText()));
check("P3 'Almost there' shows a real count", /0 of 1|of 5/.test(await page.locator(".pg-near").innerText()));
check("P4 old board is tucked away, not first", (await page.locator("details#pgBoard").count()) === 1 && !(await page.evaluate(() => document.getElementById("pgBoard").open)));
/* win something -> everything updates */
await page.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]').click());
const tid = (await store()).tasks.find(t => t.goalId).id;
await page.evaluate((id) => { const u = JSON.parse(localStorage.getItem("pace-auth-v1")).uid; }, tid);
await tab("todo").catch(() => {});
await page.evaluate(() => { const L = window.CalmLogic; }); 
await page.goto(page.url()); await page.waitForTimeout(400); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
await page.locator('#bottomTabs [data-tab="calendar"]').click();
const first = page.locator('#paceToday .pt-done, #ptDone').first();
if (await first.count()) { await first.click(); await page.waitForTimeout(500); await page.locator(".pcb-ok").click({ timeout: 1500 }).catch(() => {}); }
st = await store();
check("P5 doing a step awards sparks + marks today's dot", st.rewards.log.length >= 1);
await page.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await page.waitForTimeout(300);
check("P6 ring moved and today's dot is a win", (await page.locator(".pg-ring-mid b").innerText()) === "1" && (await page.locator(".pg-day.is-win").count()) === 1);
check("P7 message changes to 'you won today'", /won today|closes your week|bonus/i.test(await page.locator("#pgMot").innerText()));
check("P8 recent wins lists the task", (await page.locator(".pg-win").count()) >= 1);
check("P9 identity line (showed up on 1 of the last 14 days)", /1 of the last 14 days/.test(await page.locator(".pg-ident").innerText()));
check("P10 goal bar moved above 0", /1 of \d+ steps done|there/.test(await page.locator(".pg-goal").first().innerText()));
await page.click("#rwRest"); await page.waitForTimeout(200);
check("P11 rest day keeps the streak (no shame)", !/lost|broke|failed/i.test(await page.locator("#paceRewards").innerText()));
/* quiet mode hides all of it */
await page.evaluate(() => { document.querySelector('.side-item[data-panel="settings"]').click(); });
await page.evaluate(() => { const g = document.getElementById("setPace"); if (!g.classList.contains("is-open")) g.querySelector(":scope > h3").click(); }); await page.locator("#pcQuiet").check(); await page.waitForTimeout(250);
await page.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await page.waitForTimeout(200);
check("P12 Quiet mode hides rewards and opens the plain board", (await shown("#paceRewards")) === 0 && (await page.evaluate(() => document.getElementById("pgBoard").open)));
await page.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await page.locator("#pcQuiet").uncheck();

/* ---- Skip help, reflection, full-day ticker ---- */
await page.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]').click()); await page.waitForTimeout(300);
if (await page.locator("#ptHelp").count()) {
  await page.click("#ptHelp"); await page.waitForTimeout(250);
  check("K1 'I don't know where to start' opens Skip's one-thing sheet", /That's okay/.test(await page.locator("#planSheet").innerText()) && (await page.locator("#skipGentle").count()) === 1);
  check("K2 it names ONE small thing", (await page.locator("#planSheet .pt-next-title").count()) === 1 || /Free day/.test(await page.locator("#planSheet").innerText()));
  await page.click("#psNo"); await page.waitForTimeout(100);
} else check("K1 help button present", false);
await page.evaluate(() => { const u = JSON.parse(localStorage.getItem("pace-auth-v1")).uid, k = "calmcal-v1:" + u, s = JSON.parse(localStorage.getItem(k)), L = window.CalmLogic, d = L.todayKey(); const t = L.addDays(d, 3);
  for (let i = 0; i < 12; i++) s.tasks.push({ id: "big" + i, title: "Big " + i, date: t, durationMin: 60, status: "todo", steps: [], skipDates: [], doneDates: [], category: "other", color: "#5b6bd5" });
  localStorage.setItem(k, JSON.stringify(s)); });
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
check("K3 a too-full day is marked in the date strip", (await page.locator("#ticker .tick.is-full").count()) >= 1);
check("K4 zero JS errors", h.errors.length === 0);
if (h.errors.length) console.log(h.errors.slice(0, 5));
await h.close(); process.exit(summary() ? 1 : 0);
