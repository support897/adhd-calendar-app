// Pace flows: Skip's tour, voice success + failure, never-silent transcripts, multi-goal balance, gentle language.
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8961); const { page } = h;
/* fake browser speech engine so voice can be tested without a microphone */
await page.addInitScript(() => {
  window.__voice = { mode: "ok", text: "call the plumber tomorrow at 3pm and buy milk" };
  function FakeSR() { this.continuous = false; this.interimResults = false; }
  FakeSR.prototype.start = function () { var me = this; setTimeout(function () { var v = window.__voice;
    if (v.mode === "ok") { me.onresult && me.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: v.text }], { isFinal: true })] }); me.onend && me.onend(); }
    else { me.onerror && me.onerror({ error: v.mode }); me.onend && me.onend(); } }, 50); };
  FakeSR.prototype.stop = function () { this.onend && this.onend(); }; FakeSR.prototype.abort = FakeSR.prototype.stop;
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
});
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 1500 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 1500 }).catch(() => {});
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(150); };

/* Voice: success never creates tasks silently */
await tab("capture");
await page.evaluate(() => { window.__voice.mode = "ok"; });
await page.click("#voiceBtn"); await page.waitForTimeout(400);
const typed = await page.inputValue("#dumpText");
check("V1 voice transcript lands in the editable box", /plumber/.test(typed));
check("V2 Pace says it is ready to review (not created)", /Ready to review/.test(await page.locator("#captureMsg").innerText()));
check("V3 nothing was created from voice by itself", (await h.store()).tasks.length === 0);
await page.fill("#dumpText", typed.replace("plumber", "electrician"));
await page.click("#parseBtn"); await page.waitForTimeout(250);
check("V4 the edited transcript is what gets understood", /electrician/i.test(await page.locator("#paceReview .pr-title").first().inputValue()) && (await page.locator("#paceReview .pr-card").count()) >= 2);
await page.click("#prClear");
/* Voice failures keep the user's words and speak plainly */
const failCases = [["no-speech", /couldn't hear anything/i], ["not-allowed", /microphone permission is off/i], ["network", /isn't available right now/i], ["audio-capture", /No microphone/i]];
for (const [mode, re] of failCases) {
  await page.fill("#dumpText", "my careful notes"); 
  await page.evaluate((m) => { window.__voice.mode = m; }, mode);
  await page.click("#voiceBtn"); await page.waitForTimeout(350);
  const msg = await page.locator("#captureMsg").innerText();
  check("V5 voice error '" + mode + "': plain words and no generic scare", re.test(msg) && !/error|failed|crash/i.test(msg));
  check("V5b voice error '" + mode + "': the typed words are still there", (await page.inputValue("#dumpText")).includes("my careful notes"));
}
check("V6 no task was created by any voice failure", (await h.store()).tasks.length === 0);
await page.fill("#dumpText", ""); 

