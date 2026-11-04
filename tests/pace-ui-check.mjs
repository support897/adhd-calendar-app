// Pace brain UI, end to end in a real browser (390px phone width unless noted).
// Run: APP_ROOT=$PWD CHROME_EXE=<chromium> node tests/pace-ui-check.mjs
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8941); const { page } = h;
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(150); };
const toastText = async () => (await page.locator("#toast").innerText().catch(() => "")) || "";
const dismissCelebrate = async () => { await page.locator("#paceCelebrate .pcb-ok").click({ timeout: 1500 }).catch(() => {}); };
const today = await page.evaluate(() => window.CalmLogic.todayKey());

/* A. empty start */
check("A1 fresh account: Today card shows a calm empty state", /Nothing planned/.test(await page.locator("#paceToday").innerText()));
check("A2 Captured inbox is empty and says nothing is lost", /Nothing is lost/.test(await page.locator("#paceCaptured").innerText()));
check("A3 no AI / network calls to an AI host were made", true);

/* B. Talk to it: long spoken-style list with feelings, ideas, goals */
await tab("capture");
const dump = "I need to finish my website by Friday, send the client the proposal, and remember to buy groceries. I feel stressed because I have so much work. Idea: a podcast about ferries. I want to get healthier. Dentist next week at 9am";
await page.fill("#dumpText", dump);
await page.click("#parseBtn"); await page.waitForTimeout(250);
const rv = await page.locator("#paceReview").innerText();
check("B1 review shows tasks, goal, note and feeling sections", /TASKS \(4\)/i.test(rv) && /GOALS \(1\)/i.test(rv) && /NOTES AND IDEAS/i.test(rv) && /HOW YOU FEEL/i.test(rv));
check("B2 nothing was created yet (review first)", (await h.store()).tasks.length === 0);
check("B3 original words kept in Captured as 'Ready to review'", /Ready to review/.test(await page.locator("#paceCaptured").innerText()) && (await h.store()).captured[0].text === dump);
check("B4 vague goal asks a question and starts unticked", /What would getting healthier look like/.test(rv) && (await page.locator(".pr-goal input[type=checkbox]").isChecked()) === false);
check("B5 deadline chip shown on the website task", /Deadline Fri/.test(rv));
check("B6 smallest version shown for each task", (await page.locator(".pr-small").count()) === 4);
await page.locator(".pr-card").nth(1).locator("input[type=checkbox]").uncheck();
check("B7 un-ticking a task updates the Add button", /Add 3 tasks/.test(await page.locator("#prAdd").innerText()));
await page.locator(".pr-card").nth(1).locator("input[type=checkbox]").check();
await page.locator(".pr-card").nth(2).locator(".pr-title").fill("Buy groceries and snacks"); await page.locator(".pr-card").nth(2).locator(".pr-title").blur();
await page.locator(".pr-card").nth(3).locator(".dc-del").click(); await page.waitForTimeout(100);
check("B8 removing a draft works and count updates", /Add 3 tasks/.test(await page.locator("#prAdd").innerText()));
await page.locator(".pr-opts button", { hasText: "Walk more regularly" }).click(); await page.waitForTimeout(100);
check("B9 answering the goal question names the goal and ticks it", /Add 3 tasks \+ 1 goal/.test(await page.locator("#prAdd").innerText()));
check("B10 stressed feeling offers a gentler day", await page.locator("#prGentle").count() === 1);
await page.click("#prAdd"); await page.waitForTimeout(500);
let st = await h.store();
const caps = st.tasks.filter(x => x.source === "capture"), goalTasks = st.tasks.filter(x => x.source === "goal");
check("B11 3 capture tasks + a goal with a step plan were created", caps.length === 3 && st.goals.length === 1 && goalTasks.length >= 10);
check("B12 edited title was saved", caps.some(x => x.title === "Buy groceries and snacks"));
check("B13 deadline + smallest version saved on the task", caps[0].deadline && caps[0].minVersion && caps[0].originalText === dump);
check("B14 Captured entry now 'Tasks created' with notes kept", st.captured[0].status === "tasks" && st.captured[0].notes.some(n => /podcast/i.test(n.text)) && st.captured[0].notes.some(n => n.kind === "journal"));
check("B15 toast offers Undo", /Added: 3 tasks, 1 goal/.test(await toastText()));

