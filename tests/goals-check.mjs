// Goals planner + forgiving habit streaks. Run: node tests/goals-check.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
globalThis.window = { t: (s) => s };
const L = require("../logic.js");
globalThis.CalmLogic = L;
const G = require("../goals.js");
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n); } };

// --- milestones
check("pasted list becomes milestones", G.parseMilestones("1. Read ch 1\n2) Read ch 2\n- Essay outline\n* Draft essay", "school").join("|") === "Read ch 1|Read ch 2|Essay outline|Draft essay");
check("single sentence falls back to template", G.parseMilestones("Pass my exam", "school").length >= 6);
check("long line is trimmed", G.parseMilestones("a".repeat(200) + "\nsecond line ok\nthird line ok", "other")[0].length <= 91);

// --- plan
const plan = G.buildPlan({ title: "Pass exam", category: "school", start: "2026-10-28", end: "2026-12-12", pace: "daily", mins: 20, milestones: G.parseMilestones("", "school") });
check("one step per working day (46 days minus 10% buffer)", plan.length === 42);
check("no two steps on the same day", new Set(plan.map(s => s.date)).size === plan.length);
check("steps start today and end before the deadline", plan[0].date === "2026-10-28" && plan[plan.length - 1].date < "2026-12-12");
check("buffer days at the end are empty", G.diffDays(plan[plan.length - 1].date, "2026-12-12") >= 4);
check("last step is the finish step", /^Finish:/.test(plan[plan.length - 1].title));
check("every 7th step is a review", /^Review:/.test(plan[6].title));
check("steps inside one stage are not all identical", new Set(plan.slice(0, 12).map(s => s.title)).size >= 6);
check("every step is small and has a smallest version", plan.every(s => s.durationMin === 20 && /5 minutes/.test(s.minVersion)));
const wk = G.buildPlan({ title: "x", category: "work", start: "2026-10-28", end: "2026-11-27", pace: "weekdays", mins: 15 });
check("weekday pace skips weekends", wk.every(s => { const d = new Date(s.date + "T00:00:00Z").getUTCDay(); return d !== 0 && d !== 6; }));
const th = G.buildPlan({ title: "x", category: "work", start: "2026-10-28", end: "2026-11-27", pace: "three", mins: 15 });
check("three-a-week pace is Mon/Wed/Fri", th.every(s => [1, 3, 5].includes(new Date(s.date + "T00:00:00Z").getUTCDay())));
check("short goal (3 days) has no buffer and still plans", G.buildPlan({ title: "x", category: "other", start: "2026-10-28", end: "2026-10-30", pace: "daily", mins: 20 }).length === 3);
check("end before start gives no steps", G.buildPlan({ title: "x", category: "other", start: "2026-10-30", end: "2026-10-28", pace: "daily" }).length === 0);
check("own milestones appear in the steps", G.buildPlan({ title: "Thesis", category: "school", start: "2026-10-28", end: "2026-12-28", pace: "daily", milestones: ["Read papers", "Write intro", "Write methods"] }).some(s => /Read papers/.test(s.title)));

// --- progress
const goal = { id: "g1", start: "2026-10-28", end: "2026-11-10", pace: "daily" };
const tasks = [
  { id: "a", goalId: "g1", date: "2026-10-28", status: "done" },
  { id: "b", goalId: "g1", date: "2026-10-29", status: "done" },
  { id: "c", goalId: "g1", date: "2026-10-30", status: "todo" },
  { id: "d", goalId: "g1", date: "2026-11-02", status: "todo" },
  { id: "x", goalId: "other", date: "2026-10-28", status: "done" }
];
let p = G.goalProgress(goal, tasks, "2026-10-30");
check("progress counts only this goal's tasks", p.total === 4 && p.done === 2 && p.pct === 50);
check("next step is the soonest open one", p.next && p.next.id === "c");
check("one overdue step is 'slightly' behind, not scary", p.state === "on-track" || p.state === "slightly");
p = G.goalProgress(goal, tasks, "2026-11-03");
check("two overdue steps are tracked", p.behind === 2);
check("empty goal has no division error", G.goalProgress({ id: "z" }, [], "2026-10-30").pct === 0);
const done = G.goalProgress(goal, tasks.map(t => ({ ...t, status: "done" })), "2026-11-03");
check("all done = complete", done.state === "complete" && done.pct === 100);
const r = G.replan(goal, tasks, "2026-11-03");
check("replan moves open steps to today or later", tasks.filter(t => t.goalId === "g1" && t.status !== "done").every(t => t.date >= "2026-11-03") && r.moved === 2);
check("replan never moves done steps", tasks[0].date === "2026-10-28");