/* Skip's tour: replay and walk it */
await page.evaluate(() => { document.querySelector('.side-item[data-panel="settings"]').click(); });
await page.locator("#pcReplay").scrollIntoViewIfNeeded().catch(() => {});
await page.evaluate(() => document.getElementById("pcReplay").click()); await page.waitForTimeout(300);
const bubbles = []; let guard = 0, sawTry = false, sawFirst = false, sawDemo = false;
while (guard++ < 40) {
  const vis = await page.locator("#guideSheet:not([hidden])").count(); if (!vis) break;
  const b = await page.locator("#guideBubble").innerText(); bubbles.push(b);
  if (await page.locator("#guideTry").count()) sawTry = true;
  if (await page.locator(".guide-first").count()) { sawFirst = true; break; }
  if (await page.locator(".guide-demo").count()) sawDemo = true;
  const nm = page.locator("#tourName"); if (await nm.count()) await nm.fill("Tester");
  await page.click("#guideNext"); await page.waitForTimeout(120);
}
check("T1 tour explains Low/Steady/Full with a demo", sawDemo && bubbles.some(b => /Low keeps only what matters/.test(b)));
check("T2 tour has a Try it for Talk to it", sawTry && bubbles.some(b => /Talk to it\. Tell it/.test(b)));
check("T3 tour ends by asking what to work on first, with 4 choices", sawFirst && (await page.locator(".guide-first button").count()) === 4 && /What would you like to work on first/.test(bubbles[bubbles.length - 1]));
check("T4 tour mentions Skip in the first step", bubbles.some(b => /Skip|Ahoy|calendar starts empty/i.test(b)));
await page.locator('[data-first="goal"]').click(); await page.waitForTimeout(300);
check("T5 'Create a goal' takes you to Goals with the form open", await page.locator("#panel-goals.is-active").count() === 1);
/* Try it demo */
await page.evaluate(() => document.getElementById("guideAgain").click()); await page.waitForTimeout(200);
guard = 0; while (guard++ < 40 && !(await page.locator("#guideTry").count())) { if (!(await page.locator("#guideSheet:not([hidden])").count())) break; const nm = page.locator("#tourName"); if (await nm.count()) await nm.fill("Tester"); await page.click("#guideNext"); await page.waitForTimeout(100); }
await page.click("#guideTry"); await page.waitForTimeout(400);
check("T6 Try it opens Pace's own review (not an outside site)", (await page.locator("#paceReview .pr-card").count()) >= 2 && page.url().startsWith("http://localhost"));
check("T7 the demo created nothing until you say so", (await h.store()).tasks.length === 0);
await page.click("#prClear");

/* Multi-goal: balanced pick prefers the neglected one */
await page.evaluate(() => { const u = JSON.parse(localStorage.getItem("pace-auth-v1")).uid, k = "calmcal-v1:" + u, s = JSON.parse(localStorage.getItem(k)); const L = window.CalmLogic, d = L.todayKey();
  s.goals = [{ id: "ga", title: "Launch my podcast", category: "work", start: d, end: L.addDays(d, 30) }, { id: "gb", title: "Walk more", category: "health", start: d, end: L.addDays(d, 30) }, { id: "gc", title: "Learn Spanish", category: "school", start: d, end: L.addDays(d, 30) }];
  ["ga", "gb", "gc"].forEach((g, i) => { for (let n = 0; n < 4; n++) s.tasks.push({ id: g + n, title: g + " step " + n, date: L.addDays(d, n), durationMin: 20, status: n === 0 && i < 2 ? "done" : "todo", goalId: g, steps: [], skipDates: [], doneDates: [], category: "other", color: "#5b6bd5", source: "goal", minVersion: "Just 5 minutes: " + g }); });
  s.rewards = { xp: 20, log: [{ id: "ga0@" + d, taskId: "ga0", key: d, xp: 10, goalId: "ga" }, { id: "gb0@" + d, taskId: "gb0", key: d, xp: 10, goalId: "gb" }], badges: {}, captured: 0, rest: {} };
  localStorage.setItem(k, JSON.stringify(s)); });
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
await tab("goals"); await page.waitForTimeout(300);
const gtxt = await page.locator("#paceGoalPath").innerText();
check("M1 three goals each get a card with their own next action", (await page.locator(".gp-card").count()) === 3 && (await page.locator(".gp-row").count()) === 3);
check("M2 balanced pick suggests the goal with no wins this week", /Balanced pick today: Learn Spanish/.test(gtxt));
check("M3 neglected goal gets a kind, guilt-free note", /No step this week\. That is okay/.test(gtxt) && !/behind|overdue|failed|late/i.test(gtxt));
check("M4 each goal shows progress + remaining time + deadline", (gtxt.match(/Deadline/gi) || []).length >= 3 && /About/.test(gtxt));

/* Whole-app language scan: no guilt words in the new UI text */
const all = await page.evaluate(() => [...document.querySelectorAll("#paceToday, #paceGoalPath, #paceRewards, #paceCaptured")].map(e => e.textContent).join(" "));
check("N1 no guilt/shame words in Today, Goal Path, Rewards, Captured", !/\b(overdue|failed|lazy|behind schedule|you missed|you failed|shame|guilt)\b/i.test(all));
check("N2 zero JS errors in flows", h.errors.length === 0);
if (h.errors.length) console.log(h.errors.slice(0, 4));
await h.close(); process.exit(summary() ? 1 : 0);