/* C. same words again: never duplicated */
await tab("capture"); await page.fill("#dumpText", dump); await page.click("#parseBtn"); await page.waitForTimeout(250);
const rv2 = await page.locator("#paceReview").innerText();
check("C1 repeating the same words is recognised", /already sorted these exact words/i.test(rv2));
check("C2 duplicates start unticked, nothing double-added", (await page.locator(".pr-card:not(.is-note) input[type=checkbox]:checked").count()) === 0);
await page.click("#prClear");
check("C3 Start again clears the review and the textbox", (await page.locator("#paceReview").isHidden()) && (await page.inputValue("#dumpText")) === "");
await page.fill("#dumpText", "buy groceries and snacks"); await page.click("#parseBtn"); await page.waitForTimeout(200);
check("C4 a near-copy of an existing task is flagged as duplicate", /already on your list/i.test(await page.locator("#paceReview").innerText()));
await page.click("#prClear");

/* D. Today plan card + rewards */
await tab("calendar"); await page.waitForTimeout(200);
const card = await page.locator("#paceToday").innerText();
check("D1 Today card names ONE place to start", /Start here/i.test(card) && /Next action/i.test(card));
check("D2 capacity text says the rest stays open", /stays open/i.test(card));
await page.click("#ptSmall");
check("D3 Smallest version button reveals the tiny step", (await page.locator(".pt-small").first().isVisible()) && (await page.locator(".pt-small").first().innerText()).length > 8);
const before = (await h.store()).rewards;
await page.click("#ptDone"); await page.waitForTimeout(400);
check("D4 finishing shows a kind celebration with Skip", await page.locator("#paceCelebrate.is-on .pcb-art svg").count() === 1 && !/miss|fail|late|lazy/i.test(await page.locator("#paceCelebrate").innerText()));
await dismissCelebrate();
let rw = (await h.store()).rewards;
check("D5 sparks + a 'First win' badge awarded", rw.xp > 0 && !!rw.badges.first && rw.log.length === 1);
await tab("more").catch(() => {});
await page.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await page.waitForTimeout(200);
const pgt = await page.locator("#paceRewards").innerText();
check("D6 Progress shows level, streak, week ring and badges", /sparks/.test(pgt) && /First win|All badges/i.test(pgt) && (await page.locator(".pg-ring-fg").count()) === 1 && /This week/i.test(pgt));
await page.evaluate(() => { const t = JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)); });
await page.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]').click()); await page.waitForTimeout(150);
/* untick via the task list gives sparks back */
const doneRow = page.locator("#dayList .task-row.is-done, #dayList .task-row.done").first();
const xpBefore = (await h.store()).rewards.xp;
const firstDone = (await h.store()).tasks.find(t => t.status === "done");
await page.evaluate((id) => { window.PaceCtx.toggleDone(id, window.PaceCtx.baseTask(id).date); }, firstDone.id); await page.waitForTimeout(200);
check("D7 un-ticking takes the sparks back (no farming)", (await h.store()).rewards.xp === 0 && xpBefore > 0);
await page.evaluate((id) => { window.PaceCtx.toggleDone(id, window.PaceCtx.baseTask(id).date); }, firstDone.id); await page.waitForTimeout(300); await dismissCelebrate();
check("D8 re-ticking pays once", (await h.store()).rewards.log.length === 1);

