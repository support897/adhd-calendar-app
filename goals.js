/* Pace Calendar: goals planner + habit streak maths. Pure functions (no DOM),
   so node can test them. Research notes live in pace-notes.md:
   - decide the plan ONCE, in a calm moment (planning backwards from the date)
   - one small, concrete step per day, with a 5-minute "smallest version"
   - progress bar = steps done (goal-gradient: closer feels better)
   - forgiving streaks: one missed day never resets (Lally 2010), two in a row does */
(function (root) {
"use strict";
var L = root.CalmLogic || (typeof require !== "undefined" ? require("./logic.js") : null);

function addDays(k, n) { return L.addDays(k, n); }
function diffDays(a, b) { // b - a in whole days
  var pa = a.split("-"), pb = b.split("-");
  return Math.round((Date.UTC(+pb[0], pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], pa[1] - 1, +pa[2])) / 86400000);
}
function weekdayOf(k) { var p = k.split("-"); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])).getUTCDay(); } // 0=Sun

/* ---------- goal categories ---------- */
var GOAL_CATEGORIES = [
  { id: "personal", label: "Personal", color: "#8E7CC3", emoji: "🌱" },
  { id: "school",   label: "School",   color: "#5B6BD5", emoji: "🎓" },
  { id: "work",     label: "Work",     color: "#3F536E", emoji: "💼" },
  { id: "health",   label: "Health",   color: "#E85D75", emoji: "❤️" },
  { id: "money",    label: "Money",    color: "#C9920E", emoji: "💰" },
  { id: "home",     label: "Home",     color: "#35704E", emoji: "🏠" },
  { id: "other",    label: "Other",    color: "#7A8699", emoji: "🎯" }
];
function goalCategory(id) { return GOAL_CATEGORIES.filter(function (c) { return c.id === id; })[0] || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1]; }

var TEMPLATES = {
  school: ["Get clear on what is due and when", "Gather your notes, readings and materials", "Learn the first part", "Learn the middle part", "Learn the last part", "Practise and test yourself", "Review the hard parts", "Final check and hand in"],
  work: ["Write down what done looks like", "Gather what you need", "Do the first part", "Do the middle part", "Do the last part", "Check it and fix gaps", "Finish and share"],
  health: ["Decide what done looks like and why it matters", "Set up what you need", "Start small: the first routine", "Build up gently", "Keep going: the middle stretch", "Check how it is going and adjust", "Reach it and look back"],
  money: ["Write down the exact number and date", "Gather your numbers", "Make the first move", "Keep going: the middle stretch", "Check the numbers and adjust", "Finish the last part", "Look back and celebrate"],
  home: ["Walk round and list what needs doing", "Gather what you need", "Do the first area", "Do the next area", "Do the last area", "Final tidy and check"],
  personal: ["Decide what done looks like", "Set up what you need", "Do the first part", "Keep going: the middle part", "Check how it is going and adjust", "Finish the last part", "Look back and celebrate"],
  other: ["Decide what done looks like", "Set up what you need", "Do the first part", "Keep going: the middle part", "Check how it is going and adjust", "Finish the last part", "Look back and celebrate"]
};

/* Small, different actions so a long stage never feels like the same chore every day. */
var ROTATE = ["Learn one small chunk: ", "Write 5 key points: ", "Say it back without notes: ", "Try 5 practice questions: ", "Fix the shaky bits: ", "Do one more small piece: "];

/* Milestones: the user's own lines if they pasted a list/outline, else a calm template. */
function parseMilestones(text, category) {
  var lines = String(text || "").split(/\r\n|\n|\r/).map(function (l) {
    return l.replace(/^\s*(?:[-*•\u2022]|\d{1,2}[.)]|week\s*\d+\s*[:\-]?)\s*/i, "").trim();
  }).filter(function (l) { return l.length >= 3; });
  lines = lines.map(function (l) { return l.length > 90 ? l.slice(0, 87).replace(/\s+\S*$/, "") + "…" : l; });
  if (lines.length >= 3) return lines.slice(0, 16);
  return (TEMPLATES[category] || TEMPLATES.other).slice();
}