// --- week + streaks
const w = G.weekDays("2026-10-28"); // Wednesday
check("week starts Monday", w[0].name === "Mon" && w[0].key === "2026-10-26" && w[6].key === "2026-11-01");
check("today marked, later days are future", w[2].today && w[3].future && !w[1].future);
const day = (...ks) => Object.fromEntries(ks.map(k => [k, true]));
let s = G.habitStats(day("2026-10-26", "2026-10-27", "2026-10-28"), "2026-10-28");
check("3 days in a row = streak 3", s.current === 3 && s.strict === 3 && s.weekDone === 3);
s = G.habitStats(day("2026-10-26", "2026-10-27"), "2026-10-28");
check("today not ticked yet keeps the streak alive", s.current === 2 && !s.doneToday);
s = G.habitStats(day("2026-10-24", "2026-10-25", "2026-10-27"), "2026-10-28");
check("ONE missed day does not reset (26th)", s.current === 3 && s.strict === 1);
s = G.habitStats(day("2026-10-20", "2026-10-21", "2026-10-22"), "2026-10-28");
check("two missed days in a row resets the run", s.current === 0 && s.lapsed);
check("lapsed message is kind", /Welcome back/.test(G.habitMessage(s)));
s = G.habitStats(day("2026-10-25", "2026-10-26"), "2026-10-28");
check("missed yesterday triggers 'never miss twice'", s.missedYesterday && /Never miss twice/.test(G.habitMessage(s)));
s = G.habitStats(day("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"), "2026-10-28");
check("best streak survives one-day gaps (7 done days)", s.best === 7);
check("empty habit has gentle start message", /Start tiny/.test(G.habitMessage(G.habitStats({}, "2026-10-28"))));
check("future ticks are ignored", G.habitStats(day("2026-10-29"), "2026-10-28").total === 0);
const longRun = {}; for (let i = 0; i < 70; i++) longRun[L.addDays("2026-10-28", -i)] = true;
check("66-day milestone message", /66-day average/.test(G.habitMessage(G.habitStats(longRun, "2026-10-28"))));
// --- the analyzer (build 33): steps come from the goal's own work
check("analyzer reads chapters", (G.analyzeWork("Read 12 chapters of my textbook") || {}).unit === "chapter");
check("analyzer reads words with commas", (G.analyzeWork("Write my 3,000-word essay") || {}).total === 3000);
check("analyzer reads money", (G.analyzeWork("Save $600 for the bond") || {}).kind === "money");
check("analyzer reads a title list", (G.analyzeList("Clean the kitchen, bathroom and garage") || { items: [] }).items.length === 3);
check("analyzer leaves plain titles alone", G.analyzeWork("Pass my exam") === null && G.analyzeList("Pass my exam") === null);
const ch = G.buildPlan({ title: "Read 12 chapters of my textbook", category: "school", start: "2026-10-29", end: "2026-11-26", pace: "daily", mins: 20 });
check("chapter plan carries its analysis", !!ch.analysis && ch.analysis.kind === "count" && ch.analysis.total === 12);
check("chapter steps name the real chapters", ch[0].title === "Read chapter 1" && ch.some(s => /chapter 12/.test(s.title) || /^Finish:/.test(s.title)));
check("chapter steps are sized from the work (a chapter ~25 min)", ch[0].durationMin === 25);
check("chapter plan groups by week", ch.analysis.weeks.length >= 2 && /chapters 1/.test(ch.analysis.weeks[0].text));
check("chapter plan finishes before the deadline", ch[ch.length - 1].date < "2026-11-26");
const wd = G.buildPlan({ title: "Write my 3,000-word essay", category: "school", start: "2026-10-29", end: "2026-11-19", pace: "daily", mins: 20 });
check("word plan steps say words, not ranges", /Write \d+ words/.test(wd[0].title) && wd.every(s => !/words \d/.test(s.title)));
check("word plan covers the whole count", wd.reduce((a, s) => a + (s.chunk ? s.chunk.to - s.chunk.from + 1 : 0), 0) === 3000 || wd.length >= 15);
const sv = G.buildPlan({ title: "Save $600 for the bond", category: "money", start: "2026-10-29", end: "2026-11-28", pace: "daily", mins: 20 });
check("money plan steps carry running totals", /Put \$\d+ aside \(\$\d+ of \$600\)/.test(sv[0].title) || /^Finish:/.test(sv[0].title));
check("money plan reaches the full amount", sv.some(s => /of \$600\)/.test(s.title) && /\$600 of/.test(s.title)) || /Finish:/.test(sv[sv.length - 1].title));
const li = G.buildPlan({ title: "Clean the kitchen, bathroom and garage", category: "home", start: "2026-10-29", end: "2026-11-12", pace: "daily", mins: 20 });
check("list plan works through the real rooms", li.some(s => /Kitchen/.test(s.title)) && li.some(s => /Garage/.test(s.title)));
check("list plan uses home words, not school words", li.every(s => !/practice questions/i.test(s.title)));
const tight = G.buildPlan({ title: "Read 40 chapters", category: "school", start: "2026-10-29", end: "2026-11-08", pace: "daily", mins: 20 });
check("an impossible pace is flagged tight, not hidden", !!tight.analysis && tight.analysis.tight === true);
const moneyTpl = G.buildPlan({ title: "Get the bond sorted", category: "money", start: "2026-10-29", end: "2026-12-10", pace: "daily", mins: 20 });
check("money fallback never gets school verbs", moneyTpl.every(s => !/practice questions/i.test(s.title)));

console.log("RESULT pass=" + pass + " fail=" + fail);
if (fail) process.exitCode = 1;