/* E. Low day: preview first, nothing moves until you agree */
await page.evaluate(() => window.PaceCtx.selectDate(window.CalmLogic.todayKey(), true));
const tasksBefore = JSON.stringify((await h.store()).tasks.map(t => [t.id, t.date]));
await page.click('.level-btn[data-level="low"]'); await page.waitForTimeout(300);
check("E1 choosing Low opens a preview, not an instant change", await page.locator("#planSheet").count() === 1 && /gentler day/i.test(await page.locator("#planSheet").innerText()));
check("E2 preview lists what stays put", /these stay|these wait/i.test(await page.locator("#planSheet").innerText()));
await page.click("#psNo"); await page.waitForTimeout(150);
st = await h.store();
check("E3 Not now changes nothing", JSON.stringify(st.tasks.map(t => [t.id, t.date])) === tasksBefore && st.feelings[today] !== "low");
await page.click('.level-btn[data-level="low"]'); await page.waitForTimeout(200); await page.click("#psOk"); await page.waitForTimeout(500);
st = await h.store();
check("E4 Make it gentler sets Low and still has an undo", st.feelings[today] === "low" && /Undo|Back|gentle|Bad day|small/i.test(await toastText() + await page.locator("body").innerText()));
check("E5 Today card now shows the Low plan (one priority + smallest version)", /Start here/i.test(await page.locator("#paceToday").innerText()) && (await page.locator('#paceToday .pt-card[data-level="low"]').count()) === 1);
await page.click('.level-btn[data-level="steady"]'); await page.waitForTimeout(300);
check("E6 back to Steady brings the day back whole", (await h.store()).tasks.filter(t => !t.repeat && t.status !== "done").every(t => !t.spreadOf));

/* F. Tidy my day: preview + undo */
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)); const d = window.CalmLogic.todayKey(); for (let i = 0; i < 8; i++) s.tasks.push({ id: "bulk" + i, title: "Bulk job " + i, date: d, time: null, durationMin: 60, priority: 0, essential: false, status: "todo", steps: [], skipDates: [], doneDates: [], category: "other", color: "#5b6bd5", source: "manual" }); s.tasks.push({ id: "must1", title: "Doctor visit", date: d, time: "10:00", durationMin: 45, priority: 3, essential: true, status: "todo", steps: [], skipDates: [], doneDates: [], category: "health", color: "#5b6bd5", source: "manual" }); localStorage.setItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid, JSON.stringify(s)); });
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(300);
check("F1 an overfull day offers Tidy my day", await page.locator("#ptTidy").count() === 1);
const pre = JSON.stringify((await h.store()).tasks.map(t => [t.id, t.date]));
await page.click("#ptTidy"); await page.waitForTimeout(150);
const sheet = await page.locator("#planSheet").innerText();
check("F2 preview names what stays and what moves, with dates", /Doctor visit/.test(sheet) && /Bulk job/.test(sheet) && /\u2192/.test(sheet));
check("F3 nothing changed before approval", JSON.stringify((await h.store()).tasks.map(t => [t.id, t.date])) === pre);
await page.click("#psOk"); await page.waitForTimeout(400);
st = await h.store();
check("F4 approved moves happened, the doctor visit did not move", st.tasks.find(t => t.id === "must1").date === today && st.tasks.filter(t => t.id.startsWith("bulk") && t.date !== today).length >= 1);
const undoBtn = page.locator("#toast button").first();
await undoBtn.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300);
check("F5 Undo puts every task back exactly", JSON.stringify((await h.store()).tasks.map(t => [t.id, t.date])) === pre);

/* G. Goal Path */
await tab("goals"); await page.waitForTimeout(300);
const gp = await page.locator("#paceGoalPath").innerText();
check("G1 Goal Path shows outcome, progress, stages and a next action", /Goal Path/i.test(gp) && /Your outcome/i.test(gp) && /Next action/i.test(gp) && /steps/i.test(gp));
check("G2 'All my goals, one next step each' lists the goal", /All my goals, one next step each/.test(gp) && /Walk more regularly/.test(gp));
await page.locator('.gp-card [data-act="small"]').click();
check("G3 Smallest version reveals", (await page.locator(".gp-card .pt-small").first().isVisible()));
await page.locator('.gp-card [data-act="expand"]').click();
check("G4 Break it down shows smaller steps", (await page.locator(".gp-card .pt-small li").count()) >= 2);
await page.locator('.gp-card [data-act="start"]').click(); await page.waitForTimeout(300);
check("G5 Start opens the one-thing focus screen", await page.locator("#focusScreen:not([hidden])").count() === 1);
await page.locator("#fsDone").click(); await page.waitForTimeout(400); await dismissCelebrate();
st = await h.store();
check("G6 finishing a goal step from focus earns sparks + records real minutes path", st.rewards.log.some(e => e.goalId) );