/* Which days are plan days. pace: "daily" | "weekdays" | "three" (Mon/Wed/Fri) */
function planDays(startKey, endKey, pace) {
  var out = [], span = diffDays(startKey, endKey);
  if (span < 0) return out;
  for (var i = 0; i <= Math.min(span, 400); i++) {
    var k = addDays(startKey, i), wd = weekdayOf(k);
    if (pace === "weekdays" && (wd === 0 || wd === 6)) continue;
    if (pace === "three" && wd !== 1 && wd !== 3 && wd !== 5) continue;
    out.push(k);
  }
  return out;
}

/* The plan: ONE small step per plan day. The last 10% of days are kept as a
   buffer (no step) so a slip never means failure; each 7th step is a short review. */
function buildPlan(opts) {
  var title = String(opts.title || "").trim();
  var mins = Math.max(5, Math.min(90, +opts.mins || 20));
  var days = planDays(opts.start, opts.end, opts.pace || "daily");
  if (!days.length) return [];
  var buffer = days.length >= 10 ? Math.floor(days.length * 0.1) : 0;
  var work = days.slice(0, days.length - buffer);
  var ms = (opts.milestones && opts.milestones.length ? opts.milestones : parseMilestones("", opts.category));
  var steps = [], i;
  // spread milestones evenly across the working days
  var perM = Math.max(1, Math.floor(work.length / ms.length));
  var plan = [];
  for (i = 0; i < work.length; i++) plan.push({ m: Math.min(ms.length - 1, Math.floor(i / perM)), idx: 0, total: 0 });
  var counts = {}; plan.forEach(function (p) { counts[p.m] = (counts[p.m] || 0) + 1; });
  var seen = {}; plan.forEach(function (p) { seen[p.m] = (seen[p.m] || 0) + 1; p.idx = seen[p.m]; p.total = counts[p.m]; });
  for (i = 0; i < work.length; i++) {
    var p = plan[i], m = ms[p.m], last = i === work.length - 1, review = !last && (i + 1) % 7 === 0;
    var text;
    if (last) text = "Finish: " + title + " (final look, then celebrate)";
    else if (review) text = "Review: look at how far you have come on " + title;
    else if (p.total === 1) text = m;
    else if (p.idx === 1) text = "Start: " + m;
    else if (p.idx === p.total) text = "Finish this part: " + m;
    else text = ROTATE[(p.idx - 2) % ROTATE.length] + m;
    steps.push({
      date: work[i], title: text.length > 120 ? text.slice(0, 117) + "…" : text, durationMin: mins,
      minVersion: "Just 5 minutes: open it and do the first small bit of this."
    });
  }
  return steps;
}

/* Progress for one goal from the tasks tied to it (goalId). */
function goalProgress(goal, tasks, today) {
  var mine = (tasks || []).filter(function (t) { return t && t.goalId === goal.id; });
  var done = mine.filter(function (t) { return t.status === "done"; });
  var dueByNow = mine.filter(function (t) { return t.date <= today; });
  var behind = mine.filter(function (t) { return t.date < today && t.status !== "done"; });
  var days = {}; done.forEach(function (t) { days[t.doneOn || t.date] = true; });
  var next = mine.filter(function (t) { return t.status !== "done" && t.date >= today; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })[0] || null;
  var total = mine.length;
  var pct = total ? Math.round(done.length * 100 / total) : 0;
  var state = total && done.length === total ? "complete" : behind.length >= 3 ? "behind" : behind.length ? "slightly" : "on-track";
  return { total: total, done: done.length, pct: pct, dueByNow: dueByNow.length, behind: behind.length, activeDays: Object.keys(days).length, next: next, daysLeft: goal.end ? Math.max(0, diffDays(today, goal.end)) : null, state: state };
}

/* Move every unfinished step that is overdue (and the future ones) onto the remaining plan days. */
function replan(goal, tasks, today) {
  var open = (tasks || []).filter(function (t) { return t.goalId === goal.id && t.status !== "done"; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  if (!open.length) return { moved: 0, failed: false };
  var start = today > goal.start ? today : goal.start;
  var days = planDays(start, goal.end, goal.pace || "daily");
  if (!days.length) days = [today]; // past the end date: put them on from today, one a day
  var k = 0, moved = 0;
  open.forEach(function (t, i) {
    var d = days[i] || addDays(days[days.length - 1], i - days.length + 1);
    if (t.date !== d) { t.date = d; moved++; }
  });
  return { moved: moved, failed: open.length > days.length };
}

/* ---------- habits: forgiving streaks ---------- */
function weekDays(today) { // Monday first, current week
  var wd = weekdayOf(today), back = (wd + 6) % 7, names = ["M", "T", "W", "T", "F", "S", "S"], full = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], out = [];
  for (var i = 0; i < 7; i++) { var k = addDays(today, i - back); out.push({ key: k, label: names[i], name: full[i], future: k > today, today: k === today }); }
  return out;
}
function habitStats(days, today) {
  days = days || {};
  var keys = Object.keys(days).filter(function (k) { return days[k] && k <= today; }).sort();
  var total = keys.length;
  // current run: count done days walking back; a run ends after TWO missed days in a row
  var cur = 0, misses = 0, k = days[today] ? today : addDays(today, -1), guard = 0;
  var strict = 0, ks = k;
  while (days[ks]) { strict++; ks = addDays(ks, -1); }
  while (guard++ < 800) {
    if (days[k]) { cur++; misses = 0; } else { misses++; if (misses >= 2) break; }
    k = addDays(k, -1);
    if (keys.length && k < keys[0]) break;
    if (!keys.length) break;
  }
  var best = 0, run = 0;
  keys.forEach(function (key, i) {
    if (i && diffDays(keys[i - 1], key) <= 2) run++; else run = 1;
    if (run > best) best = run;
  });
  if (cur > best) best = cur;
  var wk = weekDays(today), weekDone = wk.filter(function (d) { return days[d.key]; }).length;
  var yDone = !!days[addDays(today, -1)], tDone = !!days[today], d2 = !!days[addDays(today, -2)];
  return { current: cur, strict: strict, best: best, total: total, weekDone: weekDone, doneToday: tDone,
    missedYesterday: !yDone && !tDone && d2 && total > 0, lapsed: !tDone && !yDone && !d2 && total > 0 };
}
/* Kind words, each tied to the research (see "Why this works" in the app). */
function habitMessage(s) {
  if (!s.total) return "Start tiny. The first few repeats build the most.";
  if (s.missedYesterday) return "One missed day barely matters. Never miss twice: do your smallest version today.";
  if (s.lapsed) return "Welcome back. A slip does not erase what you built. Do the smallest version to restart.";
  var c = s.current;
  if (c >= 66) return c + " days. Past the 66-day average for a habit to feel automatic.";
  if (c >= 30) return c + " days. This is turning into who you are.";
  if (c >= 21) return c + " days. Three weeks of showing up.";
  if (c >= 14) return c + " days. Two weeks. The hard bit is behind you.";
  if (c >= 7) return "A full week. Early repeats build the most automatic feeling.";
  if (c >= 3) return c + " days in. Keep it easy, keep it going.";
  if (s.doneToday) return "Done today. That counts.";
  return "One tick today keeps it going.";
}

var api = { GOAL_CATEGORIES: GOAL_CATEGORIES, goalCategory: goalCategory, parseMilestones: parseMilestones, planDays: planDays, buildPlan: buildPlan,
  goalProgress: goalProgress, replan: replan, weekDays: weekDays, habitStats: habitStats, habitMessage: habitMessage, diffDays: diffDays };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.PaceGoals = api;
})(typeof window !== "undefined" ? window : globalThis);