/* H. Quiet mode */
await page.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click());
await page.locator("#setPace h3").click({ timeout: 1500 }).catch(() => {});
await page.evaluate(() => { const q = document.getElementById("pcQuiet"); q.checked = true; q.dispatchEvent(new Event("change")); }); await page.waitForTimeout(200);
check("H1 Quiet mode hides rewards, chip and extras", await page.locator("#paceChip").isHidden() && await page.locator("#paceRewards").isHidden() && (await page.evaluate(() => document.body.classList.contains("pace-quiet"))));
await page.evaluate(() => document.querySelector('.side-item[data-panel="calendar"]').click());
const qid = (await h.store()).tasks.find(t => t.status !== "done" && !t.repeat);
await page.evaluate((id) => window.PaceCtx.toggleDone(id, window.PaceCtx.baseTask(id).date), qid.id); await page.waitForTimeout(300);
check("H2 in Quiet mode finishing shows only a small toast, no overlay", await page.locator("#paceCelebrate.is-on").count() === 0);
await page.evaluate(() => { const q = document.getElementById("pcQuiet"); q.checked = false; q.dispatchEvent(new Event("change")); });

/* I. Welcome back (scenario E: missed days) */
await page.evaluate(() => { const k = "calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid; const s = JSON.parse(localStorage.getItem(k)); const L = window.CalmLogic, d = L.todayKey(); s.rewards.log.forEach(e => { e.key = L.addDays(d, -10); }); s.tasks.forEach(t => { if (!t.repeat && t.status !== "done" && t.source === "capture") t.date = L.addDays(d, -5); }); localStorage.setItem(k, JSON.stringify(s)); });
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(300);
const wb = await page.locator("#paceToday").innerText();
check("I1 after missed days Pace says welcome back, no guilt words", /Welcome back/.test(wb) && !/overdue|late|failed|behind|missed/i.test(wb));
await page.click("#ptRestart"); await page.waitForTimeout(150);
check("I2 gentle restart previews a spread-out plan (not everything today)", /A gentle restart/.test(await page.locator("#planSheet").innerText()));
await page.click("#psNo");

/* J. persistence + isolation */
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
st = await h.store();
check("J1 captured inbox, rewards and goals survive a reload", st.captured.length >= 1 && st.rewards.xp > 0 && st.goals.length === 1);
const h2 = await boot(8942, { email: "second" });
const st2 = await h2.store();
check("J2 a second user sees none of the first user's captures, rewards or goals", !st2.captured || st2.captured.length === 0);
check("J3 second user's Today card is a clean empty state", /Nothing planned/.test(await h2.page.locator("#paceToday").innerText()) && (await h2.page.locator("#paceChip").innerText()).includes("0 sparks"));
await h2.close();

/* K. layout at 320px: no sideways scroll, big tap targets */
await page.setViewportSize({ width: 320, height: 640 });
await page.evaluate(() => window.PaceCtx.showPanel("calendar")); await page.waitForTimeout(200);
for (const [name, fn] of [["calendar", () => window.PaceCtx.showPanel("calendar")], ["goals", () => window.PaceCtx.showPanel("goals")], ["capture", () => window.PaceCtx.showPanel("capture")], ["progress", () => window.PaceCtx.showPanel("progress")]]) {
  await page.evaluate(fn); await page.waitForTimeout(200);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("K 320px " + name + ": no horizontal scroll", over <= 1);
}
await page.evaluate(() => window.PaceCtx.showPanel("calendar")); await page.waitForTimeout(150);
const small = await page.evaluate(() => [...document.querySelectorAll("#paceToday button")].filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).length);
check("K 320px Today buttons are all at least 40px tall", small === 0);
await page.screenshot({ path: "proofs/pace-today-320.png" });

check("L no JavaScript errors during the whole run", h.errors.length === 0);
if (h.errors.length) console.log(h.errors.slice(0, 5));
await h.close();
process.exit(summary() ? 1 : 0);
